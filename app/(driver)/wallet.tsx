import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, Building2, CreditCard, User, History, ArrowDownToLine, AlertCircle, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Image } from 'react-native';
let useStripe: any;
try {
    useStripe = require('@stripe/stripe-react-native').useStripe;
} catch (e) {
    useStripe = () => ({
        initPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
        presentPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
    });
}
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { AppButton } from '../../components/ui/AppButton';
import { useAuthStore } from '../../store/useAuthStore';

export default function DriverWalletScreen() {
    const { user, loadUser } = useAuthStore();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);

    // Bank form state
    const [bankName, setBankName] = useState(user?.bank_name || '');
    const [accountNumber, setAccountNumber] = useState(user?.bank_account_number || '');
    const [accountName, setAccountName] = useState(user?.bank_account_name || '');
    const [isSavingBank, setIsSavingBank] = useState(false);

    // Top-up state
    const [isTopUpVisible, setIsTopUpVisible] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('500');
    const [topUpMethod, setTopUpMethod] = useState<'card' | 'promptpay'>('card');
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        setIsLoading(true);
        try {
            const [balanceData, transData] = await Promise.all([
                api.getWalletBalance(),
                api.getWalletTransactions()
            ]);
            setBalance(balanceData.wallet_balance);
            // Filter only withdrawals or relevant driver transactions
            setTransactions(transData.filter((t: any) => t.type === 'withdrawal' || t.type === 'earning' || t.amount > 0));
        } catch (error) {
            console.error('Failed to fetch wallet data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBank = async () => {
        if (!bankName || !accountNumber || !accountName) {
            Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลธนาคารให้ครบถ้วน');
            return;
        }

        setIsSavingBank(true);
        try {
            await api.updateDriverBank({
                bank_name: bankName,
                bank_account_number: accountNumber,
                bank_account_name: accountName
            });
            await loadUser(); // Refresh user state
            setShowBankModal(false);
            Alert.alert('สำเร็จ', 'บันทึกข้อมูลธนาคารเรียบร้อยแล้ว');
        } catch (error) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSavingBank(false);
        }
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('ยอดเงินไม่ถูกต้อง', 'กรุณากรอกจำนวนเงินที่ต้องการเบิก');
            return;
        }

        if (amount > balance) {
            Alert.alert('ยอดเงินไม่เพียงพอ', 'คุณมียอดเงินไม่เพียงพอสำหรับการเบิก');
            return;
        }

        setIsWithdrawing(true);
        try {
            await api.requestWithdrawal(amount);
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            Alert.alert('ส่งคำขอแล้ว', 'คำขอเบิกเงินของคุณอยู่ระหว่างการดำเนินการ (ปกติใช้เวลา 1-3 วันทำการ)');
            fetchWalletData(); // Refresh data
        } catch (error: any) {
            Alert.alert('ข้อผิดพลาด', error.message || 'ไม่สามารถส่งคำขอเบิกเงินได้');
        } finally {
            setIsWithdrawing(false);
        }
    };

    const confirmTopUp = async () => {
        const numAmount = parseFloat(topUpAmount || "0");
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert("กรุณากรอกจำนวนเงินให้ถูกต้อง");
            return;
        }

        try {
            setIsTopUpVisible(false);
            setIsLoading(true);

            // 1. Create top-up intent on backend
            const { paymentIntent, ephemeralKey, customer, transaction_id } = await api.topupWallet(numAmount, topUpMethod);

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: paymentIntent,
                customerEphemeralKeySecret: ephemeralKey,
                customerId: customer,
                merchantDisplayName: 'Pet Transport Driver Wallet',
                returnURL: 'petgo://stripe-redirect', // Required for Android to prevent crashes
                defaultBillingDetails: {
                    email: user?.email ?? undefined
                },
                appearance: {
                    colors: {
                        primary: '#00A862',
                    },
                },
                allowsDelayedPaymentMethods: true,
            });

            if (initError) {
                Alert.alert('เกิดข้อผิดพลาด', initError.message);
                setIsLoading(false);
                return;
            }

            // 3. Present Payment Sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code !== 'Canceled') {
                    Alert.alert('เกิดข้อผิดพลาด', presentError.message);
                }
            } else {
                // 4. Verify with backend
                try {
                    await api.verifyTopup(transaction_id);
                    Alert.alert("สำเร็จ", `เติมเงินจำนวน ฿${formatCurrency(numAmount, 2)} เรียบร้อยแล้ว!`);
                    fetchWalletData();
                } catch (err) {
                    console.error("Top-up verification failed:", err);
                    Alert.alert("กำลังตรวจสอบ", "ระบบกำลังตรวจสอบยอดเงินของคุณ กรุณารอสักครู่");
                }
            }
        } catch (error: any) {
            Alert.alert("เกิดข้อผิดพลาด", error.message || "ไม่สามารถเติมเงินได้");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-orange-600 bg-orange-100';
            case 'failed': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'success': return 'สำเร็จ';
            case 'pending': return 'รอดำเนินการ';
            case 'failed': return 'ล้มเหลว';
            default: return status;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">กระเป๋าเงิน & การเบิกเงิน</Text>
            </View>

            <ScrollView className="flex-1 p-5">
                {/* Balance Card */}
                <View className="bg-green-600 rounded-3xl p-6 mb-6 shadow-lg shadow-green-200">
                    <View className="flex-row justify-between items-start mb-4">
                        <View>
                            <Text className="text-green-100 text-sm font-medium mb-1">ยอดเงินที่เบิกได้</Text>
                            <Text className="text-4xl font-bold text-white">
                                ฿{formatCurrency(balance, 2)}
                            </Text>
                        </View>
                        <View className="bg-white/20 p-3 rounded-full">
                            <Wallet size={28} color="white" />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => setIsTopUpVisible(true)}
                        className="bg-white py-3 rounded-xl mt-2 items-center flex-row justify-center"
                    >
                        <Plus size={20} color="#059669" className="mr-2" />
                        <Text className="text-emerald-600 font-bold text-lg">เติมเงินเข้าวอลเล็ท</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View className="flex-row gap-4 mb-6">
                    <TouchableOpacity
                        onPress={() => setShowWithdrawModal(true)}
                        className="flex-1 bg-white p-4 rounded-2xl items-center border border-gray-100 shadow-sm"
                    >
                        <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center mb-2">
                            <ArrowDownToLine size={24} color="#059669" />
                        </View>
                        <Text className="text-gray-900 font-bold text-xs">เบิกเงิน</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        onPress={() => setShowBankModal(true)}
                        className="flex-1 bg-white p-4 rounded-2xl items-center border border-gray-100 shadow-sm"
                    >
                        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mb-2">
                            <Building2 size={24} color="#3B82F6" />
                        </View>
                        <Text className="text-gray-900 font-bold text-xs">{user?.bank_name ? 'แก้ไขบัญชี' : 'ตั้งค่าบัญชี'}</Text>
                    </TouchableOpacity> */}
                </View>

                {/* Bank Account Section */}
                <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                            <Building2 size={20} color="#4B5563" />
                            <Text className="text-lg font-bold text-gray-800 ml-2">บัญชีธนาคาร</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowBankModal(true)}>
                            <Text className="text-green-600 font-bold">{user?.bank_name ? 'แก้ไข' : 'เพิ่มบัญชี'}</Text>
                        </TouchableOpacity>
                    </View>

                    {user?.bank_name ? (
                        <View className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <View className="flex-row items-center mb-2">
                                <CreditCard size={16} color="#6B7280" />
                                <Text className="text-gray-600 ml-2 font-medium">{user.bank_name}</Text>
                            </View>
                            <Text className="text-gray-800 font-bold text-lg mb-1">{user.bank_account_number}</Text>
                            <View className="flex-row items-center">
                                <User size={14} color="#9CA3AF" />
                                <Text className="text-gray-400 ml-2 text-sm">{user.bank_account_name}</Text>
                            </View>
                        </View>
                    ) : (
                        <View className="items-center py-4">
                            <AlertCircle size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-2">ยังไม่ได้ตั้งค่าบัญชีธนาคาร</Text>
                        </View>
                    )}
                </View>

                {/* Recent Transactions */}
                <View className="mb-10">
                    <View className="flex-row items-center mb-4">
                        <History size={20} color="#4B5563" />
                        <Text className="text-lg font-bold text-gray-800 ml-2">ประวัติการทำรายการ</Text>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="small" color="#00C853" />
                    ) : transactions.length > 0 ? (
                        transactions.map((item) => (
                            <View key={item.id} className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 shadow-sm">
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-row items-center flex-1">
                                        <View className={`p-2 rounded-full mr-3 ${item.type === 'withdrawal' ? 'bg-red-50' : 'bg-green-50'}`}>
                                            {item.type === 'withdrawal' ? (
                                                <ArrowDownToLine size={20} color="#EF4444" />
                                            ) : (
                                                <Wallet size={20} color="#00C853" />
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-800 font-bold" numberOfLines={1}>
                                                {item.type === 'withdrawal' ? 'เบิกเงิน' : 'รายได้จากงาน'}
                                            </Text>
                                            <Text className="text-gray-400 text-xs mt-0.5">
                                                {new Date(item.created_at).toLocaleDateString('th-TH', {
                                                    day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className={`font-bold text-lg ${item.type === 'withdrawal' ? 'text-red-500' : 'text-green-600'}`}>
                                            {item.type === 'withdrawal' ? '-' : '+'}฿{formatCurrency(item.amount, 2)}
                                        </Text>
                                        <View className={`px-2 py-0.5 rounded-full mt-1 ${getStatusStyle(item.status).split(' ')[1]}`}>
                                            <Text className={`text-[10px] font-bold ${getStatusStyle(item.status).split(' ')[0]}`}>
                                                {getStatusText(item.status)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="bg-white p-10 rounded-2xl items-center border border-dashed border-gray-200">
                            <Text className="text-gray-400">ยังไม่มีรายการในช่วงนี้</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bank Modal */}
            <Modal visible={showBankModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6 pb-12">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-800">ตั้งค่าบัญชีธนาคาร</Text>
                            <TouchableOpacity onPress={() => setShowBankModal(false)}>
                                <Text className="text-gray-400 font-medium">ยกเลิก</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4">
                            <View>
                                <Text className="text-gray-500 text-sm mb-1 ml-1">ชื่อธนาคาร</Text>
                                <TextInput
                                    className="bg-gray-100 p-4 rounded-xl text-gray-800 font-medium"
                                    placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                                    value={bankName}
                                    onChangeText={setBankName}
                                />
                            </View>
                            <View>
                                <Text className="text-gray-500 text-sm mb-1 ml-1">เลขที่บัญชี</Text>
                                <TextInput
                                    className="bg-gray-100 p-4 rounded-xl text-gray-800 font-medium"
                                    placeholder="xxx-x-xxxxx-x"
                                    keyboardType="numeric"
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                />
                            </View>
                            <View>
                                <Text className="text-gray-500 text-sm mb-1 ml-1">ชื่อบัญชี</Text>
                                <TextInput
                                    className="bg-gray-100 p-4 rounded-xl text-gray-800 font-medium"
                                    placeholder="ชื่อ-นามสกุล ของเจ้าของบัญชี"
                                    value={accountName}
                                    onChangeText={setAccountName}
                                />
                            </View>

                            <AppButton
                                title={isSavingBank ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                                onPress={handleSaveBank}
                                disabled={isSavingBank}
                                className="mt-4"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Withdraw Modal */}
            <Modal visible={showWithdrawModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-center p-6">
                    <View className="bg-white rounded-3xl p-6">
                        <Text className="text-xl font-bold text-gray-800 mb-2">เบิกเงิน</Text>
                        <Text className="text-gray-500 text-sm mb-6">ระบุจำนวนเงินที่ต้องการเบิก (ยอดสูงสุด ฿{formatCurrency(balance, 2)})</Text>

                        <View className="bg-gray-100 p-4 rounded-2xl flex-row items-center mb-6">
                            <Text className="text-2xl font-bold text-gray-400 mr-2">฿</Text>
                            <TextInput
                                className="flex-1 text-3xl font-bold text-gray-800"
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={withdrawAmount}
                                onChangeText={setWithdrawAmount}
                                autoFocus
                            />
                        </View>

                        <View className="flex-row space-x-3">
                            <TouchableOpacity
                                onPress={() => setShowWithdrawModal(false)}
                                className="flex-1 bg-gray-100 py-4 rounded-xl items-center"
                            >
                                <Text className="text-gray-600 font-bold">ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleWithdraw}
                                disabled={isWithdrawing || !user?.bank_name}
                                className={`flex-1 py-4 rounded-xl items-center ${!user?.bank_name ? 'bg-gray-300' : 'bg-green-600'}`}
                            >
                                <Text className="text-white font-bold">ยืนยันการเบิก</Text>
                            </TouchableOpacity>
                        </View>
                        {!user?.bank_name && (
                            <Text className="text-red-500 text-xs mt-3 text-center">กรุณาตั้งค่าบัญชีธนาคารก่อนเบิกเงิน</Text>
                        )}
                    </View>
                </View>
            </Modal>

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
                                        className={`flex-1 flex-row items-center p-3 rounded-2xl border ${topUpMethod === 'card' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-100'}`}
                                    >
                                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${topUpMethod === 'card' ? 'bg-green-100' : 'bg-gray-200'}`}>
                                            <CreditCard size={16} color={topUpMethod === 'card' ? '#059669' : '#9CA3AF'} />
                                        </View>
                                        <Text className={`text-xs font-bold ${topUpMethod === 'card' ? 'text-emerald-700' : 'text-gray-500'}`}>บัตรเครดิต</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setTopUpMethod('promptpay')}
                                        className={`flex-1 flex-row items-center p-3 rounded-2xl border ${topUpMethod === 'promptpay' ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-100'}`}
                                    >
                                        <View className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${topUpMethod === 'promptpay' ? 'bg-green-100' : 'bg-gray-200'}`}>
                                            <Image source={{ uri: 'https://monosnap.com/image/v1/get/media/66da6696-26e1-4c17-9c9e-5e263d6f1f3a.png' }} style={{ width: 14, height: 14 }} />
                                        </View>
                                        <Text className={`text-xs font-bold ${topUpMethod === 'promptpay' ? 'text-emerald-700' : 'text-gray-500'}`}>PromptPay</Text>
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
                                        className="flex-2 bg-emerald-600 py-4 rounded-2xl items-center px-8"
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
