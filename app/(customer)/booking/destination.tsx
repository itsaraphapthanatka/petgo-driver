import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInput } from '../../../components/ui/AppInput';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { useBookingStore } from '../../../store/useBookingStore';
import { useTranslation } from 'react-i18next';

export default function DestinationScreen() {
    const { pickupLocation, dropoffLocation, setPickupLocation, setDropoffLocation } = useBookingStore();
    const { t } = useTranslation();

    // Initialize pickup with current location if not set
    useFocusEffect(
        useCallback(() => {
            (async () => {
                if (!pickupLocation) {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({});
                        // Use Google reverse geocoding for better address
                        let address = 'ตำแหน่งปัจจุบัน';
                        try {
                            const { reverseGeocode } = await import('../../../services/geocodingService');
                            address = await reverseGeocode(
                                location.coords.latitude,
                                location.coords.longitude
                            );
                        } catch (e) {
                            console.warn('Reverse geocoding failed, using fallback', e);
                        }

                        setPickupLocation({
                            name: address,
                            address: address,
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude
                        });
                    }
                }
            })();
        }, [])
    );

    const handleInputPress = (mode: 'pickup' | 'dropoff') => {
        router.push({
            pathname: '/(customer)/booking/location-search',
            params: { mode }
        });
    };

    const handleConfirm = () => {
        if (pickupLocation && dropoffLocation) {
            router.push('/(customer)/booking/select-pet');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-2">
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>

                <View>
                    {/* Pickup Input */}
                    <TouchableOpacity onPress={() => handleInputPress('pickup')} className="flex-row items-center mb-4">
                        <View className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                        <View className="flex-1" pointerEvents="none">
                            <AppInput
                                placeholder={t('current_location')}
                                value={pickupLocation?.name || pickupLocation?.address || ''}
                                editable={false}
                                containerClassName="mb-0 flex-1"
                                inputContainerClassName="border-gray-100"
                                className="bg-gray-50 text-black"
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Dropoff Input */}
                    <TouchableOpacity onPress={() => handleInputPress('dropoff')} className="flex-row items-center">
                        <View className="w-3 h-3 bg-red-500 rounded-sm mr-3" />
                        <View className="flex-1" pointerEvents="none">
                            <AppInput
                                placeholder={t('where_to')}
                                value={dropoffLocation?.name || dropoffLocation?.address || ''}
                                editable={false}
                                containerClassName="mb-0 flex-1"
                                inputContainerClassName="border-gray-100"
                                className="bg-gray-50 text-black"
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Confirm Button (Only visible if both set) */}
            {pickupLocation && dropoffLocation && (
                <View className="p-5 mt-auto">
                    <TouchableOpacity
                        onPress={handleConfirm}
                        className="bg-blue-500 p-4 rounded-xl items-center"
                    >
                        <Text className="text-white font-bold text-lg">{t('next')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
