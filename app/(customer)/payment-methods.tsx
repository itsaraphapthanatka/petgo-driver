import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, CreditCard, Trash2, CheckCircle2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { AppButton } from '../../components/ui/AppButton';
let useStripe: any;
try {
    useStripe = require('@stripe/stripe-react-native').useStripe;
} catch (e) {
    useStripe = () => ({
        initPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
        presentPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
    });
}

export default function PaymentMethodsScreen() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [cards, setCards] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const fetchPaymentMethods = async () => {
        try {
            const methods = await api.getPaymentMethods();
            setCards(methods);
        } catch (error) {
            console.error('Failed to fetch payment methods:', error);
            Alert.alert('Error', 'Failed to load payment methods');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPaymentMethods();
    };

    const handleAddCard = async () => {
        try {
            setLoading(true);
            // 1. Create a SetupIntent on the backend
            const { setupIntent, ephemeralKey, customer, publishableKey } = await api.createSetupIntent();

            // 2. Initialize the Payment Sheet in setup mode
            const { error: initError } = await initPaymentSheet({
                setupIntentClientSecret: setupIntent,
                customerEphemeralKeySecret: ephemeralKey,
                customerId: customer,
                merchantDisplayName: 'Pet Transport',
                appearance: {
                    colors: {
                        primary: '#00A862',
                    },
                },
            });

            if (initError) {
                Alert.alert('Error', initError.message);
                setLoading(false);
                return;
            }

            // 3. Present the payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code !== 'Canceled') {
                    Alert.alert('Error', presentError.message);
                }
            } else {
                Alert.alert('Success', 'Card added successfully!');
                fetchPaymentMethods();
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to initialize card setup');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCard = (pmId: string) => {
        Alert.alert(
            'Delete Card',
            'Are you sure you want to remove this card?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.detachPaymentMethod(pmId);
                            fetchPaymentMethods();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete card');
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">วิธีการชำระเงิน</Text>
            </View>

            <ScrollView
                className="flex-1 px-5 pt-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <Text className="text-gray-500 font-medium mb-4 uppercase text-xs tracking-widest">
                    บัตรที่บันทึกไว้
                </Text>

                {loading && !refreshing && cards.length === 0 ? (
                    <ActivityIndicator size="large" color="#00A862" className="mt-10" />
                ) : cards.length === 0 ? (
                    <View className="bg-white p-8 rounded-3xl items-center border border-gray-100 shadow-sm">
                        <View className="bg-gray-100 w-16 h-16 rounded-full items-center justify-center mb-4">
                            <CreditCard size={32} color="#9CA3AF" />
                        </View>
                        <Text className="text-gray-900 font-bold text-lg">ยังไม่มีบัตรที่บันทึกไว้</Text>
                        <Text className="text-gray-500 text-center mt-2">
                            เพิ่มบัตรเพื่อความสะดวกในการชำระเงินครั้งต่อไป
                        </Text>
                    </View>
                ) : (
                    cards.map((card) => (
                        <View
                            key={card.id}
                            className="bg-white p-4 rounded-2xl mb-4 border border-gray-100 shadow-sm flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center">
                                <View className="bg-gray-50 w-12 h-10 rounded-lg items-center justify-center mr-4 border border-gray-100">
                                    <CreditCard size={20} color="#4B5563" />
                                </View>
                                <View>
                                    <Text className="text-gray-900 font-bold capitalize">
                                        {card.brand} •••• {card.last4}
                                    </Text>
                                    <Text className="text-gray-500 text-xs">
                                        หมดอายุ {card.exp_month}/{card.exp_year}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleDeleteCard(card.id)}
                                className="p-2"
                            >
                                <Trash2 size={20} color="#EF4444" opacity={0.6} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    onPress={handleAddCard}
                    className="flex-row items-center justify-center py-4 rounded-2xl border-2 border-dashed border-gray-200 mt-2 bg-white/50"
                >
                    <Plus size={20} color="#00A862" className="mr-2" />
                    <Text className="text-primary font-bold">เพิ่มบัตรเครดิต</Text>
                </TouchableOpacity>

                <View className="mt-8 bg-blue-50 p-4 rounded-2xl flex-row items-start">
                    <CheckCircle2 size={18} color="#3B82F6" className="mr-2 mt-0.5" />
                    <Text className="text-blue-700 text-xs flex-1 leading-5">
                        บัตรของคุณจะถูกบันทึกไว้อย่างปลอดภัยผ่าน Stripe คุณไม่ต้องกรอกรายละเอียดบัตรอีกในครั้งต่อไปที่ชำระเงิน
                    </Text>
                </View>
                <View className="h-10" />
            </ScrollView>
        </SafeAreaView>
    );
}
