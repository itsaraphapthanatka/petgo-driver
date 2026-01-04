import React from 'react';
import { View, Text } from 'react-native';
import { AppButton } from '../../../../../components/ui/AppButton';
import { formatPrice } from '../../../../../utils/format';
export function BookingBottomSheet({
    distance,
    duration,
    price,
    loading,
    onConfirm,
    children,
}: any) {
    return (
        <View className="flex-1">
            <Text className="text-2xl font-bold">Confirm Booking</Text>
            <Text className="text-gray-500">
                {distance.toFixed(1)} km • {Math.ceil(duration)} min
            </Text>

            {children}

            <View className="pt-4 border-t">
                <Text className="text-xl font-bold mb-2">
                    {loading ? 'Loading...' : `฿${formatPrice(price)}`}
                </Text>
                <AppButton title="Confirm Booking" onPress={onConfirm} />
            </View>
        </View>
    );
}
