import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import MapView from 'react-native-maps';
import { PetGoCarIcon } from '../../../components/icons/PetGoCarIcon';


import { AppMapView } from '../../../components/AppMapView';
import { Search, MapPin, Bike, Car, Truck, Menu, Bell, Locate, Plus, Minus } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuthStore } from '../../../store/useAuthStore';
import { MOCK_RIDE_OPTIONS } from '../../../utils/mockData';
import { router } from 'expo-router';
import { api, DriverLocation } from '../../../services/api';
import { orderService } from '../../../services/orderService';

import { LocationSearch, SearchResult } from '../../../components/LocationSearch';
import { longdoMapApi } from '../../../services/longdoMapApi';
import { hereMapApi, LatLng, HereRouteSegment } from '../../../services/hereMapApi';
import { useBookingStore } from '../../../store/useBookingStore';




const HERE_MAPS_API_KEY = "z8S6QWJ90hW5peIMiwDk9sCdlKEPj7cYiZz0fdoAbxU";

export default function CustomerHome() {



    const { user } = useAuthStore();
    console.log("userdddd", user);
    const { t } = useTranslation();
    const mapRef = React.useRef<MapView>(null);
    const [driverLocations, setDriverLocations] = React.useState<DriverLocation[]>([]);

    // Booking Store
    const {
        setDropoffLocation,
        setPickupLocation,
        pickupLocation,
        dropoffLocation,
        stops
    } = useBookingStore();

    const [routeCoordinates, setRouteCoordinates] = React.useState<LatLng[]>([]);
    const [routeSegments, setRouteSegments] = React.useState<HereRouteSegment[]>([]);



    // Local Search State
    const [pickupQuery, setPickupQuery] = React.useState('');
    const [dropoffQuery, setDropoffQuery] = React.useState('');
    const [activeField, setActiveField] = React.useState<'pickup' | 'dropoff'>('dropoff'); // Default to dropoff
    const [loading, setLoading] = React.useState(false);
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [region, setRegion] = React.useState({
        latitude: 13.7563,
        longitude: 100.5018,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const LONGDO_API_KEY = process.env.EXPO_PUBLIC_LONGDO_MAP_API_KEY || '';

    // Initialize pickup with current location and check for active order
    React.useEffect(() => {
        (async () => {
            // 1. Check for Active Order
            if (user?.id) {
                const activeOrder = await orderService.getActiveOrder();
                if (activeOrder) {
                    console.log("Found active order:", activeOrder.id);

                    // Hydrate Store
                    setPickupLocation({
                        name: activeOrder.pickup_address,
                        address: activeOrder.pickup_address,
                        latitude: activeOrder.pickup_lat,
                        longitude: activeOrder.pickup_lng
                    });
                    setDropoffLocation({
                        name: activeOrder.dropoff_address,
                        address: activeOrder.dropoff_address,
                        latitude: activeOrder.dropoff_lat,
                        longitude: activeOrder.dropoff_lng
                    });

                    // Redirect to Confirm Screen with orderId
                    router.push({
                        pathname: '/(customer)/booking/confirm',
                        params: { orderId: activeOrder.id }
                    });
                    return; // Stop further initialization
                }
            }

            // 2. Basic permission check & current location (only if no active order)
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted' && !pickupLocation) {
                const location = await Location.getCurrentPositionAsync({});

                // Use reverse geocoding to get actual address
                const { reverseGeocode } = await import('../../../services/geocodingService');
                const address = await reverseGeocode(
                    location.coords.latitude,
                    location.coords.longitude
                );

                setPickupLocation({
                    name: address,
                    address: address,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                setPickupQuery(address);
            }
        })();
    }, [user?.id]); // Add user?.id dependency

    // Sync local state with Booking Store (When returning from Map Picker)
    React.useEffect(() => {
        if (pickupLocation) {
            setPickupQuery(pickupLocation.name || pickupLocation.address || '');
        }
        if (dropoffLocation) {
            setDropoffQuery(dropoffLocation.name || dropoffLocation.address || '');
        }
    }, [pickupLocation, dropoffLocation]);

    // Debounced Search
    React.useEffect(() => {
        const query = activeField === 'pickup' ? pickupQuery : dropoffQuery;

        const searchPlaces = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const longdoResults = await longdoMapApi.search(query, LONGDO_API_KEY);
                const mappedResults: SearchResult[] = longdoResults.map(item => ({
                    id: item.id,
                    name: item.name,
                    address: item.address,
                    latitude: item.latitude,
                    longitude: item.longitude
                }));
                setResults(mappedResults);
            } catch (error) {
                console.error('Longdo search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            searchPlaces();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [pickupQuery, dropoffQuery, activeField]);

    // Fetch Route when both locations are set
    React.useEffect(() => {
        const fetchRoute = async () => {
            if (pickupLocation && dropoffLocation) {
                const origin: LatLng = { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude };
                const destination: LatLng = { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude };

                // Extract coordinates from stops
                const stopCoords: LatLng[] = stops.map(s => ({ latitude: s.latitude, longitude: s.longitude }));

                // Use getHereRoute as it seems simpler for A to B, or getRoutes
                // Force traffic mode: 'car' usually implies traffic consideration in HERE API if not disabled
                const routes = await hereMapApi.getRoutes(origin, destination, stopCoords, 'car', HERE_MAPS_API_KEY);


                if (routes.length > 0 && routes[0].coordinates && routes[0].coordinates.length > 0) {
                    setRouteCoordinates(routes[0].coordinates);
                    setRouteSegments(routes[0].segments);

                    // Fit map to route
                    if (mapRef.current) {
                        mapRef.current.fitToCoordinates(routes[0].coordinates, {
                            edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
                            animated: true
                        });
                    }
                }
            } else {
                setRouteCoordinates([]);
                setRouteSegments([]);
            }
        };
        fetchRoute();
    }, [pickupLocation, dropoffLocation, stops]);


    const handleSelectLocation = (item: SearchResult) => {
        if (activeField === 'pickup') {
            setPickupLocation({
                name: item.name,
                address: item.address,
                latitude: item.latitude,
                longitude: item.longitude
            });
            setPickupQuery(item.name);
            // Auto focus to dropoff
            setActiveField('dropoff');

            // Animate Map
            mapRef.current?.animateToRegion({
                latitude: item.latitude,
                longitude: item.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });

        } else {
            setDropoffLocation({
                name: item.name,
                address: item.address,
                latitude: item.latitude,
                longitude: item.longitude
            });
            setDropoffQuery(item.name);
            setResults([]); // Clear results

            // Animate Map
            mapRef.current?.animateToRegion({
                latitude: item.latitude,
                longitude: item.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
        setResults([]);
    };


    React.useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            if (location && mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        })();

        const fetchDrivers = async () => {
            try {
                const drivers = await api.getDriverLocations();
                setDriverLocations(drivers);
            } catch (error) {
                console.log("Error fetching drivers", error);
            }
        };

        fetchDrivers();
        const interval = setInterval(fetchDrivers, 10000); // Pool every 10s
        return () => clearInterval(interval);
    }, []);

    const handleCurrentLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        if (location && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const handleZoomIn = async () => {
        if (mapRef.current) {
            const camera = await mapRef.current.getCamera();
            if (camera) {
                camera.zoom = (camera.zoom || 15) + 1;
                mapRef.current.animateCamera(camera);
            }
        }
    };

    const handleZoomOut = async () => {
        if (mapRef.current) {
            const camera = await mapRef.current.getCamera();
            if (camera) {
                camera.zoom = (camera.zoom || 15) - 1;
                mapRef.current.animateCamera(camera);
            }
        }
    };

    return (
        <View className="flex-1 bg-white">
            <AppMapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                onRegionChangeComplete={setRegion}
            >
                {/* Pickup Marker */}
                {pickupLocation && (
                    <Marker
                        coordinate={{ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }}
                        title={t('pickup')}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View className="bg-blue-500 p-1.5 rounded-full border border-white shadow-sm">
                            <MapPin size={16} color="white" />
                        </View>
                    </Marker>
                )}

                {/* Dropoff Marker */}
                {dropoffLocation && (
                    <Marker
                        coordinate={{ latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude }}
                        title={t('drop_off')}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View className="bg-red-500 p-1.5 rounded-full border border-white shadow-sm">
                            <MapPin size={16} color="white" />
                        </View>
                    </Marker>
                )}

                {/* Stops Markers */}
                {stops.map((stop, index) => (
                    <Marker
                        key={`stop-${index}`}
                        coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                        title={stop.name || `Stop ${index + 1}`}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View className="bg-orange-500 p-1.5 rounded-full border border-white shadow-sm">
                            <MapPin size={16} color="white" />
                        </View>
                    </Marker>
                ))}

                {/* Route Rendering: Single Layer Traffic Segments */}
                {/* User requested "Do it on the destination line", implying no separate border/casing */}

                {routeSegments.length > 0 ? (
                    routeSegments.map((segment, index) => (
                        <Polyline
                            key={`segment-${index}`}
                            coordinates={segment.coordinates}
                            strokeColor={segment.color}
                            strokeWidth={10}
                            lineCap="round"
                            lineJoin="round"
                            zIndex={10}
                        />
                    ))
                ) : (
                    /* Fallback only if no segments found (Should be rare) */
                    routeCoordinates.length > 0 && (
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#9CA3AF" // Gray-400 to indicate "No Traffic Data"
                            strokeWidth={7}
                            lineCap="round"
                            lineJoin="round"
                            zIndex={10}
                        />
                    )
                )}

                {/* Driver Markers - Filtered by Viewport Radius */}
                {driverLocations.filter(driver => {
                    const latOk = Math.abs(driver.lat - region.latitude) <= region.latitudeDelta / 1.5;
                    const lngOk = Math.abs(driver.lng - region.longitude) <= region.longitudeDelta / 1.5;
                    return latOk && lngOk;
                }).map((driver) => (
                    <Marker
                        key={`driver-${driver.id}`}
                        coordinate={{ latitude: driver.lat, longitude: driver.lng }}
                        title={driver.driver?.user?.full_name || "Driver"}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <PetGoCarIcon width={24} height={48} />
                    </Marker>
                ))}

            </AppMapView>

            <SafeAreaView className="absolute top-0 w-full px-5 pt-12 flex-row justify-between items-center z-10">
                <View className="flex-row items-center bg-white/90 p-2 pr-4 rounded-full shadow-md backdrop-blur-md">
                    <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-2">
                        <Text className="text-lg">👤</Text>
                    </View>
                    <View>
                        <Text className="text-xs text-gray-500">{t('home_screen.good_morning')}</Text>
                        <Text className="text-sm font-bold text-gray-800">{user?.full_name || t('home_screen.guest')}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="bg-white p-2.5 rounded-full shadow-md"
                    onPress={() => router.push('/(customer)/notifications')}
                >
                    <Bell size={20} color="black" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Zoom Controls */}
            <View className="absolute right-5 bottom-[150px] z-50 flex-col gap-2">
                <TouchableOpacity
                    onPress={handleZoomIn}
                    className="bg-white p-3 rounded-full shadow-md elevation-5"
                >
                    <Plus size={24} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleZoomOut}
                    className="bg-white p-3 rounded-full shadow-md elevation-5"
                >
                    <Minus size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Current Location Button */}
            <TouchableOpacity
                onPress={handleCurrentLocation}
                className="absolute right-5 bottom-[100px] bg-white p-3 rounded-full shadow-md z-50 elevation-5"
            >
                <Locate size={24} color="#374151" />
            </TouchableOpacity>

            {/* Location Search Component - Replaces Navigation Button */}
            <LocationSearch
                pickupQuery={pickupQuery}
                setPickupQuery={setPickupQuery}
                dropoffQuery={dropoffQuery}
                setDropoffQuery={setDropoffQuery}
                activeField={activeField}
                setActiveField={setActiveField}
                results={results}
                loading={loading}
                onSelectLocation={handleSelectLocation}
            />

            {/* Show Next Button only when both locations are selected */}
            {pickupLocation && dropoffLocation && (
                <View className="absolute bottom-10 w-full px-5 z-50">
                    <TouchableOpacity
                        onPress={() => router.push('/(customer)/booking/select-pet')}
                        className="bg-primary p-4 rounded-xl shadow-lg flex-row justify-center items-center"
                        style={{ backgroundColor: '#00A862' }} // Using primary color directly if tailwind config not fully loaded or for visual guarantee
                    >
                        <Text className="text-white font-bold text-lg">{t('continue') || 'Continue'}</Text>
                        {/* <Car size={20} color="white" style={{ marginLeft: 8 }} /> */}
                    </TouchableOpacity>
                </View>
            )}


            {/* Removed the panel that triggers router push */}

        </View>
    );
}
