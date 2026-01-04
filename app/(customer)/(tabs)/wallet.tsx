import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CreditCard, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
let useStripe: any;
try {
    useStripe = require('@stripe/stripe-react-native').useStripe;
} catch (e) {
    useStripe = () => ({
        initPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
        presentPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
    });
}
import { api } from '../../../services/api';
import { formatPrice } from '../../../utils/format';
import { AppButton } from '../../../components/ui/AppButton';
import { Image } from 'react-native';

interface Transaction {
    id: number;
    amount: number;
    type: string;
    description: string;
    created_at: string;
}

export default function WalletScreen() {
    const { t } = useTranslation();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isTopUpVisible, setIsTopUpVisible] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('500');
    const [topUpMethod, setTopUpMethod] = useState<'card' | 'promptpay'>('card');
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const fetchData = async () => {
        try {
            const userData = await api.getWalletBalance();
            setBalance(userData.wallet_balance || 0);

            const txns = await api.getWalletTransactions();
            setTransactions(txns);
        } catch (error) {
            console.error('Failed to fetch wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleTopUp = () => {
        setIsTopUpVisible(true);
    };

    const confirmTopUp = async () => {
        const numAmount = parseFloat(topUpAmount || "0");
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert("กรุณากรอกจำนวนเงินให้ถูกต้อง");
            return;
        }

        try {
            setIsTopUpVisible(false);
            setLoading(true);

            // 1. Create top-up intent on backend
            const { paymentIntent, ephemeralKey, customer, transaction_id } = await api.topupWallet(numAmount, topUpMethod);

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: paymentIntent,
                customerEphemeralKeySecret: ephemeralKey,
                customerId: customer,
                merchantDisplayName: 'Pet Transport Wallet',
                appearance: {
                    colors: {
                        primary: '#00A862',
                    },
                },
                allowsDelayedPaymentMethods: true,
            });

            if (initError) {
                Alert.alert('Error', initError.message);
                setLoading(false);
                return;
            }

            // 3. Present Payment Sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code !== 'Canceled') {
                    Alert.alert('Error', presentError.message);
                }
            } else {
                // 4. Verify with backend
                try {
                    await api.verifyTopup(transaction_id);
                    Alert.alert("สำเร็จ", `เติมเงินจำนวน ฿${formatPrice(numAmount)} เรียบร้อยแล้ว!`);
                    fetchData();
                } catch (err) {
                    console.error("Top-up verification failed:", err);
                    Alert.alert("กำลังตรวจสอบ", "ระบบกำลังตรวจสอบยอดเงินของคุณ กรุณารอสักครู่");
                    // Data will refresh on next fetch/timer or manual refresh
                }
            }
        } catch (error: any) {
            Alert.alert("เกิดข้อผิดพลาด", error.message || "ไม่สามารถเติมเงินได้");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#00A862" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 py-4">
                <Text className="text-3xl font-black text-gray-900">วอลเล็ท</Text>
            </View>

            <ScrollView
                className="flex-1 px-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00A862"]} />}
            >
                {/* Balance Card */}
                <View className="bg-primary rounded-3xl p-6 mb-8 shadow-lg shadow-primary/20">
                    <View className="flex-row justify-between items-start mb-4">
                        <View>
                            <Text className="text-white/80 font-medium mb-1">ยอดเงินคงเหลือ</Text>
                            <Text className="text-4xl font-black text-white">฿{formatPrice(balance)}</Text>
                        </View>
                        <View className="bg-white/20 p-3 rounded-2xl">
                            <Wallet size={24} color="white" />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleTopUp}
                        className="bg-white py-3 rounded-xl flex-row justify-center items-center mt-4"
                    >
                        <Plus size={20} color="#00A862" className="mr-2" />
                        <Text className="text-primary font-bold">เติมเงิน</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View className="flex-row gap-4 mb-8">
                    <TouchableOpacity
                        onPress={() => router.push('/(customer)/payment-methods')}
                        className="flex-1 bg-gray-50 p-4 rounded-2xl items-center"
                    >
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mb-2">
                            <CreditCard size={20} color="#3B82F6" />
                        </View>
                        <Text className="text-gray-900 font-bold text-xs">ผูกบัตร</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 bg-gray-50 p-4 rounded-2xl items-center">
                        <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mb-2">
                            <Clock size={20} color="#F97316" />
                        </View>
                        <Text className="text-gray-900 font-bold text-xs">ถอนเงิน</Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions History */}
                <View className="mb-10">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-gray-900">ประวัติธุรกรรม</Text>
                        <TouchableOpacity>
                            <Text className="text-primary font-bold">ดูทั้งหมด</Text>
                        </TouchableOpacity>
                    </View>

                    {transactions.length === 0 ? (
                        <View className="items-center py-10 bg-gray-50 rounded-3xl">
                            <Text className="text-gray-400">ยังไม่มีประวัติธุรกรรม</Text>
                        </View>
                    ) : (
                        transactions.map((txn) => (
                            <View key={txn.id} className="flex-row items-center mb-4 bg-white p-4 rounded-2xl border border-gray-100">
                                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${txn.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                                    }`}>
                                    {txn.amount > 0 ? (
                                        <ArrowDownLeft size={24} color="#10B981" />
                                    ) : (
                                        <ArrowUpRight size={24} color="#EF4444" />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold" numberOfLines={1}>{txn.description || txn.type}</Text>
                                    <Text className="text-gray-500 text-xs">{new Date(txn.created_at).toLocaleString()}</Text>
                                </View>
                                <Text className={`font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {txn.amount > 0 ? '+' : ''}฿{formatPrice(txn.amount)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Top Up Modal */}
            <Modal
                visible={isTopUpVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsTopUpVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className="flex-1 justify-center items-center bg-black/50 px-6">
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            className="w-full"
                        >
                            <View className="bg-white rounded-3xl p-6 shadow-xl">
                                <View className="items-center mb-6">
                                    <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                                        <Plus size={32} color="#00A862" />
                                    </View>
                                    <Text className="text-2xl font-black text-gray-900">เติมเงิน</Text>
                                    <Text className="text-gray-500 text-center mt-1">ระบุจำนวนเงินที่ต้องการเติมเข้าวอลเล็ท</Text>
                                </View>

                                <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                                    <Text className="text-xs font-bold text-gray-400 uppercase mb-2">จำนวนเงิน (บาท)</Text>
                                    <View className="flex-row items-center">
                                        <Text className="text-3xl font-black text-gray-900 mr-2">฿</Text>
                                        <TextInput
                                            className="flex-1 text-3xl font-black text-gray-900"
                                            value={topUpAmount}
                                            onChangeText={setTopUpAmount}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            autoFocus={true}
                                        />
                                    </View>
                                </View>

                                <Text className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1">ช่องทางชำระเงิน</Text>
                                <View className="flex-row gap-2 mb-6">
                                    <TouchableOpacity
                                        onPress={() => setTopUpMethod('card')}
                                        className={`flex-1 flex-row items-center p-3 rounded-2xl border ${topUpMethod === 'card' ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-100'}`}
                                    >
                                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${topUpMethod === 'card' ? 'bg-primary/20' : 'bg-gray-200'}`}>
                                            <CreditCard size={16} color={topUpMethod === 'card' ? '#00A862' : '#9CA3AF'} />
                                        </View>
                                        <Text className={`text-xs font-bold ${topUpMethod === 'card' ? 'text-primary' : 'text-gray-500'}`}>บัตรเครดิต</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setTopUpMethod('promptpay')}
                                        className={`flex-1 flex-row items-center p-3 rounded-2xl border ${topUpMethod === 'promptpay' ? 'bg-primary/5 border-primary' : 'bg-gray-50 border-gray-100'}`}
                                    >
                                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${topUpMethod === 'promptpay' ? 'bg-primary/20' : 'bg-gray-200'}`}>
                                            <Image source={{ uri: 'https://monosnap.com/image/v1/get/media/66da6696-26e1-4c17-9c9e-5e263d6f1f3a.png' }} style={{ width: 14, height: 14 }} />
                                        </View>
                                        <Text className={`text-xs font-bold ${topUpMethod === 'promptpay' ? 'text-primary' : 'text-gray-500'}`}>PromptPay</Text>
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => setIsTopUpVisible(false)}
                                        className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                                    >
                                        <Text className="text-gray-600 font-bold">ยกเลิก</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmTopUp}
                                        className="flex-2 bg-primary py-4 rounded-2xl items-center px-8"
                                    >
                                        <Text className="text-white font-bold">ยืนยันเติมเงิน</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}
