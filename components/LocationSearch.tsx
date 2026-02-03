import React from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { AppInput } from './ui/AppInput';
import { MapPin, Plus, Trash2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useBookingStore } from '../store/useBookingStore';

export type SearchResult = {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
};

interface LocationSearchProps {
    pickupQuery: string;
    setPickupQuery: (text: string) => void;
    dropoffQuery: string;
    setDropoffQuery: (text: string) => void;
    activeField: 'pickup' | 'dropoff';
    setActiveField: (field: 'pickup' | 'dropoff') => void;
    results: SearchResult[];
    loading: boolean;
    onSelectLocation: (item: SearchResult) => void;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
    pickupQuery,
    setPickupQuery,
    dropoffQuery,
    setDropoffQuery,
    activeField,
    setActiveField,
    results,
    loading,
    onSelectLocation
}) => {
    const { t } = useTranslation();
    const { stops, removeStop } = useBookingStore();

    const handleInputPress = (mode: string) => {
        router.push({
            pathname: '/(customer)/booking/location-picker',
            params: { mode }
        });
    };

    return (
        <View className="absolute top-14 w-full px-5 z-20">
            <View className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <View className="p-4">
                    {/* Pickup Input */}
                    <TouchableOpacity onPress={() => handleInputPress('pickup')} className="flex-row items-center mb-3">
                        <View className="w-8 items-center justify-center mr-2">
                            <View className="w-3 h-3 bg-blue-500 rounded-full" />
                        </View>
                        <View className="flex-1" pointerEvents="none">
                            <AppInput
                                placeholder={t('current_location')}
                                value={pickupQuery}
                                editable={false}
                                containerClassName="mb-0 flex-1 h-10"
                                inputContainerClassName="border-gray-100"
                                className="bg-gray-50 text-sm"
                            />
                        </View>
                    </TouchableOpacity>

                    {/* Stops List */}
                    {stops.map((stop, index) => (
                        <View key={`stop-${index}`} className="flex-row items-center mb-3">
                            <View className="w-8 items-center justify-center mr-2">
                                <View className="w-3 h-3 bg-orange-400 rounded-full" />
                            </View>
                            <TouchableOpacity
                                onPress={() => handleInputPress(`stop_${index}`)}
                                className="flex-1 flex-row items-center bg-gray-50 border border-gray-100 rounded-lg h-10 px-3 mr-2"
                            >
                                <Text numberOfLines={1} className="flex-1 text-sm text-gray-800">
                                    {stop.name || stop.address || t('select_location')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => removeStop(index)}
                                className="p-2"
                            >
                                <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Add Stop Button */}
                    <TouchableOpacity
                        onPress={() => handleInputPress('add_stop')}
                        className="flex-row items-center ml-10 mb-3"
                    >
                        <Plus size={16} color="#3B82F6" />
                        <Text className="text-blue-500 text-sm font-medium ml-2">{t('เพิ่มจุดแวะ') || 'Add Stop'}</Text>
                    </TouchableOpacity>

                    {/* Dropoff Input */}
                    <TouchableOpacity onPress={() => handleInputPress('dropoff')} className="flex-row items-center">
                        <View className="w-8 items-center justify-center mr-2">
                            <View className="w-3 h-3 bg-red-500 rounded-sm" />
                        </View>
                        <View className="flex-1" pointerEvents="none">
                            <AppInput
                                placeholder={t('where_to')}
                                value={dropoffQuery}
                                editable={false}
                                containerClassName="mb-0 flex-1 h-10"
                                inputContainerClassName="border-gray-100"
                                className="bg-gray-50 text-sm"
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
