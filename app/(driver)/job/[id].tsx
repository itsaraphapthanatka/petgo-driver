import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Animated, PanResponder, Dimensions, ScrollView, Platform, Linking, Modal, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { AppButton } from '../../../components/ui/AppButton';
import { Phone, MessageCircle, ArrowLeft, Navigation as NavIcon, User, Wallet, CreditCard, XCircle } from 'lucide-react-native';
import { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapView from 'react-native-maps';
import { AppMapView } from '../../../components/AppMapView';
import { PetGoCarIcon } from '../../../components/icons/PetGoCarIcon';
import { useJobStore } from '../../../store/useJobStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { orderService } from '../../../services/orderService';
import { api } from '../../../services/api';
import { Order } from '../../../types/order';
import { hereMapApi, LatLng } from '../../../services/hereMapApi';
import * as Location from 'expo-location';
import { formatPrice } from '../../../utils/format';

const HERE_API_KEY = process.env.EXPO_PUBLIC_HERE_MAPS_API_KEY || "";

export default function ActiveJobScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const { activeJob, setActiveJob } = useJobStore();
    const mapRef = useRef<MapView>(null);
    const [status, setStatus] = useState<Order['status']>('accepted');
    const [isLoading, setIsLoading] = useState(true);
    const [order, setOrder] = useState<Order | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
    const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [isFetchingQR, setIsFetchingQR] = useState(false);

    // Pulse Animation for Customer Location
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Animation for Bottom Sheet
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const SNAP_TOP = SCREEN_HEIGHT * 0.45;
    const SNAP_BOTTOM = SCREEN_HEIGHT - 280;

    const panY = useRef(new Animated.Value(SNAP_BOTTOM)).current;

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

                if (gestureState.dy > 50 || (gestureState.dy > 0 && gestureState.vy > 0.5)) {
                    Animated.spring(panY, {
                        toValue: SNAP_BOTTOM,
                        useNativeDriver: false,
                        tension: 50,
                        friction: 10
                    }).start();
                } else if (gestureState.dy < -50 || (gestureState.dy < 0 && gestureState.vy < -0.5)) {
                    Animated.spring(panY, {
                        toValue: SNAP_TOP,
                        useNativeDriver: false,
                        tension: 50,
                        friction: 10
                    }).start();
                } else {
                    Animated.spring(panY, {
                        toValue: gestureState.dy > 0 ? SNAP_BOTTOM : SNAP_TOP,
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    // Watch Location
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        const startWatching = async () => {
            const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
            if (permissionStatus !== 'granted') return;

            // Get initial immediately
            const loc = await Location.getCurrentPositionAsync({});
            setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
                (loc) => {
                    const newPos = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        heading: loc.coords.heading || 0
                    };
                    setCurrentLocation(newPos);

                    if (status === 'in_progress' && mapRef.current) {
                        mapRef.current.animateCamera({
                            center: {
                                latitude: newPos.latitude,
                                longitude: newPos.longitude,
                            },
                            pitch: 45,
                            heading: newPos.heading,
                            altitude: 200,
                            zoom: 18
                        }, { duration: 1000 });
                    }
                }
            );
        };
        startWatching();
        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    // Fetch Route
    useEffect(() => {
        const fetchRoute = async () => {
            if (!order) return;

            let origin: LatLng | null = null;
            let destination: LatLng | null = null;

            if (status === 'accepted' || status === 'arrived') {
                if (currentLocation) {
                    origin = currentLocation;
                } else {
                    origin = {
                        latitude: order.pickup_lat - 0.005,
                        longitude: order.pickup_lng - 0.005
                    };
                }
                destination = {
                    latitude: order.pickup_lat,
                    longitude: order.pickup_lng
                };
            } else if (status === 'picked_up' || status === 'in_progress') {
                if (currentLocation) {
                    origin = currentLocation;
                } else {
                    origin = {
                        latitude: order.pickup_lat,
                        longitude: order.pickup_lng
                    };
                }
                destination = {
                    latitude: order.dropoff_lat,
                    longitude: order.dropoff_lng
                };
            }

            if (origin && destination) {
                const route = await hereMapApi.getHereRoute(
                    origin,
                    destination,
                    (status === 'in_progress' || status === 'picked_up') ? order.stops?.map(s => ({ latitude: s.lat, longitude: s.lng })) : [],
                    HERE_API_KEY
                );
                setRouteCoordinates(route);

                if (mapRef.current && route.length > 0) {
                    mapRef.current.fitToCoordinates(route, {
                        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                        animated: true,
                    });
                }
            }
        };

        fetchRoute();
    }, [order, status, currentLocation ? 1 : 0]);

    // Fetch Order
    useEffect(() => {
        let isMounted = true;

        const fetchOrder = async (isPolling = false) => {
            // Only show loader on initial fetch
            if (!isPolling) setIsLoading(true);

            try {
                const fetchedOrder = await orderService.getOrder(Number(id));

                if (!isMounted) return;

                // Update order state
                setOrder(fetchedOrder);
                setActiveJob(fetchedOrder);

                // Handle status transitions / alerts
                if (fetchedOrder.status === 'arrived') {
                    setStatus('arrived');
                } else if (fetchedOrder.status === 'picked_up' || fetchedOrder.status === 'in_progress') {
                    setStatus('in_progress');
                } else if (fetchedOrder.status === 'completed') {
                    setStatus('completed');
                } else if (fetchedOrder.status === 'accepted') {
                    setStatus('accepted');
                } else if (fetchedOrder.status === 'cancelled' || fetchedOrder.status === 'pending') {
                    if (isPolling) {
                        Alert.alert(t('booking_cancelled'), t('booking_cancelled_desc'), [
                            { text: t('confirm'), onPress: () => router.replace('/(driver)/(tabs)/home') }
                        ]);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch order:', error);
            } finally {
                if (!isPolling && isMounted) setIsLoading(false);
            }
        };

        fetchOrder(false); // Initial load
        fetchOrder(false); // Initial load
        const interval = setInterval(async () => {
            if (activeJob?.payment_method === 'promptpay') {
                await api.syncPayment(Number(id));
            }
            fetchOrder(true);
        }, 5000); // Poll every 5 seconds

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [id]);

    // Auto-close QR Modal if paid
    useEffect(() => {
        if (order?.payment_status === 'paid' && showQRModal) {
            setShowQRModal(false);
            Alert.alert("Payment Received", "The customer has successfully paid via PromptPay.", [
                { text: "OK", onPress: () => router.replace('/(driver)/(tabs)/home') }
            ]);
        }
    }, [order?.payment_status, showQRModal]);

    const fetchQR = async () => {
        if (!order) return;
        setIsFetchingQR(true);
        setShowQRModal(true);
        try {
            const result = await api.createPaymentIntent({
                order_id: order.id,
                amount: order.price || 0,
                method: 'promptpay'
            });
            if (result.qr_code_url) {
                setQrCodeUrl(result.qr_code_url);
            }
        } catch (error) {
            console.error("Failed to fetch PromptPay QR:", error);
            Alert.alert("Error", "Could not generate PromptPay QR code.");
            setShowQRModal(false);
        } finally {
            setIsFetchingQR(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = async () => {
        if (!order || isSubmitting) return;

        try {
            setIsSubmitting(true);
            if (status === 'accepted') {
                if (!currentLocation) {
                    Alert.alert("Location Unknown", "Please wait for your GPS location to be updated.");
                    setIsSubmitting(false);
                    return;
                }

                // Check distance to pickup
                const dist = calculateDistance(
                    currentLocation!.latitude,
                    currentLocation!.longitude,
                    order.pickup_lat,
                    order.pickup_lng
                );

                // if (dist > 200) {
                //     Alert.alert("Check-in Failed", `You are too far from the pickup location (${dist.toFixed(0)}m). You must be within 200m.`);
                //     return;
                // }

                const updatedOrder = await orderService.updateOrderStatus(order.id, 'arrived');
                setOrder(updatedOrder);
                setStatus('arrived');
            } else if (status === 'arrived') {
                const updatedOrder = await orderService.updateOrderStatus(order.id, 'in_progress');
                setOrder(updatedOrder);
                setStatus('in_progress');
            } else if (status === 'picked_up' || status === 'in_progress') {
                if (!currentLocation) {
                    Alert.alert("Location Unknown", "Please wait for your GPS location to be updated.");
                    setIsSubmitting(false);
                    return;
                }

                // Find current stop - SORT FIRST to be safe
                const sortedStops = [...(order.stops || [])].sort((a, b) => a.order_index - b.order_index);
                const nextStop = sortedStops.find(s => s.status !== 'departed');

                if (nextStop) {
                    const distToStop = calculateDistance(
                        currentLocation!.latitude,
                        currentLocation!.longitude,
                        nextStop.lat,
                        nextStop.lng
                    );

                    if (nextStop.status === 'pending') {
                        if (distToStop > 200) {
                            Alert.alert("Arrived Failed", `You are too far from stop ${nextStop.order_index + 1} (${distToStop.toFixed(0)}m).`);
                            setIsSubmitting(false);
                            return;
                        }
                        if (nextStop.id) {
                            const updatedOrder = await orderService.updateStopStatus(order.id, nextStop.id, 'arrived');
                            setOrder(updatedOrder);
                        }
                    } else if (nextStop.status === 'arrived') {
                        console.log(`Updating stop ${nextStop.id} to departed`);
                        if (nextStop.id) {
                            const updatedOrder = await orderService.updateStopStatus(order.id, nextStop.id, 'departed');
                            setOrder(updatedOrder);
                        }
                    }
                    setIsSubmitting(false);
                    return;
                }

                // Final Dropoff logic
                const distToDropoff = calculateDistance(
                    currentLocation!.latitude,
                    currentLocation!.longitude,
                    order.dropoff_lat,
                    order.dropoff_lng
                );

                if (distToDropoff > 200) {
                    Alert.alert("Complete Failed", `You are too far from the drop-off location (${distToDropoff.toFixed(0)}m).`);
                    setIsSubmitting(false);
                    return;
                }

                if (order.payment_method === 'cash' && order.payment_status !== 'paid') {
                    // Force payment collection for cash
                    router.push(`/(driver)/payment-collect/${order.id}`);
                    return;
                }

                // For Stripe or Wallet, we mark as completed
                const updatedOrder = await orderService.updateOrderStatus(order.id, 'completed');
                setStatus('completed');
                setOrder(updatedOrder);

                if (order.payment_method === 'promptpay' && order.payment_status !== 'paid') {
                    fetchQR();
                } else if (order.payment_method === 'cash') {
                    router.replace(`/(driver)/payment-collect/${order.id}`);
                } else {
                    Alert.alert("Success", "Job completed successfully!", [
                        { text: "OK", onPress: () => router.replace('/(driver)/(tabs)/home') }
                    ]);
                }
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            Alert.alert("Error", "Failed to update status. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChat = () => {
        if (order) {
            router.push(`/(driver)/chat/${order.id}`);
        }
    };

    const handleCall = async () => {
        if (order?.customer?.phone) {
            const url = `tel:${order.customer.phone}`;
            try {
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                    Linking.openURL(url);
                } else {
                    Alert.alert(t('call'), `${t('customer')}: ${order.customer.phone}`);
                }
            } catch (error) {
                // Fallback for simulators or missing Info.plist config
                Alert.alert(t('call'), `${t('customer')}: ${order.customer.phone}`);
            }
        } else {
            Alert.alert(t('error'), t('phone_not_available'));
        }
    };

    const openGoogleMaps = () => {
        if (!order) return;

        let targetLat = order.dropoff_lat;
        let targetLng = order.dropoff_lng;

        if (status === 'accepted' || status === 'arrived') {
            targetLat = order.pickup_lat;
            targetLng = order.pickup_lng;
        } else if (status === 'in_progress') {
            const nextStop = order.stops?.find(s => s.status !== 'departed');
            if (nextStop) {
                targetLat = nextStop.lat;
                targetLng = nextStop.lng;
            }
        }

        const url = Platform.OS === 'ios'
            ? `comgooglemaps://?daddr=${targetLat},${targetLng}&directionsmode=driving`
            : `google.navigation:q=${targetLat},${targetLng}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`);
            }
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#00A862" />
                <Text className="text-gray-500 mt-4">Loading job details...</Text>
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 bg-white items-center justify-center p-8">
                <Text className="text-xl font-bold text-gray-800 mb-2">Job Not Found</Text>
                <AppButton title="Go Back" onPress={() => router.back()} />
            </View>
        );
    }

    const initialRegion = {
        latitude: (status === 'accepted' || status === 'arrived') ? order.pickup_lat : order.dropoff_lat,
        longitude: (status === 'accepted' || status === 'arrived') ? order.pickup_lng : order.dropoff_lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    return (
        <View className="flex-1 bg-white">
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-gray-200">
                <AppMapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    initialRegion={initialRegion}
                    provider={PROVIDER_GOOGLE}
                >
                    {routeCoordinates.length > 0 && (
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeWidth={4}
                            strokeColor="#3B82F6"
                        />
                    )}
                    {currentLocation && (
                        <Marker
                            coordinate={currentLocation}
                            title="You"
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <PetGoCarIcon width={24} height={48} />
                        </Marker>
                    )}
                    <Marker
                        coordinate={{ latitude: order.pickup_lat, longitude: order.pickup_lng }}
                        title="Pickup"
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <View className="bg-white p-1 rounded-full border border-blue-500 shadow-sm">
                            <View className="w-2 h-2 bg-blue-500 rounded-full" />
                        </View>
                    </Marker>
                    <Marker
                        coordinate={{ latitude: order.dropoff_lat, longitude: order.dropoff_lng }}
                        title="Dropoff"
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <View className="bg-white p-1 rounded-full border border-red-500 shadow-sm">
                            <View className="w-2 h-2 bg-red-500 rounded-full" />
                        </View>
                    </Marker>
                    {order.stops?.map((stop, index) => (
                        <Marker
                            key={`stop-${index}`}
                            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                            title={`Stop ${index + 1}`}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View className="bg-white p-1 rounded-full border border-orange-400 shadow-sm">
                                <View className="w-2 h-2 bg-orange-400 rounded-full" />
                            </View>
                        </Marker>
                    ))}
                    {order.customer_lat && order.customer_lng && status !== 'in_progress' && status !== 'completed' && (
                        <Marker
                            coordinate={{ latitude: order.customer_lat, longitude: order.customer_lng }}
                            title="Customer Location"
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View className="items-center justify-center">
                                <Animated.View
                                    style={{
                                        position: 'absolute',
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        backgroundColor: 'rgba(59, 130, 246, 0.4)',
                                        transform: [{
                                            scale: pulseAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 3]
                                            })
                                        }],
                                        opacity: pulseAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.7, 0]
                                        })
                                    }}
                                />
                                <View className="bg-white p-1 rounded-full border-2 border-blue-500 shadow-lg">
                                    <User size={20} color="#3B82F6" />
                                </View>
                            </View>
                        </Marker>
                    )}
                </AppMapView>

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-12 left-5 bg-white p-2 rounded-full shadow-sm z-10"
                >
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
            </View>

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
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                }}
            >
                <View
                    {...panResponder.panHandlers}
                    className="w-full items-center pt-3 pb-2 bg-white rounded-t-3xl"
                >
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </View>

                <View className="flex-1 px-5 pt-2">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="mb-4">
                            <View className="flex-row items-center mb-1">
                                <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                                <Text className="text-xs text-gray-400 uppercase font-bold">Pick up</Text>
                            </View>
                            <Text className="text-gray-900 font-semibold" numberOfLines={2}>{order.pickup_address}</Text>
                        </View>

                        {([...(order.stops || [])].sort((a, b) => a.order_index - b.order_index)).map((stop, index) => (
                            <View key={`stop-${index}`} className="mb-4">
                                <View className="flex-row items-center justify-between mb-1">
                                    <View className="flex-row items-center">
                                        <View className={`w-2 h-2 rounded-full ${stop.status === 'departed' ? 'bg-gray-300' : 'bg-orange-400'} mr-2`} />
                                        <Text className="text-xs text-gray-400 uppercase font-bold">Stop {index + 1}</Text>
                                    </View>
                                    {stop.status !== 'pending' && (
                                        <View className={`${stop.status === 'arrived' ? 'bg-blue-100' : 'bg-gray-100'} px-2 py-0.5 rounded-full`}>
                                            <Text className={`${stop.status === 'arrived' ? 'text-blue-600' : 'text-gray-500'} text-[10px] font-bold uppercase`}>
                                                {stop.status}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text className={`text-gray-900 font-semibold ${stop.status === 'departed' ? 'opacity-50' : ''}`} numberOfLines={2}>{stop.address}</Text>
                            </View>
                        ))}

                        <View className="mb-6">
                            <View className="flex-row items-center mb-1">
                                <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                <Text className="text-xs text-gray-400 uppercase font-bold">Drop off</Text>
                            </View>
                            <Text className="text-gray-900 font-semibold" numberOfLines={2}>{order.dropoff_address}</Text>
                        </View>

                        <View className="flex-row items-center justify-between border-t border-b border-gray-100 py-4 mb-4">
                            <View className="flex-row items-center flex-1">
                                <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center mr-3">
                                    <Text className="text-xl">👤</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-800">{order.customer?.full_name || 'Customer'}</Text>
                                    <Text className="text-gray-500 text-xs">
                                        {order.pet?.type} ({order.pet?.name}) • {order.pet?.weight ? `${order.pet.weight}kg` : ''}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row space-x-3">
                                <TouchableOpacity
                                    className="bg-blue-100 p-3 rounded-full"
                                    onPress={openGoogleMaps}
                                >
                                    <NavIcon size={20} color="#2563EB" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="bg-gray-100 p-3 rounded-full"
                                    onPress={handleChat}
                                >
                                    <MessageCircle size={20} color="black" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="bg-green-500 p-3 rounded-full"
                                    onPress={handleCall}
                                >
                                    <Phone size={20} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="bg-gray-50 p-3 rounded-lg mb-4 flex-row items-center">
                            <Text className="text-lg mr-2">
                                {order.pet?.type?.toLowerCase() === 'dog' ? '🐶' :
                                    order.pet?.type?.toLowerCase() === 'cat' ? '🐱' : '🐾'}
                            </Text>
                            <View className="flex-1">
                                {order.pets && order.pets.length > 0 ? (
                                    order.pets.map((pet, index) => (
                                        <View key={pet.id || index} className="mb-1">
                                            <Text className="font-medium text-gray-800">{pet.name}</Text>
                                            <Text className="text-xs text-gray-500">
                                                {pet.type} {pet.breed ? `• ${pet.breed}` : ''} {pet.weight ? `• ${pet.weight}kg` : ''}
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <>
                                        <Text className="font-medium text-gray-800">{order.pet_details || order.pet?.name}</Text>
                                        <Text className="text-xs text-gray-500">
                                            {order.pet?.type} {order.pet?.breed ? `• ${order.pet.breed}` : ''} {order.pet?.weight ? `• ${order.pet.weight}kg` : ''}
                                        </Text>
                                    </>
                                )}
                                {order.passengers && (
                                    <Text className="text-xs text-gray-500 mt-1">
                                        {t('passengers_label', { count: order.passengers })}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View className="mb-6 p-4 bg-gray-50 rounded-xl flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                {order.payment_method === 'cash' ? (
                                    <Wallet size={20} color="#3B82F6" />
                                ) : (
                                    <CreditCard size={20} color="#3B82F6" />
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('payment_method')}</Text>
                                <Text className="text-gray-900 font-semibold capitalize">{order.payment_method === 'cash' ? t('cash') : order.payment_method || t('cash')}</Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100' : 'bg-orange-100'}`}>
                                <Text className={`text-xs font-bold ${order.payment_status === 'paid' ? 'text-green-700' : 'text-orange-700'}`}>
                                    {order.payment_status === 'paid' ? t('paid') : t('pending')}
                                </Text>
                            </View>
                        </View>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert(
                                    t('cancel_release_job'),
                                    t('cancel_release_confirm'),
                                    [
                                        { text: t('no'), style: "cancel" },
                                        {
                                            text: t('yes_cancel'),
                                            style: 'destructive',
                                            onPress: async () => {
                                                try {
                                                    await orderService.cancelOrder(order.id, activeJob?.driver?.id);
                                                    setActiveJob(null);
                                                    Alert.alert(t('booking_cancelled'), t('job_released_desc'), [
                                                        { text: t('confirm'), onPress: () => router.replace('/(driver)/(tabs)/home') }
                                                    ]);
                                                } catch (error) {
                                                    Alert.alert(t('error'), t('failed_to_cancel'));
                                                    console.error(error);
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                            className="bg-red-50 p-4 rounded-xl items-center mb-6 border border-red-100"
                        >
                            <Text className="text-red-500 font-bold">{t('cancel_job')}</Text>
                        </TouchableOpacity>

                        <View className="h-24" />
                    </ScrollView>
                </View>

                <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 pb-20">
                    <AppButton
                        title={
                            status === 'accepted' ? t('arrived_at_pickup') :
                                status === 'arrived' ? t('start_traveling') :
                                    order.payment_status === 'paid' ? t('complete_job') : t('complete_collect_payment')
                        }
                        onPress={handleAction}
                        isLoading={isSubmitting}
                        className={status === 'in_progress' ? (order.stops?.some(s => s.status !== 'departed') ? 'bg-orange-500' : 'bg-red-500') : 'bg-green-600'}
                        size="lg"
                    />
                </View>
            </Animated.View >

            {/* PromptPay QR Modal */}
            <Modal
                visible={showQRModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowQRModal(false)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center p-6">
                    <View className="bg-white w-full rounded-3xl p-6 items-center">
                        <View className="w-full flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Scan to Pay (PromptPay)</Text>
                            <TouchableOpacity onPress={() => setShowQRModal(false)}>
                                <XCircle size={28} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6">
                            {isFetchingQR ? (
                                <View style={{ width: 250, height: 250, justifyContent: 'center', alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#3B82F6" />
                                    <Text className="mt-4 text-gray-500">Generating QR Code...</Text>
                                </View>
                            ) : qrCodeUrl ? (
                                <Image
                                    source={{ uri: qrCodeUrl }}
                                    style={{ width: 250, height: 250 }}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={{ width: 250, height: 250, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text className="text-red-500">Failed to load QR</Text>
                                </View>
                            )}
                        </View>

                        <View className="items-center mb-8">
                            <Text className="text-gray-500 mb-1">Total Amount</Text>
                            <Text className="text-3xl font-black text-gray-900">฿{order ? formatPrice(order.price) : '-'}</Text>
                        </View>

                        <Text className="text-gray-400 text-center text-xs mb-6">
                            Please show this QR code to the customer. The screen will automatically update once payment is confirmed.
                        </Text>

                        <AppButton
                            title="Close"
                            variant="secondary"
                            onPress={() => setShowQRModal(false)}
                            className="w-full"
                        />
                    </View>
                </View>
            </Modal>
        </View >
    );
}
