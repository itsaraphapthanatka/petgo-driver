import React from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { AppInput } from './ui/AppInput';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

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

    return (
        <View className="absolute top-14 w-full px-5 z-20">
            <View className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <View className="p-4">
                    {/* Pickup Input */}
                    <View className="flex-row items-center mb-3">
                        <View className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                        <AppInput
                            placeholder={t('current_location')}
                            value={pickupQuery}
                            onChangeText={setPickupQuery}
                            onFocus={() => setActiveField('pickup')}
                            containerClassName="mb-0 flex-1 h-10"
                            inputContainerClassName={activeField === 'pickup' ? 'border-blue-500' : 'border-gray-100'}
                            className="bg-gray-50 text-sm"
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
                            containerClassName="mb-0 flex-1 h-10"
                            inputContainerClassName={activeField === 'dropoff' ? 'border-blue-500' : 'border-gray-100'}
                            className="bg-gray-50 text-sm"
                        />
                    </View>
                </View>

                {/* Results List */}
                {(activeField && (pickupQuery || dropoffQuery)) && (
                    <View className="max-h-60 border-t border-gray-100">
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
                                    if (!pickupQuery && activeField === 'pickup') return null;
                                    if (!dropoffQuery && activeField === 'dropoff') return null;
                                    return (
                                        <View className="p-4 items-center">
                                            <Text className="text-gray-400 text-sm">
                                                {t('no_location_found')}
                                            </Text>
                                        </View>
                                    );
                                }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        className="flex-row items-center p-3 border-b border-gray-50 active:bg-gray-50"
                                        onPress={() => onSelectLocation(item)}
                                    >
                                        <View className="bg-gray-100 p-1.5 rounded-full mr-3">
                                            <MapPin size={16} color="gray" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>{item.name}</Text>
                                            <Text className="text-gray-500 text-xs" numberOfLines={1}>{item.address}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};
