import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, CheckCircle, XCircle, Car } from 'lucide-react-native';
import { router } from 'expo-router';
import { orderService } from '../../../services/orderService';
import { Order } from '../../../types/order';
import { formatCurrency, formatPrice } from '../../../utils/format';

export default function CustomerHistoryScreen() {
    const [activeTab, setActiveTab] = useState<'completed' | 'cancelled'>('completed');
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
    const [cancelledOrders, setCancelledOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const allOrders = await orderService.getOrders();

            // Filter completed and cancelled orders
            // The backend already filters by user_id for customers now
            const completed = allOrders.filter(order => order.status === 'completed');
            const cancelled = allOrders.filter(order => order.status === 'cancelled');

            setCompletedOrders(completed);
            setCancelledOrders(cancelled);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderOrderCard = (order: Order) => (
        <TouchableOpacity
            key={order.id}
            className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm"
            onPress={() => router.push(`/(customer)/payment-summary/${order.id}`)}
        >
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">รหัสการเดินทาง #{order.id}</Text>
                    <Text className="text-xs text-gray-400">{formatDate(order.created_at)}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${order.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    <Text className={`text-xs font-bold ${order.status === 'completed' ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {order.status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก'}
                    </Text>
                </View>
            </View>

            <View className="mb-3">
                <View className="flex-row items-start mb-2">
                    <MapPin size={16} color="#3B82F6" className="mr-2 mt-1" />
                    <View className="flex-1">
                        <Text className="text-[10px] text-gray-400 uppercase font-bold">จุดรับ</Text>
                        <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                            {order.pickup_address}
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-start">
                    <MapPin size={16} color="#EF4444" className="mr-2 mt-1" />
                    <View className="flex-1">
                        <Text className="text-[10px] text-gray-400 uppercase font-bold">จุดส่ง</Text>
                        <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                            {order.dropoff_address}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="pt-3 border-t border-gray-50 flex-row justify-between items-center">
                <View className="flex-row items-center">
                    {order.driver ? (
                        <>
                            <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-2">
                                <Car size={16} color="#6B7280" />
                            </View>
                            <View>
                                <Text className="text-xs text-gray-500">คนขับ</Text>
                                <Text className="text-sm font-bold text-gray-800">{order.driver.user?.full_name || 'คนขับพาร์ทเนอร์'}</Text>
                            </View>
                        </>
                    ) : (
                        <Text className="text-xs text-gray-400 italic">ไม่ได้ระบุคนขับ</Text>
                    )}
                </View>
                <View className="items-end">
                    <Text className="text-xs text-gray-500">ราคาสุทธิ</Text>
                    <Text className="text-lg font-bold text-gray-900">฿{formatPrice(order.price)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const currentOrders = activeTab === 'completed' ? completedOrders : cancelledOrders;

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <Text className="text-xl font-bold text-gray-800">ประวัติการเดินทาง</Text>
            </View>

            {/* Tabs */}
            <View className="bg-white flex-row border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => setActiveTab('completed')}
                    className={`flex-1 py-4 ${activeTab === 'completed' ? 'border-b-2 border-primary' : ''
                        }`}
                >
                    <View className="flex-row items-center justify-center">
                        <CheckCircle
                            size={18}
                            color={activeTab === 'completed' ? '#00A862' : '#9CA3AF'}
                        />
                        <Text
                            className={`ml-2 font-bold ${activeTab === 'completed' ? 'text-primary' : 'text-gray-400'
                                }`}
                        >
                            เสร็จสิ้น ({completedOrders.length})
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setActiveTab('cancelled')}
                    className={`flex-1 py-4 ${activeTab === 'cancelled' ? 'border-b-2 border-red-500' : ''
                        }`}
                >
                    <View className="flex-row items-center justify-center">
                        <XCircle
                            size={18}
                            color={activeTab === 'cancelled' ? '#EF4444' : '#9CA3AF'}
                        />
                        <Text
                            className={`ml-2 font-bold ${activeTab === 'cancelled' ? 'text-red-600' : 'text-gray-400'
                                }`}
                        >
                            ยกเลิก ({cancelledOrders.length})
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00A862" />
                    <Text className="text-gray-500 mt-4">กำลังโหลด...</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1 p-5"
                    showsVerticalScrollIndicator={false}
                >
                    {currentOrders.length === 0 ? (
                        <View className="items-center justify-center mt-20">
                            <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-4">
                                {activeTab === 'completed' ? (
                                    <CheckCircle size={40} color="#D1D5DB" />
                                ) : (
                                    <XCircle size={40} color="#D1D5DB" />
                                )}
                            </View>
                            <Text className="text-xl font-bold text-gray-400 text-center">
                                ไม่มีประวัติการเดินทาง
                            </Text>
                            <Text className="text-gray-500 text-center mt-2">
                                {activeTab === 'completed'
                                    ? 'การเดินทางที่เสร็จสิ้นจะแสดงที่นี่'
                                    : 'การเดินทางที่ถูกยกเลิกจะแสดงที่นี่'}
                            </Text>
                        </View>
                    ) : (
                        currentOrders.map(order => renderOrderCard(order))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
