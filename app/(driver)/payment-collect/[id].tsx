import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Banknote, CheckCircle2, CreditCard, RefreshCw } from 'lucide-react-native';
import { orderService } from '../../../services/orderService';
import { api, PaymentResponse } from '../../../services/api';
import { Order } from '../../../types/order';
import { AppButton } from '../../../components/ui/AppButton';
import { formatPrice } from '../../../utils/format';

export default function PaymentCollectScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order | null>(null);
    const [payment, setPayment] = useState<PaymentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = async () => {
        try {
            const fetchedOrder = await orderService.getOrder(Number(id));
            setOrder(fetchedOrder);

            try {
                const fetchedPayment = await api.getPaymentByOrderId(Number(id));
                setPayment(fetchedPayment);
            } catch (pError) {
                console.warn("No payment found for this order yet");
            }
        } catch (error) {
            console.error("Failed to fetch order for payment:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleConfirmCash = async () => {
        if (!payment) return;
        setIsProcessing(true);
        try {
            await api.verifyPayment(payment.id, 'successful');
            await fetchData(); // Refresh
            Alert.alert("Success", "Cash payment confirmed.");
        } catch (error) {
            Alert.alert("Error", "Failed to confirm cash payment.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCheckStatus = async () => {
        setIsProcessing(true);
        try {
            await fetchData();
            if (order?.payment_status === 'paid') {
                Alert.alert("Paid", "Customer has already paid online.");
            } else {
                Alert.alert("Pending", "Customer hasn't paid yet. Please ask them to scan the QR code.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinishJob = async () => {
        if (!order) return;

        if (order.payment_status !== 'paid') {
            Alert.alert("Payment Required", "Please confirm payment before finishing the job.");
            return;
        }

        setIsProcessing(true);
        try {
            await orderService.updateOrderStatus(order.id, 'completed');
            router.replace('/(driver)/(tabs)/home');
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to complete job.");
        } finally {
            setIsProcessing(false);
        }
    };

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
                <AppButton title="Go Home" onPress={() => router.replace('/(driver)/(tabs)/home')} className="mt-4" />
            </View>
        );
    }

    const isPaid = order.payment_status === 'paid';
    const isCash = order.payment_method === 'cash';
    const amountToCollect = isPaid ? 0 : (order.price || 0);

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-6 pt-10">
                <View className="items-center mb-8">
                    <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isPaid ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {isPaid ? (
                            <CheckCircle2 size={40} color="#10B981" />
                        ) : isCash ? (
                            <Banknote size={40} color="#3B82F6" />
                        ) : (
                            <CreditCard size={40} color="#3B82F6" />
                        )}
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{t('payment_collection')}</Text>
                    <Text className="text-gray-500 mt-1">Order #{order.id}</Text>
                </View>

                <View className="bg-gray-50 rounded-3xl p-6 mb-8">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-gray-500 font-medium">{t('total')}</Text>
                        <Text className="text-2xl font-bold text-gray-900">฿{formatPrice(order.price)}</Text>
                    </View>

                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-gray-500 font-medium">{t('payment_method')}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-gray-900 font-semibold mr-2">
                                {order.payment_method === 'cash' ? t('cash') :
                                    order.payment_method === 'card' ? t('credit_card') :
                                        t('promptpay')}
                            </Text>
                            {order.payment_method === 'cash' ? <Banknote size={16} color="#4B5563" /> :
                                order.payment_method === 'card' ? <CreditCard size={16} color="#4B5563" /> :
                                    <CreditCard size={16} color="#4B5563" />}
                        </View>
                    </View>

                    <View className="h-[1px] bg-gray-200 w-full mb-6" />

                    <View className="items-center">
                        <Text className="text-gray-500 mb-2">{t('collect_from_customer')}</Text>
                        <Text className={`text-5xl font-black ${amountToCollect > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                            ฿{formatPrice(amountToCollect)}
                        </Text>
                        {isPaid && (
                            <View className="bg-green-100 px-4 py-1 rounded-full mt-4">
                                <Text className="text-green-700 font-bold text-sm">{t('paid_online')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {!isPaid && (
                    <View className="mb-8">
                        {isCash ? (
                            <TouchableOpacity
                                onPress={handleConfirmCash}
                                disabled={isProcessing}
                                className="bg-blue-100 p-4 rounded-2xl flex-row items-center justify-center border border-blue-200"
                            >
                                <Banknote size={20} color="#2563EB" className="mr-2" />
                                <Text className="text-blue-700 font-bold">ยืนยันได้รับเงินสดแล้ว</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleCheckStatus}
                                disabled={isProcessing}
                                className="bg-gray-100 p-4 rounded-2xl flex-row items-center justify-center border border-gray-200"
                            >
                                <RefreshCw size={20} color="#4B5563" className="mr-2" />
                                <Text className="text-gray-700 font-bold">ตรวจสอบสถานะการชำระเงิน</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View className="bg-blue-50 rounded-2xl p-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                        <Text className="text-lg">👤</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider">Customer</Text>
                        <Text className="text-gray-900 font-bold">{order.customer?.full_name}</Text>
                    </View>
                </View>
            </View>

            <View className="p-6 pb-10">
                <AppButton
                    title={t('finish_job')}
                    onPress={handleFinishJob}
                    size="lg"
                    className={isPaid ? "bg-green-600" : "bg-gray-300"}
                    disabled={!isPaid || isProcessing}
                />
            </View>
        </SafeAreaView>
    );
}

