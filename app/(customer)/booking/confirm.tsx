import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '../../../components/ui/AppButton';
import { ArrowLeft, MapPin, Clock, CreditCard, StickyNote, ChevronRight, Wallet, Bike, Car, Truck, Phone, MessageCircle, Star, PawPrint, User } from 'lucide-react-native';
import { MOCK_RIDE_OPTIONS } from '../../../utils/mockData';
import { useBookingStore } from '../../../store/useBookingStore';
import { api, DriverLocation } from '../../../services/api';
import { hereMapApi, LatLng, HereRoute } from '../../../services/hereMapApi';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { Dimensions, Animated, PanResponder, Image } from 'react-native';
import { orderService } from '../../../services/orderService';
import { useAuthStore } from '../../../store/useAuthStore';
import { Order } from '../../../types/order';
import * as Location from 'expo-location';
import { formatPrice } from '../../../utils/format';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const HERE_MAPS_API_KEY = process.env.EXPO_PUBLIC_HERE_MAPS_API_KEY || "";

// Extend MOCK_RIDE_OPTIONS to match VEHICLE_TYPES expectation (surcharge)
// Extend MOCK_RIDE_OPTIONS to match VEHICLE_TYPES expectation (surcharge)
// Initial state will be empty, fetched from API
const INITIAL_VEHICLES: any[] = [];

