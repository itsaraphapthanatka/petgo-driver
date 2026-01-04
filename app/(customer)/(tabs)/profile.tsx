import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/useAuthStore';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LogOut, Globe, ChevronRight, CreditCard } from 'lucide-react-native';

export default function ProfileScreen() {
    const { logout, user } = useAuthStore();
    const { t, i18n } = useTranslation();

    const handleLogout = () => {
        logout();
        router.replace('/(auth)/login');
    };

    const toggleLanguage = () => {
        const nextLanguage = i18n.language === 'en' ? 'th' : 'en';
        i18n.changeLanguage(nextLanguage);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="p-6 bg-white shadow-sm mb-4">
                <Text className="text-2xl font-bold text-gray-900">{t('profile')}</Text>
                <Text className="text-gray-500 mt-1">{user?.full_name || t('home_screen.guest')}</Text>
            </View>

            <ScrollView className="flex-1 px-4">
                {/* Payments */}
                <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                    <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Payments</Text>

                    <TouchableOpacity
                        onPress={() => router.push('/(customer)/payment-methods')}
                        className="flex-row items-center justify-between py-2"
                    >
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center mr-3">
                                <CreditCard size={18} color="#00A862" />
                            </View>
                            <Text className="text-gray-700 font-medium">Payment Methods</Text>
                        </View>
                        <ChevronRight size={20} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>

                {/* Language Setting */}
                <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                    <Text className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Settings</Text>

                    <View className="flex-row items-center justify-between py-2">
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                                <Globe size={18} color="#3B82F6" />
                            </View>
                            <Text className="text-gray-700 font-medium">Language ({(i18n.language || 'th').toUpperCase()})</Text>
                        </View>
                        <TouchableOpacity onPress={toggleLanguage} className="bg-gray-100 px-3 py-1.5 rounded-full">
                            <Text className="text-primary font-semibold">{(i18n.language || 'th') === 'en' ? 'ไทย' : 'English'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity onPress={handleLogout} className="bg-white rounded-xl p-4 shadow-sm flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <View className="w-8 h-8 bg-red-50 rounded-full items-center justify-center mr-3">
                            <LogOut size={18} color="#EF4444" />
                        </View>
                        <Text className="text-red-500 font-medium">Logout</Text>
                    </View>
                    <ChevronRight size={20} color="#D1D5DB" />
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}
