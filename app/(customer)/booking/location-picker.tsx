import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, FlatList, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Region, PROVIDER_GOOGLE } from 'react-native-maps';
import MapView from 'react-native-maps';
import { AppMapView } from '../../../components/AppMapView';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useBookingStore } from '../../../store/useBookingStore';
import { ArrowLeft, MapPin, Navigation, Search as SearchIcon, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../../components/ui/AppButton';
import { longdoMapApi, LongdoSearchResult } from '../../../services/longdoMapApi';
import debounce from 'lodash/debounce';

export default function LocationPickerScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const mode = params.mode as string;

    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState<Region>({
        latitude: 13.7563, // Default Bangkok
        longitude: 100.5018,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    const [address, setAddress] = useState<string>('');
    const [loadingAddress, setLoadingAddress] = useState<boolean>(false);
    const [initialLocationSet, setInitialLocationSet] = useState<boolean>(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<LongdoSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const LONGDO_API_KEY = process.env.EXPO_PUBLIC_LONGDO_MAP_API_KEY || '';

    const {
        setPickupLocation,
        setDropoffLocation,
        pickupLocation,
        dropoffLocation,
        stops,
        addStop,
        updateStop
    } = useBookingStore();

    const fetchAddress = async (latitude: number, longitude: number) => {
        setLoadingAddress(true);
        try {
            const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geocode.length > 0) {
                const item = geocode[0];
                const formattedAddress = [
                    item.name,
                    item.street,
                    item.district,
                    item.subregion,
                    item.region
                ].filter(Boolean).join(', ');
                setAddress(formattedAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            } else {
                setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
        } catch (error) {
            console.error(error);
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
            setLoadingAddress(false);
        }
    };

    const handleRegionChangeComplete = (newRegion: Region) => {
        setRegion(newRegion);
        // Debounce or just call it 
        fetchAddress(newRegion.latitude, newRegion.longitude);
    };

    // Initialize map position
    useEffect(() => {
        (async () => {
            let startLat = 13.7563;
            let startLng = 100.5018;

            // 1. Try to use existing store location if available
            if (mode === 'pickup' && pickupLocation) {
                startLat = pickupLocation.latitude;
                startLng = pickupLocation.longitude;
            } else if (mode === 'dropoff' && dropoffLocation) {
                startLat = dropoffLocation.latitude;
                startLng = dropoffLocation.longitude;
            } else if (mode.startsWith('stop_')) {
                const index = parseInt(mode.split('_')[1]);
                if (stops[index]) {
                    startLat = stops[index].latitude;
                    startLng = stops[index].longitude;
                }
            }
            // 2. If no store location, try current location (default behavior)
            else {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({});
                        startLat = location.coords.latitude;
                        startLng = location.coords.longitude;
                    }
                } catch (e) {
                    console.warn("Could not get current location", e);
                }
            }

            setRegion({
                latitude: startLat,
                longitude: startLng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
            setInitialLocationSet(true);

            // Initial Reverse Geocode
            fetchAddress(startLat, startLng);
        })();
    }, []);

    const handleConfirm = () => {
        const locationData = {
            name: address.split(',')[0], // Simple name extraction
            address: address,
            latitude: region.latitude,
            longitude: region.longitude
        };

        if (mode === 'pickup') {
            setPickupLocation(locationData);
        } else if (mode === 'dropoff') {
            setDropoffLocation(locationData);
        } else if (mode === 'add_stop') {
            addStop(locationData);
        } else if (mode.startsWith('stop_')) {
            const index = parseInt(mode.split('_')[1]);
            updateStop(index, locationData);
        }
        router.back();
    };

    const handleCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({});
            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };

            mapRef.current?.animateToRegion(newRegion);
            setRegion(newRegion);
            fetchAddress(newRegion.latitude, newRegion.longitude);
        } catch (error) {
            Alert.alert(t('error'), t('could_not_get_location'));
        }
    };

    // --- Search Logic ---
    const performSearch = useCallback(
        debounce(async (text: string) => {
            if (!text.trim()) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const results = await longdoMapApi.search(text, LONGDO_API_KEY);
                setSearchResults(results);
            } catch (error) {
                console.error('Search failed:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500),
        []
    );

    const handleSearchTextChange = (text: string) => {
        setSearchQuery(text);
        performSearch(text);
    };

    const handleSelectSearchResult = (item: LongdoSearchResult) => {
        Keyboard.dismiss();
        setSearchQuery('');
        setSearchResults([]);

        if (isNaN(item.latitude) || isNaN(item.longitude)) {
            console.warn("Invalid search result coordinates", item);
            return;
        }

        const newRegion = {
            latitude: item.latitude,
            longitude: item.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };

        if (mapRef.current) {
            mapRef.current.animateToRegion(newRegion);
        }
        setRegion(newRegion);
        // fetchAddress will be triggered by onRegionChangeComplete
        // but we can also set the address immediately to the search result name for better UX
        setAddress(item.name);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        Keyboard.dismiss();
    };

    if (!initialLocationSet) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <AppMapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={region}
                onRegionChangeComplete={handleRegionChangeComplete}
                onPanDrag={() => Keyboard.dismiss()}
            >
            </AppMapView>

            {/* Fixed Center Pin */}
            <View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center pointer-events-none" pointerEvents="none">
                <View style={{ transform: [{ translateY: -20 }] }}>
                    <MapPin size={40} color={mode === 'pickup' ? '#3B82F6' : '#EF4444'} fill={mode === 'pickup' ? '#3B82F6' : '#EF4444'} />
                </View>
            </View>

            {/* Header / Back Button / Search Input */}
            <View className="absolute top-20 left-5 right-5 z-20 flex-row items-start" pointerEvents="box-none">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-white p-3 rounded-full shadow-md mr-3 mt-1"
                >
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>

                {/* Search Container */}
                <View className="flex-1">
                    <View className="bg-white flex-row items-center p-3 rounded-xl shadow-md">
                        <View className={`w-3 h-3 rounded-full mr-3 ${mode === 'pickup' ? 'bg-blue-500' : 'bg-red-500'}`} />
                        <TextInput
                            className="flex-1 font-medium text-gray-800 p-0 m-0 leading-5 h-6"
                            placeholder={mode === 'pickup' ? t('search_pickup') : t('search_dropoff')}
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={handleSearchTextChange}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={clearSearch}>
                                <X size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        ) : (
                            <SearchIcon size={20} color="#9CA3AF" />
                        )}
                    </View>

                    {/* Search Results Dropdown */}
                    {(searchResults.length > 0 || isSearching) && searchQuery.length > 0 && (
                        <View className="absolute top-14 left-0 right-0 bg-white rounded-xl shadow-lg max-h-60 overflow-hidden">
                            {isSearching ? (
                                <View className="p-4 items-center">
                                    <ActivityIndicator size="small" color="#3B82F6" />
                                </View>
                            ) : (
                                <FlatList
                                    data={searchResults}
                                    keyExtractor={(item) => item.id}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onPress={() => handleSelectSearchResult(item)}
                                            className="custom-border-b border-gray-100 p-3 flex-row items-center active:bg-gray-50 bg-white"
                                            style={{ borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                                        >
                                            <MapPin size={16} color="#6B7280" className="mr-2" />
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
                                                <Text className="text-xs text-gray-500" numberOfLines={1}>{item.address}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Current Location Button */}
            <View className="absolute right-5 bottom-48 z-10">
                <TouchableOpacity
                    onPress={handleCurrentLocation}
                    className="bg-white p-3 rounded-full shadow-md"
                >
                    <Navigation size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet for Address & Confirm */}
            <View className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-xl z-20">
                <Text className="text-gray-500 mb-1 text-xs uppercase font-bold tracking-wider">
                    {mode === 'pickup' ? t('pickup_location') : t('dropoff_location')}
                </Text>

                <View className="flex-row items-start mb-6">
                    <View className="mt-1 mr-3">
                        <MapPin size={24} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                        {loadingAddress ? (
                            <ActivityIndicator size="small" color="gray" style={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <Text className="text-lg font-semibold text-gray-900 leading-6">
                                {address}
                            </Text>
                        )}
                    </View>
                </View>

                <AppButton
                    title={t('confirm_location')}
                    onPress={handleConfirm}
                    disabled={loadingAddress}
                />
            </View>
        </View>
    );
}