export default function ConfirmBookingScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const petWeight = params.petWeight ? Number(params.petWeight) : 0;
    // const petName = params.petName as string; // Legacy single pet
    // const petType = params.petType as string; // Legacy single pet
    const passengers = params.passengers ? Number(params.passengers) : 1;

    // Parse pet names if passed as a comma-separated string or array
    const petNamesRaw = params.petNames;
    const displayPetNames = petNamesRaw
        ? (Array.isArray(petNamesRaw) ? petNamesRaw.join(', ') : petNamesRaw)
        : 'Unknown Pet';

    const mapRef = useRef<MapView>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [note, setNote] = useState('');
    const { pickupLocation, dropoffLocation, clearBooking } = useBookingStore();
    const [distance, setDistance] = useState(0);
    // Force HERE Maps on confirm page
    const mapProvider: string = 'here';
    const [duration, setDuration] = useState(0);
    const [price, setPrice] = useState(0);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [hereRoutes, setHereRoutes] = useState<HereRoute[]>([]);
    const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
    const [weightSurcharge, setWeightSurcharge] = useState(0);
    const [surgeMultiplier, setSurgeMultiplier] = useState(1);
    const [surgeReasons, setSurgeReasons] = useState<string[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'promptpay' | 'wallet' | 'stripe'>('cash');
    const [walletBalance, setWalletBalance] = useState(0);

    // Booking State
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'searching' | 'confirmed'>('idle');
    const bookingStatusRef = useRef(bookingStatus);

    // Sync Ref with State
    useEffect(() => {
        bookingStatusRef.current = bookingStatus;
    }, [bookingStatus]);

    const [assignedDriver, setAssignedDriver] = useState<DriverLocation | null>(null);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const shareLocationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevStatusRef = useRef<Order['status'] | null>(null);
    const { user } = useAuthStore();

    // Animation for Bottom Sheet
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const SNAP_TOP = SCREEN_HEIGHT * 0.45;
    const SNAP_BOTTOM = SCREEN_HEIGHT - 120;
    const SNAP_DRIVER = SCREEN_HEIGHT - 320; // Height for Driver Found card (approx 320px)

    const panY = useRef(new Animated.Value(SNAP_TOP)).current;

    // Auto-snap when booking confirmed
    React.useEffect(() => {
        if (bookingStatus === 'confirmed') {
            Animated.spring(panY, {
                toValue: SNAP_DRIVER,
                useNativeDriver: false,
                tension: 50,
                friction: 10
            }).start();
        }
    }, [bookingStatus]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                panY.extractOffset();
            },
            onPanResponderMove: (_, gestureState) => {
                panY.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                panY.flattenOffset();

                // Determine direction and velocity to snap
                if (gestureState.dy > 50 || (gestureState.dy > 0 && gestureState.vy > 0.5)) {
                    // Slide Down
                    Animated.spring(panY, {
                        toValue: bookingStatus === 'confirmed' ? SNAP_DRIVER : SNAP_BOTTOM, // Snap to appropriate bottom
                        useNativeDriver: false,
                        tension: 50,
                        friction: 10
                    }).start();
                } else if (gestureState.dy < -50 || (gestureState.dy < 0 && gestureState.vy < -0.5)) {
                    // Slide Up
                    Animated.spring(panY, {
                        toValue: SNAP_TOP,
                        useNativeDriver: false,
                        tension: 50,
                        friction: 10
                    }).start();
                } else {
                    // Return to nearest
                    // Simple toggle logic based on direction for robustness
                    const targetBottom = bookingStatus === 'confirmed' ? SNAP_DRIVER : SNAP_BOTTOM;
                    Animated.spring(panY, {
                        toValue: gestureState.dy > 0 ? targetBottom : SNAP_TOP,
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    // Fetch Driver Locations
    React.useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const drivers = await api.getDriverLocations();
                setDriverLocations(drivers);
            } catch (error) {
                console.log("Error fetching drivers", error);
            }
        };

        fetchDrivers();
        // Poll every 5 seconds for better real-time updates
        const interval = setInterval(fetchDrivers, 5000);

        // Fetch wallet balance
        const fetchBalance = async () => {
            try {
                const res = await api.getWalletBalance();
                setWalletBalance(res.wallet_balance || 0);
            } catch (error) {
                console.log("Error fetching wallet balance", error);
            }
        };
        fetchBalance();

        return () => clearInterval(interval);
    }, []);

    const driverLocationsRef = useRef(driverLocations);

    // Sync Ref with State and Sync Assigned Driver with Live Locations
    React.useEffect(() => {
        driverLocationsRef.current = driverLocations;

        if (bookingStatus === 'confirmed' && currentOrder?.driver_id) {
            const liveDriver = driverLocations.find(d => d.driver?.id === currentOrder.driver_id);
            if (liveDriver) {
                // If we don't have an assigned driver yet, OR if the location changed
                if (!assignedDriver || liveDriver.lat !== assignedDriver.lat || liveDriver.lng !== assignedDriver.lng) {
                    console.log("Syncing assigned driver location:", liveDriver.lat, liveDriver.lng);
                    setAssignedDriver(liveDriver);
                }
            }
        }
    }, [driverLocations, bookingStatus, assignedDriver, currentOrder]);

    // Fetch Vehicle Types
    React.useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const apiVehicles = await api.getVehicleTypes();
                // Merge with mock data to get images and descriptions
                const mergedVehicles = apiVehicles.map(v => {
                    const mock = MOCK_RIDE_OPTIONS.find(m => m.id === v.key);
                    return {
                        id: v.key,
                        name: v.name,
                        image: mock?.image || 'car', // Fallback
                        description: mock?.description || '',
                        basePrice: v.rates.base,
                        perKmRate: v.rates.per_km,
                        perMinRate: v.rates.per_min,
                        minPrice: v.rates.min,
                        surcharge: 0
                    };
                });
                setVehicles(mergedVehicles);
                if (mergedVehicles.length > 0) {
                    setSelectedVehicle(mergedVehicles[0]);
                }
            } catch (error) {
                console.warn("Could not fetch vehicles from backend, using mock data:", error);
                // Fallback to mock data when backend is unavailable
                setVehicles(MOCK_RIDE_OPTIONS);
                if (MOCK_RIDE_OPTIONS.length > 0) {
                    setSelectedVehicle(MOCK_RIDE_OPTIONS[0]);
                }
            } finally {
                setLoadingVehicles(false);
            }
        };

        fetchVehicles();
    }, []);

    // Fetch Price from API
    React.useEffect(() => {
        const fetchPrice = async () => {
            if (!pickupLocation || !dropoffLocation || !selectedVehicle) return;
            // console.log("Fetching price for:", {
            //     pickupLocation,
            //     dropoffLocation,
            //     selectedVehicle,
            //     mapProvider
            // });

            setLoadingPrice(true);
            try {
                const response = await api.estimatePrice({
                    pickup_lat: pickupLocation.latitude,
                    pickup_lng: pickupLocation.longitude,
                    dropoff_lat: dropoffLocation.latitude,
                    dropoff_lng: dropoffLocation.longitude,
                    pet_weight_kg: petWeight,
                    vehicle_type: selectedVehicle.id,
                    provider: mapProvider
                });
                setPrice(response.estimated_price);
                setWeightSurcharge(response.weight_surcharge || 0);
                setSurgeMultiplier(response.surge_multiplier || 1);
                setSurgeReasons(response.surge_reasons || []);
                // Use backend distance/duration if available (fallback for Google Maps failure)
                if (response.distance_km) setDistance(response.distance_km);
                if (response.duration_min) setDuration(response.duration_min);
                // console.log("Fetched price:", response.estimated_price);
                // console.log("weight:", petWeight);
            } catch (error) {
                console.warn("Could not fetch price from backend, using local calculation:", error);
                // Fallback: Local Calculation
                if (selectedVehicle && selectedVehicle.basePrice !== undefined && selectedVehicle.perKmRate !== undefined) {
                    // Local weight surcharge calculation
                    let localWeightSurcharge = 0;
                    if (petWeight > 30) localWeightSurcharge = 60;
                    else if (petWeight > 20) localWeightSurcharge = 40;
                    else if (petWeight > 10) localWeightSurcharge = 20;

                    setWeightSurcharge(localWeightSurcharge);

                    const baseComponents = selectedVehicle.basePrice + (distance * selectedVehicle.perKmRate) + (duration * (selectedVehicle.perMinRate || 0));
                    const fallbackPrice = Math.max(selectedVehicle.minPrice || 0, Math.round(baseComponents * surgeMultiplier + localWeightSurcharge));
                    setPrice(fallbackPrice);
                }
            } finally {
                setLoadingPrice(false);
            }
        };

        fetchPrice();
    }, [pickupLocation, dropoffLocation, selectedVehicle, distance, mapProvider, petWeight]);

    // Calculate Route Origin/Dest based on status
    const routeOrigin = (bookingStatus === 'confirmed' && assignedDriver)
        ? { latitude: assignedDriver.lat, longitude: assignedDriver.lng }
        : (pickupLocation ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude } : null);

    const routeDestination = (bookingStatus === 'confirmed' && currentOrder?.status !== 'in_progress' && currentOrder?.status !== 'picked_up')
        ? (pickupLocation ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude } : null)
        : (dropoffLocation ? { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude } : null);

    const [driverDuration, setDriverDuration] = useState(0);

    // Fetch HERE Routes when origin/dest changes
    useEffect(() => {
        const fetchRoutes = async () => {
            if (!routeOrigin || !routeDestination || mapProvider !== 'here') return;

            try {
                // Determine mode (car/bike/truck) based on selected vehicle or default to car
                // For driver approach, we might want to use the driver's actual mode, assuming selectedVehicle.id maps correctly
                const mode = selectedVehicle?.id === 'bike' ? 'scooter' :
                    selectedVehicle?.id === 'van' ? 'truck' : 'car';

                const routes = await hereMapApi.getRoutes(
                    routeOrigin,
                    routeDestination,
                    mode as any,
                    HERE_MAPS_API_KEY
                );

                if (routes.length > 0) {
                    setHereRoutes(routes);

                    if (bookingStatus === 'idle') {
                        setDistance(routes[0].distance / 1000);
                        setDuration(routes[0].duration / 60);
                    } else if (bookingStatus === 'confirmed') {
                        // When confirmed, this route is Driver -> Pickup
                        setDriverDuration(routes[0].duration / 60);
                    }

                    if (mapRef.current) {
                        mapRef.current.fitToCoordinates(routes[0].coordinates, {
                            edgePadding: { top: 50, right: 50, bottom: 350, left: 50 },
                            animated: true,
                        });
                    }
                }
            } catch (error) {
                console.log("Error fetching HERE routes:", error);
            }
        };

        fetchRoutes();
    }, [bookingStatus, assignedDriver, pickupLocation, dropoffLocation, mapProvider, selectedVehicle]);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    const handleBook = async () => {
        if (!pickupLocation || !dropoffLocation || !selectedVehicle) return;
        if (!user?.id) {
            Alert.alert('Error', 'Please login to book a ride');
            return;
        }
        if (paymentMethod === 'wallet' && walletBalance < price) {
            Alert.alert(
                'ยอดเงินคงเหลือไม่พอ',
                `คุณมียอดเงินในวอลเล็ทไม่เพียงพอ (คงเหลือ ฿${formatPrice(walletBalance)}) กรุณาเติมเงินก่อนดำเนินการจอง`,
                [
                    { text: 'ยกเลิก', style: 'cancel' },
                    { text: 'เติมเงิน', onPress: () => router.push('/(customer)/(tabs)/wallet') }
                ]
            );
            return;
        }

        setBookingStatus('searching');

        try {
            // Create order via API
            const petIdsStr = params.petIds as string;
            const petIds = petIdsStr ? petIdsStr.split(',') : [];
            const primaryPetId = petIds.length > 0 ? Number(petIds[0]) : 1;

            const order = await orderService.createOrder({
                user_id: user.id,
                pet_id: primaryPetId,
                pickup_address: pickupLocation.name || pickupLocation.address || 'Pickup',
                pickup_lat: pickupLocation.latitude,
                pickup_lng: pickupLocation.longitude,
                dropoff_address: dropoffLocation.name || dropoffLocation.address || 'Dropoff',
                dropoff_lat: dropoffLocation.latitude,
                dropoff_lng: dropoffLocation.longitude,
                price: price,
                status: 'pending',
                payment_method: paymentMethod,
                payment_status: paymentMethod === 'cash' ? 'pending' : 'pending', // Both pending initially
                passengers: passengers,
                pet_ids: petIds.map(Number), // Send all pet IDs
                pet_details: displayPetNames
            });

            // Create initial payment record
            await api.createPayment({
                order_id: order.id,
                amount: price,
                method: paymentMethod,
                status: 'pending'
            });

            setCurrentOrder(order);
            console.log('Order created:', order.id);

            const startSharingLocation = async (orderId: number) => {
                if (shareLocationIntervalRef.current) clearInterval(shareLocationIntervalRef.current);
                shareLocationIntervalRef.current = setInterval(async () => {
                    try {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== 'granted') return;
                        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        await orderService.updateCustomerLocation(orderId, location.coords.latitude, location.coords.longitude);
                    } catch (error) {
                        console.error('Error sharing customer location:', error);
                    }
                }, 5000);
            };

            const stopSharingLocation = () => {
                if (shareLocationIntervalRef.current) {
                    clearInterval(shareLocationIntervalRef.current);
                    shareLocationIntervalRef.current = null;
                }
            };

            // Poll for order updates (acceptance, arrival, journey, completion)
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const updatedOrder = await orderService.getOrder(order.id);
                    console.log('Polling order status:', updatedOrder.status, 'driver_id:', updatedOrder.driver_id);

                    // 1. Detect Status Change for Notifications
                    if (prevStatusRef.current && prevStatusRef.current !== updatedOrder.status) {
                        if (updatedOrder.status === 'arrived') {
                            Alert.alert("Driver Arrived!", "Your driver has arrived at the pickup location. Please meet them at the pickup point.", [
                                { text: "OK", onPress: () => startSharingLocation(order.id) }
                            ]);
                        } else if (updatedOrder.status === 'in_progress') {
                            stopSharingLocation();
                            Alert.alert("Journey Started", "The journey has begun. Your pet is safely on the way!");
                        } else if (updatedOrder.status === 'completed') {
                            stopSharingLocation();
                            Alert.alert("Journey Completed", "You have arrived at your destination. Thank you for using our service!", [
                                {
                                    text: "OK",
                                    onPress: () => {
                                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                                        stopSharingLocation();
                                        setBookingStatus('idle');
                                        setCurrentOrder(null);
                                        setAssignedDriver(null);
                                        clearBooking();
                                        router.replace(`/(customer)/payment-summary/${order.id}`);
                                    }
                                }
                            ]);
                        } else if (updatedOrder.status === 'cancelled') {
                            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                            stopSharingLocation();
                            Alert.alert("Booking Cancelled", "This booking has been cancelled by the driver.", [
                                {
                                    text: "OK",
                                    onPress: () => {
                                        setBookingStatus('idle');
                                        setCurrentOrder(null);
                                        setAssignedDriver(null);
                                        clearBooking();
                                        router.replace('/(customer)/(tabs)/home');
                                    }
                                }
                            ]);
                        }
                    }
                    prevStatusRef.current = updatedOrder.status;
                    setCurrentOrder(updatedOrder);

                    // 2. Handle Driver Location & Navigation
                    if (updatedOrder.driver_id) {
                        const currentDrivers = driverLocationsRef.current;
                        const driverLoc = currentDrivers.find(d => d.driver?.id === updatedOrder.driver_id);

                        if (driverLoc) {
                            setAssignedDriver(driverLoc);

                            // 2.a Handle Navigation/Follow Mode (Always if in_progress)
                            if (updatedOrder.status === 'in_progress' && mapRef.current) {
                                mapRef.current.animateCamera({
                                    center: {
                                        latitude: driverLoc.lat,
                                        longitude: driverLoc.lng,
                                    },
                                    pitch: 45,
                                    heading: 0,
                                    altitude: 500,
                                    zoom: 17
                                }, { duration: 2000 });
                            }

                            // 2.b Handle First-time Acceptance (Shift Map)
                            if (bookingStatusRef.current === 'searching' && updatedOrder.status === 'accepted') {
                                if (mapRef.current) {
                                    mapRef.current.fitToCoordinates([
                                        { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
                                        { latitude: driverLoc.lat, longitude: driverLoc.lng }
                                    ], {
                                        edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
                                        animated: true
                                    });
                                }
                                setBookingStatus('confirmed');
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error polling order:', err);
                }
            }, 3000); // Poll every 3 seconds

            // Stop polling after 5 minutes ONLY if still searching
            setTimeout(() => {
                if (bookingStatusRef.current === 'searching') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setBookingStatus('idle');
                    Alert.alert('No driver found', 'Please try again later.', [
                        { text: 'OK', onPress: () => router.replace('/(customer)/(tabs)/home') }
                    ]);
                }
            }, 300000);

        } catch (error: any) {
            console.error('Failed to create order:', error);
            setBookingStatus('idle');
            Alert.alert('Booking Failed', error.message || 'Unable to create booking. Please try again.');
        }
    };

    const handleCancelOrder = async () => {
        if (!currentOrder) return;

        Alert.alert(
            "Cancel Order",
            "Are you sure you want to cancel this booking?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        setIsCancelling(true);
                        try {
                            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                            if (shareLocationIntervalRef.current) clearInterval(shareLocationIntervalRef.current);
                            await orderService.cancelOrder(currentOrder.id);

                            // Reset state
                            setBookingStatus('idle');
                            setCurrentOrder(null);
                            setAssignedDriver(null);
                            clearBooking();
                            router.replace('/(customer)/(tabs)/home');

                            // Adjust map back to pickup/dropoff
                            if (mapRef.current && pickupLocation && dropoffLocation) {
                                mapRef.current.fitToCoordinates([
                                    { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
                                    { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude }
                                ], {
                                    edgePadding: { top: 50, right: 50, bottom: 590, left: 50 },
                                    animated: true,
                                });
                            }
                        } catch (error) {
                            console.error('Failed to cancel order:', error);
                            Alert.alert("Error", "Failed to cancel order. Please try again.");
                        } finally {
                            setIsCancelling(false);
                        }
                    }
                }
            ]
        );
    };

    const initialRegion = pickupLocation ? {
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    } : {
        latitude: 13.7563,
        longitude: 100.5018,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    }


    const handleMapReady = () => {
        if (!mapRef.current || !pickupLocation || !dropoffLocation) return;

        mapRef.current.fitToCoordinates([
            { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
            { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
        ], {
            edgePadding: { top: 50, right: 50, bottom: 590, left: 50 },
            animated: true,
        });
    };

    return (
        <View className="flex-1 bg-white">
            {/* Full Screen Map */}
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-gray-200">
                <MapView
                    ref={mapRef}

                    provider={PROVIDER_GOOGLE}
                    style={{ flex: 1 }}
                    initialRegion={initialRegion}
                    onMapReady={handleMapReady}
                >
                    {pickupLocation && dropoffLocation && (
                        <>
                            {/* Pickup Marker - Always show if idle, or as Destination if confirmed */}
                            {(pickupLocation && (bookingStatus === 'idle' || bookingStatus === 'confirmed')) && (
                                <Marker coordinate={{ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }}>
                                    <View className="bg-white p-1 rounded-full border border-blue-500 shadow-sm">
                                        <View className="w-2 h-2 bg-blue-500 rounded-full" />
                                    </View>
                                </Marker>
                            )}

                            {/* Dropoff Marker - Hide if Driver is approaching (confirmed) */}
                            {(dropoffLocation && bookingStatus === 'idle') && (
                                <Marker coordinate={{ latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude }}>
                                    <View className="bg-white p-1 rounded-full border border-red-500 shadow-sm">
                                        <View className="w-2 h-2 bg-red-500 rounded-full" />
                                    </View>
                                </Marker>
                            )}
                            {(routeOrigin && routeDestination) && (
                                <>
                                    {mapProvider === 'google' ? (
                                        <MapViewDirections
                                            origin={routeOrigin}
                                            destination={routeDestination}
                                            apikey={GOOGLE_MAPS_API_KEY}
                                            strokeWidth={4}
                                            strokeColor={bookingStatus === 'confirmed' ? "#00A862" : "#3B82F6"} // Green for driver, Blue for trip
                                            onReady={result => {
                                                if (bookingStatus === 'idle') {
                                                    setDistance(result.distance);
                                                    setDuration(result.duration);
                                                }
                                                // Handle fitting map
                                                if (mapRef.current) {
                                                    mapRef.current.fitToCoordinates(result.coordinates, {
                                                        edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
                                                        animated: true
                                                    });
                                                }
                                            }}
                                            onError={(errorMessage) => {
                                                console.log('GOT AN ERROR', errorMessage);
                                            }}
                                        />
                                    ) : (
                                        <>
                                            {hereRoutes.length > 0 && hereRoutes[0].segments && hereRoutes[0].segments.length > 0 ? (
                                                hereRoutes[0].segments.map((segment, index) => (
                                                    <Polyline
                                                        key={`traffic-segment-${index}`}
                                                        coordinates={segment.coordinates}
                                                        strokeColor={segment.color}
                                                        strokeWidth={10}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                        zIndex={10}
                                                    />
                                                ))
                                            ) : (
                                                hereRoutes.length > 0 && (
                                                    <Polyline
                                                        coordinates={hereRoutes[0].coordinates}
                                                        strokeColor="#3B82F6"
                                                        strokeWidth={5}
                                                        zIndex={10}
                                                    />
                                                )
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Driver Markers */}
                    {driverLocations
                        .filter(driver => {
                            // Filter by vehicle type
                            if (!selectedVehicle || driver.driver?.vehicle_type !== selectedVehicle.id) {
                                return false;
                            }

                            // Filter by distance - only show drivers within 2km radius
                            if (pickupLocation) {
                                const distance = getDistance(
                                    pickupLocation.latitude,
                                    pickupLocation.longitude,
                                    driver.lat,
                                    driver.lng
                                );
                                return distance <= 2; // 2 kilometers radius
                            }

                            return true; // If no pickup location, show all (fallback)
                        })
                        .map((driver) => (
                            <Marker
                                key={`driver-${driver.id}`}
                                coordinate={{ latitude: driver.lat, longitude: driver.lng }}
                                title={driver.driver?.user?.full_name || "Driver"}
                                description={`Plate: ${driver.driver?.vehicle_plate || '-'}`}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View className="bg-white p-1 rounded-full border border-green-500 shadow-sm">
                                    {/* Use driver's actual vehicle type for icon (though filtered, so matches selected) */}
                                    {driver.driver?.vehicle_type === 'suv' ? (
                                        <Bike size={16} color="#00A862" />
                                    ) : driver.driver?.vehicle_type === 'van' ? (
                                        <Truck size={16} color="#FF9100" />
                                    ) : (
                                        <Car size={16} color="#2962FF" />
                                    )}
                                </View>
                            </Marker>
                        ))}
                </MapView>

                {/* Back Button Overlay */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-12 left-5 bg-white p-2 rounded-full shadow-sm z-10"
                >
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Content */}
            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    top: panY,
                    backgroundColor: 'white',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: -2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                }}
            >
                {/* Drag Handle */}
                <View
                    {...panResponder.panHandlers}
                    className="w-full items-center pt-3 pb-2 bg-white rounded-t-3xl"
                >
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </View>

                {bookingStatus === 'idle' && (
                    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

                        {/* Header Info */}
                        <View className="flex-row justify-between items-center mb-6 pt-2">
                            <View>
                                <Text className="text-2xl font-bold text-gray-900">
                                    {t('confirm_booking')}
                                </Text>
                                <Text className="text-gray-500">
                                    {`${distance.toFixed(1)} km • ${Math.ceil(duration)} min`}
                                </Text>
                            </View>
                            <View className="bg-green-100 px-3 py-1 rounded-lg min-w-[80px] items-center">
                                {loadingPrice ? (
                                    <Text className="text-green-700 font-bold text-lg">...</Text>
                                ) : (
                                    <Text className="text-green-700 font-bold text-lg">฿{formatPrice(price)}</Text>
                                )}
                            </View>
                        </View>

                        {/* Route Details */}
                        <View className="mb-6 space-y-4">
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <View className="w-3 h-3 bg-blue-500 rounded-full" />
                                    <View className="w-0.5 h-8 bg-gray-200 my-1" />
                                    <View className="w-3 h-3 bg-red-500 rounded-sm" />
                                </View>
                                <View className="flex-1 space-y-6">
                                    <View>
                                        <Text className="text-gray-500 text-xs uppercase mb-1">{t('pick_up')}</Text>
                                        <Text className="font-semibold text-gray-800" numberOfLines={1}>{pickupLocation?.name}</Text>
                                        <Text className="text-gray-500 text-xs" numberOfLines={1}>{pickupLocation?.address}</Text>
                                    </View>
                                    <View>
                                        <Text className="text-gray-500 text-xs uppercase mb-1">{t('drop_off')}</Text>
                                        <Text className="font-semibold text-gray-800" numberOfLines={1}>{dropoffLocation?.name}</Text>
                                        <Text className="text-gray-500 text-xs" numberOfLines={1}>{dropoffLocation?.address}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Trip Details (Pets & Passengers) */}
                        <View className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <Text className="font-bold text-gray-800 mb-2">Trip Details</Text>

                            <View className="flex-row items-center mb-2">
                                <PawPrint size={16} color="#4B5563" />
                                <Text className="ml-2 text-gray-600 font-medium">
                                    Pets: <Text className="text-gray-900">{displayPetNames}</Text>
                                </Text>
                            </View>

                            <View className="flex-row items-center">
                                <User size={16} color="#4B5563" />
                                <Text className="ml-2 text-gray-600 font-medium">
                                    Passengers: <Text className="text-gray-900">{passengers}</Text>
                                </Text>
                            </View>
                        </View>


                        {/* Vehicle Selection */}
                        <Text className="text-lg font-bold mb-3 text-gray-900">{t('choose_vehicle')}</Text>
                        {loadingVehicles ? (
                            <ActivityIndicator size="large" color="#0000ff" className="mb-6" />
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                                {vehicles.map((vehicle) => (
                                    <TouchableOpacity
                                        key={vehicle.id}
                                        onPress={() => setSelectedVehicle(vehicle)}
                                        className={`mr-4 p-4 rounded-xl border-2 w-40 ${selectedVehicle?.id === vehicle.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        {/* Image Placeholder */}
                                        <View className="h-20 w-full mb-2 bg-gray-100 rounded-lg justify-center items-center">
                                            <Text className="text-gray-400 text-xs">{vehicle.id}</Text>
                                        </View>
                                        <Text className="font-bold text-gray-800">{vehicle.name}</Text>
                                        <Text className="text-primary font-bold">
                                            ฿{selectedVehicle?.id === vehicle.id && !loadingPrice
                                                ? formatPrice(price)
                                                : formatPrice(Math.max(vehicle.minPrice || 0, Math.round(((vehicle.basePrice + (distance * vehicle.perKmRate) + (duration * (vehicle.perMinRate || 0))) * surgeMultiplier) + weightSurcharge)))
                                            }
                                        </Text>
                                        <Text className="text-xs text-gray-500">+{t('pet_surcharge') || 'Pet'}: ฿{formatPrice(weightSurcharge)}</Text>
                                        {/* <Text className="text-xs text-gray-500">pet weight: {petWeight}</Text> */}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {/* Payment Method Selection */}
                        <Text className="text-lg font-bold mb-3 text-gray-900">{t('payment_method')}</Text>
                        <View className="flex-row gap-4 mb-6">
                            <TouchableOpacity
                                onPress={() => setPaymentMethod('cash')}
                                className={`flex-1 p-4 rounded-xl border-2 items-center flex-row ${paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${paymentMethod === 'cash' ? 'bg-primary' : 'bg-gray-100'}`}>
                                    <Wallet size={20} color={paymentMethod === 'cash' ? 'white' : 'gray'} />
                                </View>
                                <Text className={`font-semibold ${paymentMethod === 'cash' ? 'text-primary' : 'text-gray-500'}`}>{t('cash')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPaymentMethod('promptpay')}
                                className={`flex-1 p-4 rounded-xl border-2 items-center flex-row ${paymentMethod === 'promptpay' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${paymentMethod === 'promptpay' ? 'bg-primary' : 'bg-gray-100'}`}>
                                    <CreditCard size={20} color={paymentMethod === 'promptpay' ? 'white' : 'gray'} />
                                </View>
                                <Text className={`font-semibold ${paymentMethod === 'promptpay' ? 'text-primary' : 'text-gray-500'}`}>{t('promptpay')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPaymentMethod('wallet')}
                                className={`flex-1 p-4 rounded-xl border-2 items-center flex-row ${paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${paymentMethod === 'wallet' ? 'bg-primary' : 'bg-gray-100'}`}>
                                    <Wallet size={20} color={paymentMethod === 'wallet' ? 'white' : 'gray'} />
                                </View>
                                <View>
                                    <Text className={`font-semibold ${paymentMethod === 'wallet' ? 'text-primary' : 'text-gray-500'}`}>วอลเล็ท</Text>
                                    <Text className={`text-[10px] ${walletBalance < price ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                        ฿{formatPrice(walletBalance)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-4 mb-6">
                            <TouchableOpacity
                                onPress={() => setPaymentMethod('stripe')}
                                className={`flex-1 p-4 rounded-xl border-2 items-center flex-row ${paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${paymentMethod === 'stripe' ? 'bg-primary' : 'bg-gray-100'}`}>
                                    <CreditCard size={20} color={paymentMethod === 'stripe' ? 'white' : 'gray'} />
                                </View>
                                <Text className={`font-semibold ${paymentMethod === 'stripe' ? 'text-primary' : 'text-gray-500'}`}>บัตรเครดิต</Text>
                            </TouchableOpacity>
                            <View className="flex-1" />
                        </View>

                        {/* Note Input */}
                        <View className="bg-gray-50 p-4 rounded-xl mb-6">
                            <TextInput
                                placeholder="Note to driver (optional)"
                                value={note}
                                onChangeText={setNote}
                                className="flex-1 text-gray-800 font-medium"
                                placeholderTextColor="#9CA3AF"
                                style={{ paddingVertical: 8 }} // Ensure touch target
                            />
                        </View>

                        <View className="pt-2">
                            {/* Extra padding to prevent keyboard hiding */}
                        </View>

                    </ScrollView>
                )}

                {/* Fixed Footer within Bottom Sheet */}
                {bookingStatus === 'idle' && (
                    <View className="p-5 border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] bg-white">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-500">{t('service_fare') || 'Service Fare'}</Text>
                            <Text className="font-semibold text-gray-800">
                                {loadingPrice ? '...' : `฿${formatPrice(Math.round((price - weightSurcharge) / surgeMultiplier))}`}
                            </Text>
                        </View>

                        {surgeMultiplier > 1 && (
                            <View className="flex-row justify-between mb-2">
                                <View className="flex-1">
                                    <Text className="text-orange-600 font-medium">Surge pricing ({surgeMultiplier}x)</Text>
                                    <Text className="text-orange-400 text-xs">{surgeReasons.join(', ')}</Text>
                                </View>
                                <Text className="font-semibold text-orange-600">
                                    +฿{formatPrice(price - weightSurcharge - Math.round((price - weightSurcharge) / surgeMultiplier))}
                                </Text>
                            </View>
                        )}

                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-500">{t('weight_kg') || 'Pet weight'} ({petWeight.toFixed(1)}kg)</Text>
                            <Text className="font-semibold text-gray-800">
                                {loadingPrice ? '...' : (weightSurcharge > 0 ? `+฿${formatPrice(weightSurcharge)}` : 'Free')}
                            </Text>
                        </View>

                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-500">{t('payment_method')}</Text>
                            <Text className="font-semibold text-gray-800">
                                {paymentMethod === 'cash' ? t('cash') : paymentMethod === 'promptpay' ? t('promptpay') : paymentMethod === 'wallet' ? 'วอลเล็ท' : 'บัตรเครดิต'}
                            </Text>
                        </View>

                        <View className="flex-row justify-between mb-6">
                            <Text className="text-lg font-bold text-gray-900">Total</Text>
                            {loadingPrice ? (
                                <Text className="text-2xl font-bold text-primary">Loading...</Text>
                            ) : (
                                <Text className="text-2xl font-bold text-primary">฿{formatPrice(price)}</Text>
                            )}
                        </View>
                        <AppButton
                            title="Confirm Booking"
                            onPress={handleBook}
                            size="lg"
                        />
                    </View>
                )}

                {bookingStatus === 'searching' && (
                    <View className="p-8 items-center bg-white h-60">
                        <ActivityIndicator size="large" color="#00A862" className="mb-4" />
                        <Text className="text-lg font-bold text-gray-800">Finding your driver...</Text>
                        <Text className="text-gray-500 mt-2 text-center mb-6">We are connecting you with the nearest {selectedVehicle?.name}</Text>

                        <AppButton
                            title={isCancelling ? "Cancelling..." : "Cancel Order"}
                            variant="secondary"
                            onPress={handleCancelOrder}
                            disabled={isCancelling}
                            className="w-full bg-gray-100"
                            textClassName="text-gray-600"
                        />
                    </View>
                )}

                {bookingStatus === 'confirmed' && assignedDriver && (
                    <View className="p-5 border-t border-gray-100 bg-white">
                        <Text className="text-lg font-bold text-green-600 mb-4 text-center">
                            {currentOrder?.status === 'arrived' ? 'Driver Arrived!' :
                                (currentOrder?.status === 'in_progress' || currentOrder?.status === 'picked_up') ? 'Heading to destination' :
                                    'Driver Found!'}
                        </Text>

                        <View className="flex-row items-center mb-6">
                            <View className="w-16 h-16 bg-gray-200 rounded-full mr-4 items-center justify-center">
                                <Text className="text-2xl">👨‍✈️</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-xl font-bold text-gray-900">{assignedDriver.driver?.user?.full_name}</Text>
                                <View className="flex-row items-center mt-1">
                                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                    <Text className="text-sm font-semibold ml-1">4.9</Text>
                                    <Text className="text-xs text-gray-400 ml-1">(120 jobs)</Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="font-bold text-lg text-gray-800">{assignedDriver.driver?.vehicle_plate}</Text>
                                <Text className="text-xs text-gray-500">{assignedDriver.driver?.vehicle_type}</Text>
                            </View>
                        </View>

                        <View className="flex-row space-x-3 mb-4">
                            <TouchableOpacity className="flex-1 bg-green-500 py-3 rounded-xl flex-row justify-center items-center">
                                <Phone size={20} color="white" className="mr-2" />
                                <Text className="text-white font-bold">Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-blue-100 py-3 rounded-xl flex-row justify-center items-center"
                                onPress={() => router.push(`/(customer)/chat/${currentOrder?.id || 1}`)}
                            >
                                <MessageCircle size={20} color="#2563EB" className="mr-2" />
                                <Text className="text-blue-600 font-bold">Chat</Text>
                            </TouchableOpacity>
                        </View>

                        {(currentOrder?.status === 'in_progress' || currentOrder?.status === 'picked_up') && currentOrder?.payment_status !== 'paid' && (
                            <TouchableOpacity
                                className="w-full bg-blue-600 py-4 rounded-xl flex-row justify-center items-center mb-4"
                                onPress={() => router.push(`/(customer)/payment/${currentOrder?.id}`)}
                            >
                                <CreditCard size={20} color="white" className="mr-2" />
                                <Text className="text-white font-bold text-lg">Pay Now (฿{formatPrice(price)})</Text>
                            </TouchableOpacity>
                        )}

                        {(currentOrder?.status === 'accepted' || currentOrder?.status === 'pending') && (
                            <AppButton
                                title="Cancel Booking"
                                onPress={async () => {
                                    if (currentOrder) {
                                        console.log(`Canceling order ${currentOrder.id}`);
                                        try {
                                            await orderService.cancelOrder(currentOrder.id, assignedDriver?.driver?.id);
                                            setBookingStatus('idle');
                                            setCurrentOrder(null);
                                            setAssignedDriver(null);
                                            clearBooking();
                                            Alert.alert('Booking Cancelled', 'Your booking has been cancelled.', [
                                                { text: 'OK', onPress: () => router.replace('/(customer)/(tabs)/home') }
                                            ]);
                                        } catch (error) {
                                            Alert.alert('Error', 'Failed to cancel booking');
                                        }
                                    } else {
                                        setBookingStatus('idle');
                                        router.replace('/(customer)/(tabs)/home');
                                    }
                                }}
                                variant="outline"
                                size="sm"
                            />
                        )}
                    </View>
                )}

            </Animated.View>
        </View >
    );
}
