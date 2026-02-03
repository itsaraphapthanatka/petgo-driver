import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CreditCard, Banknote, ArrowLeft, RefreshCw, Wallet } from 'lucide-react-native';
let useStripe: any;
try {
    useStripe = require('@stripe/stripe-react-native').useStripe;
} catch (e) {
    useStripe = () => ({
        initPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
        presentPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
    });
}
import { orderService } from '../../../services/orderService';
import { api, PaymentResponse } from '../../../services/api';
import { Order } from '../../../types/order';
import { AppButton } from '../../../components/ui/AppButton';
import { formatPrice } from '../../../utils/format';

function CustomerPaymentScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order | null>(null);
    const [payment, setPayment] = useState<PaymentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasAttemptedAutoPay, setHasAttemptedAutoPay] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const fetchData = async () => {
        try {
            const fetchedOrder = await orderService.getOrder(Number(id));
            setOrder(fetchedOrder);

            try {
                const fetchedPayment = await api.getPaymentByOrderId(Number(id));
                setPayment(fetchedPayment);
            } catch (e) {
                console.warn("No payment record found");
            }
            return fetchedOrder;
        } catch (error) {
            console.error("Failed to fetch order for payment:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handlePayWallet = async () => {
        setIsProcessing(true);
        try {
            await orderService.payWithWallet(Number(id));
            Alert.alert("สำเร็จ", "ชำระเงินผ่านวอลเล็ทเรียบร้อยแล้ว!");
            fetchData();
        } catch (error: any) {
            Alert.alert("ข้อผิดพลาด", error.message || "การชำระเงินผ่านวอลเล็ทล้มเหลว");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCheckStatus = async () => {
        setIsProcessing(true);
        try {
            await api.syncPayment(Number(id));
            const updatedOrder = await fetchData();
            if (updatedOrder?.payment_status === 'paid') {
<<<<<<< HEAD
                // Success - UI will update automatically
=======
                // Success - UI will update automatically via state
                // Alert.alert("สำเร็จ", "ยืนยันการชำระเงินเรียบร้อยแล้ว!"); 
                // Removed alert to just show success UI immediately as requested
>>>>>>> e2435b8 (feat: Implement multi-step driver registration, add push notification service, and update car icon.)
            } else {
                Alert.alert("รอการยืนยัน", "ยังไม่พบยอดชำระเงิน กรุณาลองใหม่อีกครั้ง");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStripePayment = async () => {
        if (!order) return;
        setIsProcessing(true);
        try {
            // 1. Fetch PaymentIntent and customer data from backend
            const { paymentIntent, ephemeralKey, customer, publishableKey } = await api.createPaymentIntent({
                order_id: order.id,
                amount: order.price || 0,
                method: 'stripe'
            });

            // 2. Initialize Payment Sheet with customer and ephemeral key
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: paymentIntent,
                customerEphemeralKeySecret: ephemeralKey,
                customerId: customer,
                merchantDisplayName: 'Pet Transport',
                defaultBillingDetails: {
                    name: order.user_id.toString(),
                },
                appearance: {
                    colors: {
                        primary: '#00A862',
                    },
                },
                // Enable saving cards
                allowsDelayedPaymentMethods: true,
            });

            if (initError) {
                Alert.alert('ข้อผิดพลาด', initError.message);
                setIsProcessing(false);
                return;
            }

            // 3. Present Payment Sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                // If user cancels, we don't need to show an error unless it's a real failure
                if (presentError.code !== 'Canceled') {
                    Alert.alert('ข้อผิดพลาด', presentError.message);
                }
                setIsProcessing(false);
            } else {
                // 4. Success! Verify with backend
                try {
                    // Update our internal payment record if it exists
                    const currentPayment = payment || await api.getPaymentByOrderId(Number(id)).catch(() => null);
                    if (currentPayment) {
                        await api.verifyPayment(currentPayment.id, 'successful');
                    }
                    Alert.alert('สำเร็จ', 'ชำระเงินเรียบร้อยแล้ว!');
                    fetchData();
                } catch (err) {
                    console.error("Verification error:", err);
                    // Still might be successful in Stripe, but backend update failed
                    fetchData();
                }
            }
        } catch (error: any) {
            Alert.alert('ข้อผิดพลาด', error.message || 'เริ่มการชำระเงินล้มเหลว');
        } finally {
            setIsProcessing(false);
        }
    };

    // Auto-trigger Stripe payment if it's a stripe order and not yet paid
    useEffect(() => {
        if (!isLoading && order && order.payment_method === 'stripe' && order.payment_status !== 'paid' && !hasAttemptedAutoPay) {
            setHasAttemptedAutoPay(true);

            const attemptCharge = async () => {
                // If we have a saved card ID, try background charge first (true automation)
                if (order.stripe_payment_method_id) {
                    setIsProcessing(true);
                    try {
                        const result = await api.chargeSavedCard(order.id, order.stripe_payment_method_id);
                        if (result.status === 'success') {
                            Alert.alert("สำเร็จ", "ชำระเงินเรียบร้อยแล้ว!");
                            fetchData();
                            return;
                        } else {
                            // Requires action (e.g. 3D Secure) - fallback to sheet
                            handleStripePayment();
                        }
                    } catch (error) {
                        console.log("Background charge failed, falling back to sheet:", error);
                        handleStripePayment();
                    } finally {
                        setIsProcessing(false);
                    }
                } else {
                    // No saved card ID, show sheet immediately
                    handleStripePayment();
                }
            };

            attemptCharge();
        }
    }, [isLoading, order, hasAttemptedAutoPay]);

    // Auto-fetch PromptPay QR if needed
    useEffect(() => {
        if (!isLoading && order && order.payment_method === 'promptpay' && order.payment_status !== 'paid' && !qrCodeUrl) {
            const getPromptPayQR = async () => {
                try {
                    const result = await api.createPaymentIntent({
                        order_id: order.id,
                        amount: order.price || 0,
                        method: 'promptpay'
                    });
                    if (result.qr_code_url) {
                        setQrCodeUrl(result.qr_code_url);
                    }
                } catch (error) {
                    console.error("Failed to get PromptPay QR:", error);
                }
            };
            getPromptPayQR();
        }
    }, [isLoading, order, qrCodeUrl]);

    // Polling for status if PromptPay
    useEffect(() => {
        let interval: any;
        if (order && order.payment_method === 'promptpay' && order.payment_status !== 'paid') {
            interval = setInterval(async () => {
                await api.syncPayment(order.id);
                fetchData();
            }, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [order?.payment_status, order?.payment_method]);

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
                <Text className="text-lg font-bold">ไม่พบรายการ (Order not found)</Text>
                <AppButton title="กลับหน้าหลัก" onPress={() => router.replace('/(customer)/(tabs)/home')} className="mt-4" />
            </View>
        );
    }

    const isPaid = order.payment_status === 'paid';
    const isCash = order.payment_method === 'cash';
    const isWallet = order.payment_method === 'wallet';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 py-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-xl font-bold ml-2">ชำระเงิน</Text>
            </View>

            <View className="flex-1 px-6">
                <View className="bg-gray-50 rounded-3xl p-6 mt-4 mb-8">
                    <View className="items-center mb-6">
                        <Text className="text-gray-500 font-medium mb-1">{t('amount_to_pay') || 'Total Amount'}</Text>
                        <Text className="text-5xl font-black text-gray-900">฿{formatPrice(order.price)}</Text>
                    </View>

                    <View className="h-[1px] bg-gray-200 w-full mb-6" />

                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-500">{t('payment_method')}</Text>
                        <View className="flex-row items-center">
                            <Text className="text-gray-900 font-bold mr-2">
                                {isCash ? t('cash') : isWallet ? 'วอลเล็ท' : t('promptpay')}
                            </Text>
                            {isCash ? <Banknote size={16} color="#4B5563" /> : isWallet ? <Wallet size={16} color="#4B5563" /> : <CreditCard size={16} color="#4B5563" />}
                        </View>
                    </View>
                </View>

                {isPaid ? (
                    <View className="items-center justify-center py-10">
                        <CheckCircle2 size={80} color="#10B981" />
                        <Text className="text-2xl font-bold text-gray-900 mt-4">ชำระเงินสำเร็จแล้ว</Text>
                        <AppButton
                            title="ตกลง"
                            onPress={() => router.back()}
                            className="mt-8 w-full"
                        />
                    </View>
                ) : isCash ? (
                    // ... cash UI (lines 114-127 already handled by original code, but I'll make sure it's consistent)
                    <View className="items-center px-4">
                        <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
                            <Banknote size={40} color="#3B82F6" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 text-center mb-2">กรุณาชำระเงินสดแก่คนขับ</Text>
                        <Text className="text-gray-500 text-center">คนขับจะกดยืนยันเมื่อได้รับเงินจากคุณแล้ว</Text>

                        <AppButton
                            title="รับทราบ"
                            onPress={() => router.back()}
                            className="mt-10 w-full"
                        />
                    </View>
                ) : isWallet ? (
                    <View className="items-center px-4">
                        <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-6">
                            <Wallet size={40} color="#00A862" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 text-center mb-2">ชำระเงินผ่านวอลเล็ท</Text>
                        <Text className="text-gray-500 text-center mb-10">ระบบจะหักเงินจากยอดคงเหลือในวอลเล็ทของคุณ</Text>

                        <AppButton
                            title={`ชำระเงิน ฿${formatPrice(order.price)}`}
                            onPress={handlePayWallet}
                            isLoading={isProcessing}
                            className="w-full"
                        />
                        <TouchableOpacity
                            onPress={() => router.push('/(customer)/(tabs)/wallet')}
                            className="mt-6"
                        >
                            <Text className="text-primary font-bold">เติมเงินเข้าวอลเล็ท</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // PromptPay or Credit Card (Stripe)
                    <View className="items-center w-full">
                        {order.payment_method === 'promptpay' ? (
                            <>
                                <View className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6">
                                    {qrCodeUrl ? (
                                        <Image
                                            source={{ uri: qrCodeUrl }}
                                            style={{ width: 250, height: 250 }}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <View style={{ width: 250, height: 250, justifyContent: 'center', alignItems: 'center' }}>
                                            <ActivityIndicator size="large" color="#00A862" />
                                            <Text className="mt-2 text-gray-400">กำลังเตรียม QR Code...</Text>
                                        </View>
                                    )}
                                </View>
                                <Text className="text-gray-500 text-center mb-8">สแกน QR Code ด้านบนเพื่อชำระเงินผ่าน PromptPay</Text>

                                <AppButton
                                    title="ฉันชำระเงินแล้ว"
                                    onPress={handleCheckStatus}
                                    isLoading={isProcessing}
                                    className="w-full mb-4"
                                />
                            </>
                        ) : (
                            <View className="w-full items-center">
                                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
                                    <CreditCard size={40} color="#2563EB" />
                                </View>
                                <Text className="text-xl font-bold text-gray-900 text-center mb-2">ชำระเงินผ่านบัตรเครดิต</Text>
                                <Text className="text-gray-500 text-center mb-10">ชำระเงินอย่างปลอดภัยผ่าน Stripe</Text>

                                <AppButton
                                    title={`ชำระเงิน ฿${formatPrice(order.price)}`}
                                    onPress={handleStripePayment}
                                    isLoading={isProcessing}
                                    className="w-full mb-4"
                                />
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={fetchData}
                            className="flex-row items-center py-2"
                        >
                            <RefreshCw size={16} color="#4B5563" className="mr-2" />
                            <Text className="text-gray-600 font-medium">รีเฟรชสถานะ</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

export default CustomerPaymentScreen;
