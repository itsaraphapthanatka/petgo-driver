import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, MapPin, Clock, CreditCard, Banknote, Star, XCircle } from 'lucide-react-native';
import { orderService } from '../../../services/orderService';
import { Order } from '../../../types/order';
import { AppButton } from '../../../components/ui/AppButton';
import { formatPrice } from '../../../utils/format';

export default function PaymentSummaryScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const fetchedOrder = await orderService.getOrder(Number(id));
                setOrder(fetchedOrder);
            } catch (error) {
                console.error("Failed to fetch order summary:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#00A862" />
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 bg-white items-center justify-center p-6">
                <Text className="text-lg font-bold">Order not found</Text>
                <AppButton title="Go Home" onPress={() => router.replace('/(customer)/(tabs)/home')} className="mt-4" />
            </View>
        );
    }

    const isPaid = order.payment_status === 'paid';
    const isCash = order.payment_method === 'cash';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                <View className="items-center mt-10 mb-8">
                    <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${order.status === 'cancelled' ? 'bg-red-100' : 'bg-green-100'}`}>
                        {order.status === 'cancelled' ? (
                            <XCircle size={44} color="#EF4444" />
                        ) : (
                            <CheckCircle2 size={44} color="#10B981" />
                        )}
                    </View>
                    <Text className="text-3xl font-black text-gray-900">
                        {order.status === 'cancelled' ? 'Trip Cancelled' : (t('journey_completed') || 'Trip Completed')}
                    </Text>
                    <Text className="text-gray-500 mt-1">Order #{order.id}</Text>
                </View>

                {/* Amount Paid Card - Hide if cancelled */}
                {order.status !== 'cancelled' && (
                    <View className="bg-gray-50 rounded-3xl p-6 mb-6 border border-gray-100">
                        <View className="items-center mb-6">
                            <Text className="text-gray-500 font-medium mb-1">{isPaid ? t('amount_paid') || 'Total Paid' : t('amount_to_pay') || 'Total to Pay'}</Text>
                            <Text className="text-5xl font-black text-gray-900">฿{formatPrice(order.price)}</Text>
                            <View className={`px-4 py-1.5 rounded-full mt-3 ${isPaid ? 'bg-green-100' : 'bg-blue-100'}`}>
                                <Text className={`font-bold text-sm ${isPaid ? 'text-green-700' : 'text-blue-700'}`}>
                                    {isPaid ? t('paid') || 'PAID' : t('pending') || 'PENDING'}
                                </Text>
                            </View>
                        </View>

                        <View className="h-[1px] bg-gray-200 w-full mb-6" />

                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-gray-500">{t('payment_method')}</Text>
                            <View className="flex-row items-center">
                                <Text className="text-gray-900 font-bold mr-2">
                                    {order.payment_method === 'cash' ? t('cash') :
                                        order.payment_method === 'card' ? t('credit_card') :
                                            t('promptpay')}
                                </Text>
                                {order.payment_method === 'cash' ? <Banknote size={16} color="#4B5563" /> :
                                    order.payment_method === 'card' ? <CreditCard size={16} color="#4B5563" /> :
                                        <CreditCard size={16} color="#4B5563" />}
                            </View>
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-500">{t('date') || 'Date'}</Text>
                            <Text className="text-gray-900 font-bold">
                                {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Trip Details */}
                <View className="bg-white border border-gray-100 rounded-3xl p-6 mb-6 shadow-sm">
                    <Text className="text-gray-900 font-bold text-lg mb-4">{t('trip_details') || 'Trip Details'}</Text>

                    <View className="flex-row items-start mb-6">
                        <View className="w-8 items-center mr-3 pt-1">
                            <View className="w-3 h-3 bg-blue-500 rounded-full" />
                            <View className="w-0.5 h-10 bg-gray-200 my-1" />
                            <View className="w-3 h-3 bg-red-500 rounded-sm" />
                        </View>
                        <View className="flex-1 space-y-4">
                            <View>
                                <Text className="text-gray-400 text-xs uppercase font-bold mb-0.5">{t('pick_up')}</Text>
                                <Text className="text-gray-800 font-medium" numberOfLines={1}>{order.pickup_address}</Text>
                            </View>
                            <View className="mt-4">
                                <Text className="text-gray-400 text-xs uppercase font-bold mb-0.5">{t('drop_off')}</Text>
                                <Text className="text-gray-800 font-medium" numberOfLines={1}>{order.dropoff_address}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row items-center pt-4 border-t border-gray-50">
                        <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-4">
                            <Text className="text-xl">🚗</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs font-bold uppercase">{t('driver')}</Text>
                            <Text className="text-gray-900 font-bold">{order.driver?.user?.full_name || 'Driver'}</Text>
                        </View>
                        <View className="flex-row items-center bg-yellow-50 px-2 py-1 rounded-lg">
                            <Star size={14} color="#EAB308" fill="#EAB308" />
                            <Text className="text-yellow-700 font-bold ml-1 text-xs">4.9</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View className="p-6 pb-10">
                <AppButton
                    title={t('back_to_home') || 'Back to Home'}
                    onPress={() => router.replace('/(customer)/(tabs)/home')}
                    size="lg"
                />
            </View>
        </SafeAreaView >
    );
}
