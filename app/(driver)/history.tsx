import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { orderService } from '../../services/orderService';
import { Order } from '../../types/order';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency, formatPrice } from '../../utils/format';

export default function DriverHistoryScreen() {
    const { user } = useAuthStore();
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

            // Filter completed and cancelled orders for current driver
            // Include active statuses so they are not "missing" in history
            const completed = allOrders.filter(
                order => (order.status === 'completed' || ['accepted', 'arrived', 'in_progress'].includes(order.status || '')) && order.driver?.user_id === user?.id
            );
            const cancelled = allOrders.filter(
                order => order.status === 'cancelled' && order.driver?.user_id === user?.id
            );

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
            onPress={() => router.push(`/(driver)/job/${order.id}`)}
            className="bg-white p-4 rounded-xl mb-3 border border-gray-200"
        >
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">รหัสงาน #{order.id}</Text>
                    <Text className="text-sm font-bold text-gray-800">{order.customer?.full_name || 'ลูกค้า'}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at || '')}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${order.status === 'completed' ? 'bg-green-100' :
                    order.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                    <Text className={`text-xs font-bold ${order.status === 'completed' ? 'text-green-700' :
                        order.status === 'cancelled' ? 'text-red-700' : 'text-blue-700'
                        }`}>
                        {order.status === 'completed' ? 'เสร็จสิ้น' :
                            order.status === 'cancelled' ? 'ยกเลิก' :
                                order.status === 'arrived' ? 'มาถึงแล้ว' :
                                    order.status === 'accepted' ? 'รับงานแล้ว' : 'กำลังดำเนินการ'}
                    </Text>
                </View>
            </View>

            <View className="mb-3">
                <View className="flex-row items-start mb-2">
                    <MapPin size={16} color="#3B82F6" className="mr-2 mt-1" />
                    <View className="flex-1">
                        <Text className="text-xs text-gray-500">รับ</Text>
                        <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                            {order.pickup_address}
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-start">
                    <MapPin size={16} color="#EF4444" className="mr-2 mt-1" />
                    <View className="flex-1">
                        <Text className="text-xs text-gray-500">ส่ง</Text>
                        <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                            {order.dropoff_address}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="pt-3 border-t border-gray-100">
                {order.status !== 'cancelled' && (
                    <View className="flex-row items-center mb-2">
                        <Text className="text-xs text-gray-500 mr-1">สัตว์เลี้ยง:</Text>
                        <View>
                            {order.pets && order.pets.length > 0 ? (
                                order.pets.map((pet, index) => (
                                    <View key={pet.id || index}>
                                        <Text className="text-sm font-medium text-gray-800">
                                            {pet.name} <Text className="text-xs font-normal text-gray-500">({pet.type}, {pet.weight}kg)</Text>
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <Text className="text-sm font-medium text-gray-800">
                                    {order.pet_details || order.pet?.name || '-'}
                                </Text>
                            )}
                            {order.passengers && (
                                <Text className="text-xs text-gray-500">
                                    (Passengers: {order.passengers})
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Commission Breakdown - Only show for completed orders */}
                {order.status !== 'cancelled' && (
                    <View className="bg-gray-50 p-3 rounded-lg mt-2">
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-gray-600">ราคารวม</Text>
                            <Text className="text-sm font-medium text-gray-800">
                                ฿{formatPrice(order.price)}
                            </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-gray-500">Commission App</Text>
                            <Text className="text-xs text-red-600">
                                -฿{formatCurrency(order.platform_fee, 2)}
                            </Text>
                        </View>
                        <View className="flex-row justify-between pt-2 border-t border-gray-200">
                            <Text className="text-sm font-bold text-gray-800">รายได้สุทธิ</Text>
                            <Text className="text-lg font-bold text-green-600">
                                ฿{formatCurrency(order.driver_earnings, 2)}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const currentOrders = activeTab === 'completed' ? completedOrders : cancelledOrders;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">ประวัติรับงาน</Text>
            </View>

            {/* Tabs */}
            <View className="bg-white flex-row border-b border-gray-200">
                <TouchableOpacity
                    onPress={() => setActiveTab('completed')}
                    className={`flex-1 py-4 ${activeTab === 'completed' ? 'border-b-2 border-green-500' : ''
                        }`}
                >
                    <View className="flex-row items-center justify-center">
                        <CheckCircle
                            size={20}
                            color={activeTab === 'completed' ? '#00A862' : '#9CA3AF'}
                        />
                        <Text
                            className={`ml-2 font-bold ${activeTab === 'completed' ? 'text-green-600' : 'text-gray-400'
                                }`}
                        >
                            งานเสร็จสิ้น ({completedOrders.length})
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
                            size={20}
                            color={activeTab === 'cancelled' ? '#EF4444' : '#9CA3AF'}
                        />
                        <Text
                            className={`ml-2 font-bold ${activeTab === 'cancelled' ? 'text-red-600' : 'text-gray-400'
                                }`}
                        >
                            งานยกเลิก ({cancelledOrders.length})
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
                <ScrollView className="flex-1 p-5">
                    {currentOrders.length === 0 ? (
                        <View className="items-center justify-center mt-20">
                            <View className="bg-gray-200 w-20 h-20 rounded-full items-center justify-center mb-4">
                                {activeTab === 'completed' ? (
                                    <CheckCircle size={40} color="gray" />
                                ) : (
                                    <XCircle size={40} color="gray" />
                                )}
                            </View>
                            <Text className="text-xl font-bold text-gray-400 text-center">
                                ไม่มี{activeTab === 'completed' ? 'งานเสร็จสิ้น' : 'งานยกเลิก'}
                            </Text>
                            <Text className="text-gray-500 text-center mt-2">
                                {activeTab === 'completed'
                                    ? 'งานที่เสร็จสิ้นจะแสดงที่นี่'
                                    : 'งานที่ยกเลิกจะแสดงที่นี่'}
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
