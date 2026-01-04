import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

export function RouteSelector({
    routes,
    selectedIndex,
    onSelect,
}: any) {
    if (routes.length <= 1) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {routes.map((r: any, i: number) => (
                <TouchableOpacity
                    key={i}
                    onPress={() => onSelect(i)}
                    className={`mr-3 p-4 rounded-xl border ${i === selectedIndex
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                >
                    <Text className="font-bold">Route {i + 1}</Text>
                    <Text>{(r.distance / 1000).toFixed(1)} km</Text>
                    <Text>{Math.ceil(r.duration / 60)} min</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}
