import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '../../../components/ui/AppInput';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useBookingStore } from '../../../store/useBookingStore';
import { useTranslation } from 'react-i18next';
import { longdoMapApi } from '../../../services/longdoMapApi';

type SearchResult = {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
};

export default function DestinationScreen() {
    const [pickupQuery, setPickupQuery] = useState('');
    const [dropoffQuery, setDropoffQuery] = useState('');
    const [activeField, setActiveField] = useState<'pickup' | 'dropoff'>('dropoff');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const { setDropoffLocation, setPickupLocation, pickupLocation } = useBookingStore();
    const { t } = useTranslation();

    const LONGDO_API_KEY = process.env.EXPO_PUBLIC_LONGDO_MAP_API_KEY || 'YOUR_LONGDO_MAP_API_KEY';

    // Initialize pickup with current location or existing store value
    useEffect(() => {
        (async () => {
            // Permission check can happen here or assume it's done/handled globally
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                // Alert.alert('Permission to access location was denied'); // Optional: Too noisy if just browsing
                return;
            }

            if (!pickupLocation) {
                const location = await Location.getCurrentPositionAsync({});
                // Reverse geocode or just use "Current Location" for now, allowing user to edit
                // For better UX, we could try to reverse geocode here using Longdo or Expo
                const initialName = t('current_location');
                setPickupLocation({
                    name: initialName,
                    address: 'Current Location',
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                setPickupQuery(initialName);
            } else {
                setPickupQuery(pickupLocation.name || '');
            }
        })();
    }, []);

    // Debounced Search Effect
    useEffect(() => {
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

    const handleSelectLocation = (item: SearchResult) => {
        if (activeField === 'pickup') {
            setPickupLocation({
                name: item.name,
                address: item.address,
                latitude: item.latitude,
                longitude: item.longitude
            });
            setPickupQuery(item.name);
            // Auto-focus dropoff after picking pickup
            setActiveField('dropoff');
        } else {
            setDropoffLocation({
                name: item.name,
                address: item.address,
                latitude: item.latitude,
                longitude: item.longitude
            });
            setDropoffQuery(item.name);
            router.push('/(customer)/booking/select-pet');
        }
        // Clear results for the next interaction (optional, or keep them)
        setResults([]);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-2">
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>

                <View>
                    {/* Pickup Input */}
                    <View className="flex-row items-center mb-4">
                        <View className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                        <AppInput
                            placeholder={t('current_location')}
                            value={pickupQuery}
                            onChangeText={setPickupQuery}
                            onFocus={() => setActiveField('pickup')}
                            containerClassName="mb-0 flex-1"
                            inputContainerClassName={activeField === 'pickup' ? 'border-blue-500' : 'border-gray-100'}
                            className="bg-gray-50"
                        />
                    </View>

                    {/* Dropoff Input */}
                    <View className="flex-row items-center">
                        <View className="w-3 h-3 bg-red-500 rounded-sm mr-3" />
                        <AppInput
                            placeholder={t('where_to')}
                            value={dropoffQuery}
                            onChangeText={setDropoffQuery}
                            onFocus={() => setActiveField('dropoff')}
                            containerClassName="mb-0 flex-1"
                            inputContainerClassName={activeField === 'dropoff' ? 'border-blue-500' : 'border-gray-100'}
                            autoFocus={true} // Default focus on dropoff
                        />
                    </View>
                </View>
            </View>

            <View className="flex-1 mt-6 border-t border-gray-100">
                {loading ? (
                    <View className="p-4">
                        <ActivityIndicator color="gray" />
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={item => item.id}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={() => {
                            const currentQuery = activeField === 'pickup' ? pickupQuery : dropoffQuery;
                            return (
                                <View className="p-4 items-center">
                                    <Text className="text-gray-400">
                                        {currentQuery ? t('no_location_found') : (activeField === 'pickup' ? t('enter_pickup') : t('enter_destination'))}
                                    </Text>
                                </View>
                            );
                        }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="flex-row items-center p-4 border-b border-gray-50"
                                onPress={() => handleSelectLocation(item)}
                            >
                                <View className="bg-gray-100 p-2 rounded-full mr-4">
                                    <MapPin size={20} color="gray" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-800 text-base">{item.name}</Text>
                                    <Text className="text-gray-500 text-xs">{item.address}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
