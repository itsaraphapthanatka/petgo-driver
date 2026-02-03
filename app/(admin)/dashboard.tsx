import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { Users, Car, TrendingUp, LogOut, Map as MapIcon } from 'lucide-react-native';
import { AppButton } from '../../components/ui/AppButton';
import { useSettingsStore } from '../../store/useSettingsStore';
import { api } from '../../services/api';

const STATS = [
    { title: "Total Users", value: "1,240", icon: <Users size={24} color="#2962FF" />, bg: "bg-blue-100" },
    { title: "Active Drivers", value: "85", icon: <Car size={24} color="#00C853" />, bg: "bg-green-100" },
    { title: "Revenue (Today)", value: "฿45,200", icon: <TrendingUp size={24} color="#FF9100" />, bg: "bg-orange-100" },
];

// Admin Dashboard Screen
export default function AdminDashboard() {
    const { logout } = useAuthStore();
    const { mapProvider, setMapProvider } = useSettingsStore();

    const handleSetMap = async (provider: 'google' | 'here' | 'longdo') => {
        try {
            await api.updatePricingSettings({ map: provider });
            setMapProvider(provider);
            alert(`Map provider switched to ${provider.toUpperCase()}`);
        } catch (error) {
            alert('Failed to update map settings');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-6 py-4 bg-white shadow-sm flex-row justify-between items-center">
                <View>
                    <Text className="text-xl font-bold text-gray-800">Admin Dashboard</Text>
                    <Text className="text-gray-500 text-sm">Overview</Text>
                </View>
                <TouchableOpacity onPress={logout} className="p-2 bg-gray-100 rounded-full">
                    <LogOut size={20} color="red" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Map Provider Settings */}
                <View className="bg-white p-4 rounded-xl shadow-sm mb-6">
                    <View className="flex-row items-center mb-3">
                        <MapIcon size={20} color="#4B5563" className="mr-2" />
                        <Text className="text-gray-800 font-bold">Map Provider</Text>
                    </View>
                    <View className="flex-row bg-gray-100 p-1 rounded-lg">
                        <TouchableOpacity
                            className={`flex-1 py-2 items-center rounded-md ${mapProvider === 'google' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => handleSetMap('google')}
                        >
                            <Text className={`font-medium ${mapProvider === 'google' ? 'text-blue-600' : 'text-gray-500'}`}>Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 py-2 items-center rounded-md ${mapProvider === 'here' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => handleSetMap('here')}
                        >
                            <Text className={`font-medium ${mapProvider === 'here' ? 'text-blue-600' : 'text-gray-500'}`}>HERE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 py-2 items-center rounded-md ${mapProvider === 'longdo' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => handleSetMap('longdo')}
                        >
                            <Text className={`font-medium ${mapProvider === 'longdo' ? 'text-blue-600' : 'text-gray-500'}`}>Longdo</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap justify-between">
                    {STATS.map((stat, index) => (
                        <View key={index} className="w-[48%] bg-white p-4 rounded-xl shadow-sm mb-4">
                            <View className={`${stat.bg} w-10 h-10 rounded-full items-center justify-center mb-3`}>
                                {stat.icon}
                            </View>
                            <Text className="text-gray-500 text-xs mb-1">{stat.title}</Text>
                            <Text className="text-xl font-bold text-gray-800">{stat.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Recent Activity */}
                <Text className="text-lg font-bold text-gray-800 mb-4 mt-2">Recent Bookings</Text>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row justify-between items-center">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                                <Text>🐶</Text>
                            </View>
                            <View>
                                <Text className="font-semibold text-gray-800">Booking #{1000 + i}</Text>
                                <Text className="text-xs text-green-600">Completed • 2 mins ago</Text>
                            </View>
                        </View>
                        <Text className="font-bold">฿150</Text>
                    </View>
                ))}

            </ScrollView>
        </SafeAreaView>
    );
}
