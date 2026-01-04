import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { formatPrice } from '../../../../../utils/format';

export function VehicleSelector({
    vehicles,
    selected,
    onSelect,
}: any) {
    return (
        <ScrollView horizontal>
            {vehicles.map((v: any) => (
                <TouchableOpacity
                    key={v.id}
                    onPress={() => onSelect(v)}
                    className={`mr-4 p-4 rounded-xl border ${selected?.id === v.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                        }`}
                >
                    <Text className="font-bold">{v.name}</Text>
                    <Text>฿{formatPrice(v.basePrice)}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}
