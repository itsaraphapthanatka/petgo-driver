import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../../../components/ui/AppButton';
import { Check, ArrowLeft, Copy, Wallet, CreditCard } from 'lucide-react-native';
import { useJobStore } from '../../../store/useJobStore';
import { orderService } from '../../../services/orderService';
import { api } from '../../../services/api';
import { formatPrice } from '../../../utils/format';
import { Order } from '../../../types/order';

export default function PaymentCollectScreen() {
    const { id } = useLocalSearchParams();
    const { activeJob, setActiveJob } = useJobStore();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await orderService.getOrder(Number(id));
                setOrder(data);
                if (data.status === 'completed' && data.payment_status === 'paid') {
                    // If already done, maybe just show summary or auto redirect?
                }
            } catch (error) {
                console.error(error);
                Alert.alert("Error", "Failed to load order details");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();

        const interval = setInterval(async () => {
            // Try to sync if promptpay
            if (order?.payment_method === 'promptpay' || activeJob?.payment_method === 'promptpay') {
                await api.syncPayment(Number(id));
            }
            fetchOrder();
        }, 5000);

        return () => clearInterval(interval);
    }, [id, order?.payment_method]);

    const handleConfirmPayment = async () => {
        if (!order) return;
        setConfirming(true);
        try {
            // First confirm payment (mark as paid)
            await orderService.confirmPayment(order.id);

            // Then complete the order
            await orderService.updateOrderStatus(order.id, 'completed');

            Alert.alert("Success", "Job completed and payment collected!", [
                { text: "OK", onPress: () => router.replace('/(driver)/(tabs)/home') }
            ]);
            setActiveJob(null);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to confirm payment");
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#00A862" />
            </View>
        );
    }

    if (!order) return null;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-5 pt-2 mb-4 relative">
                <TouchableOpacity onPress={() => router.back()} className="absolute top-2 left-5 z-10 p-2 bg-gray-100 rounded-full">
                    <ArrowLeft size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-center text-xl font-bold mt-2">Collect Payment</Text>
            </View>

            <ScrollView className="flex-1 px-5">
                <View className="items-center mb-8 mt-4">
                    <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                        <Wallet size={40} color="#00A862" />
                    </View>
                    <Text className="text-gray-500 text-lg mb-1">Total Amount to Collect</Text>
                    <Text className="text-4xl font-bold text-gray-900">฿{formatPrice(order.price)}</Text>
                </View>

                <View className="bg-gray-50 p-5 rounded-xl mb-6 border border-gray-100">
                    <View className="flex-row justify-between mb-4">
                        <Text className="text-gray-500">Payment Method</Text>
                        <View className="flex-row items-center">
                            {order.payment_method === 'cash' ? <Wallet size={16} color="#000" className="mr-2" /> : <CreditCard size={16} color="#000" className="mr-2" />}
                            <Text className="font-bold capitalize">{order.payment_method}</Text>
                        </View>
                    </View>
                    <View className="flex-row justify-between mb-4">
                        <Text className="text-gray-500">Customer</Text>
                        <Text className="font-bold">{order.customer?.full_name}</Text>
                    </View>
                    <View className="border-t border-gray-200 my-2" />
                    <View className="flex-row justify-between mt-2">
                        <Text className="text-gray-900 font-bold">Net Earnings</Text>
                        <Text className="font-bold text-green-600">฿{formatPrice((order.price || 0) * 0.85)}</Text>
                        {/* Assuming 15% commission or use actual logic */}
                    </View>
                    <Text className="text-xs text-gray-400 mt-1 text-right">*Estimated after commission</Text>
                </View>

                {order.payment_method === 'qrcode' && (
                    <View className="items-center mb-6">
                        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            {/* Placeholder for QR Code */}
                            <View className="w-48 h-48 bg-gray-900 items-center justify-center">
                                <Text className="text-white font-bold">QR CODE</Text>
                            </View>
                        </View>
                        <Text className="text-gray-500 text-sm mt-3 text-center">Scan to pay</Text>
                    </View>
                )}
            </ScrollView>

            <View className="p-5 border-t border-gray-100 pb-10">
                <AppButton
                    title="Confirm Payment Received"
                    onPress={handleConfirmPayment}
                    isLoading={confirming}
                    size="lg"
                    className="bg-green-600"
                />
            </View>
        </SafeAreaView>
    );
}
