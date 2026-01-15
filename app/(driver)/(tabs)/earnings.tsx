import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp, DollarSign, Car } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';

interface EarningsSummary {
    period: string;
    start_date: string;
    end_date: string;
    total_orders: number;
    total_price: number;
    total_platform_fee: number;
    total_driver_earnings: number;
}

export default function DriverEarningsScreen() {
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEarnings();
    }, [activeTab]);

    const fetchEarnings = async () => {
        setLoading(true);
        try {
            const data = await api.getDriverEarnings(activeTab);
            setEarnings(data);
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPeriodLabel = () => {
        if (activeTab === 'daily') return '24 ชั่วโมงล่าสุด';
        if (activeTab === 'weekly') return '7 วันล่าสุด';
        return '30 วันล่าสุด';
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">สรุปรายได้</Text>
            </View>

            {/* Tabs */}
            <View className="bg-white flex-row border-b border-gray-200">
                <TouchableOpacity
                    onPress={() => setActiveTab('daily')}
                    className={`flex-1 py-4 ${activeTab === 'daily' ? 'border-b-2 border-green-500' : ''}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'daily' ? 'text-green-600' : 'text-gray-400'}`}>
                        รายวัน
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('weekly')}
                    className={`flex-1 py-4 ${activeTab === 'weekly' ? 'border-b-2 border-green-500' : ''}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'weekly' ? 'text-green-600' : 'text-gray-400'}`}>
                        รายสัปดาห์
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('monthly')}
                    className={`flex-1 py-4 ${activeTab === 'monthly' ? 'border-b-2 border-green-500' : ''}`}
                >
                    <Text className={`text-center font-bold ${activeTab === 'monthly' ? 'text-green-600' : 'text-gray-400'}`}>
                        รายเดือน
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00A862" />
                    <Text className="text-gray-500 mt-4">กำลังโหลด...</Text>
                </View>
            ) : earnings ? (
                <ScrollView className="flex-1 p-5">
                    <Text className="text-gray-600 text-sm mb-4 text-center">
                        {formatPeriodLabel()}
                    </Text>

                    {/* Total Orders Card */}
                    <View className="bg-white rounded-xl shadow-sm p-5 mb-4">
                        <View className="flex-row items-center mb-2">
                            <View className="bg-blue-100 p-2 rounded-full mr-3">
                                <Car size={24} color="#3B82F6" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-600 text-sm">จำนวนงาน</Text>
                                <Text className="text-3xl font-bold text-gray-800">
                                    {earnings.total_orders}
                                </Text>
                                <Text className="text-xs text-gray-500">งานที่เสร็จสิ้น</Text>
                            </View>
                        </View>
                    </View>

                    {/* Earnings Breakdown Card */}
                    <View className="bg-white rounded-xl shadow-sm p-5 mb-4">
                        <View className="flex-row items-center mb-4">
                            <View className="bg-green-100 p-2 rounded-full mr-3">
                                <DollarSign size={24} color="#00A862" />
                            </View>
                            <Text className="text-lg font-bold text-gray-800">รายละเอียดรายได้</Text>
                        </View>

                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
                                <Text className="text-gray-600">ราคารวมทั้งหมด</Text>
                                <Text className="text-lg font-semibold text-gray-800">
                                    ฿{formatCurrency(earnings.total_price, 2)}
                                </Text>
                            </View>

                            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
                                <Text className="text-gray-600">ค่าบริการแอพ</Text>
                                <Text className="text-lg font-semibold text-red-600">
                                    -฿{formatCurrency(earnings.total_platform_fee, 2)}
                                </Text>
                            </View>

                            <View className="flex-row justify-between items-center pt-2">
                                <Text className="text-lg font-bold text-gray-800">รายได้สุทธิ</Text>
                                <Text className="text-2xl font-bold text-green-600">
                                    ฿{formatCurrency(earnings.total_driver_earnings, 2)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Average Per Order */}
                    {earnings.total_orders > 0 && (
                        <View className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-5 mb-10">
                            <Text className="text-gray-700 font-bold mb-2">เฉลี่ยต่องาน</Text>
                            <View className="flex-row justify-between">
                                <View>
                                    <Text className="text-xs text-gray-600">ราคารวม</Text>
                                    <Text className="text-lg font-bold text-gray-800">
                                        ฿{formatCurrency(earnings.total_price / earnings.total_orders, 2)}
                                    </Text>
                                </View>
                                <View>
                                    <Text className="text-xs text-gray-600 text-right">รายได้สุทธิ</Text>
                                    <Text className="text-lg font-bold text-green-600 text-right">
                                        ฿{formatCurrency(earnings.total_driver_earnings / earnings.total_orders, 2)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            ) : (
                <View className="flex-1 items-center justify-center p-10">
                    <View className="bg-gray-200 w-20 h-20 rounded-full items-center justify-center mb-4">
                        <TrendingUp size={40} color="gray" />
                    </View>
                    <Text className="text-xl font-bold text-gray-400 text-center">ไม่มีข้อมูล</Text>
                    <Text className="text-gray-500 text-center mt-2">
                        ยังไม่มีงานที่เสร็จสิ้นในช่วงเวลานี้
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}
