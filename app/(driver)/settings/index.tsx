import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, MapPin, Building2, Bell, Shield, ArrowLeft } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function SettingsMenuScreen() {
    const router = useRouter();

    const menuItems = [
        {
            id: 'radius',
            label: 'ขอบเขตการรับงาน',
            icon: MapPin,
            onPress: () => router.push('/(driver)/settings/radius'),
        },
        {
            id: 'bank',
            label: 'ข้อมูลบัญชีธนาคาร',
            icon: Building2,
            onPress: () => router.push('/(driver)/settings/bank'),
        },
        {
            id: 'notifications',
            label: 'การแจ้งเตือน',
            icon: Bell,
            onPress: () => router.setParams({ from: 'settings' }), // Placeholder if needed
            disabled: true,
        },
        {
            id: 'privacy',
            label: 'ความเป็นส่วนตัว',
            icon: Shield,
            disabled: true,
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">การตั้งค่า</Text>
            </View>

            <ScrollView className="flex-1">
                <View className="bg-white mt-4 border-t border-b border-gray-100">
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={item.onPress}
                            disabled={item.disabled}
                            className={`flex-row items-center p-4 ${index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''} ${item.disabled ? 'opacity-40' : ''}`}
                        >
                            <View className="bg-gray-50 p-2 rounded-full mr-4">
                                <item.icon size={20} color={item.disabled ? '#9CA3AF' : '#00C853'} />
                            </View>
                            <Text className="flex-1 text-gray-700 font-medium">{item.label}</Text>
                            {!item.disabled && <ChevronRight size={20} color="#9CA3AF" />}
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="p-4">
                    <Text className="text-gray-400 text-xs text-center">
                        Version 1.2.0 (DEBUG)
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
