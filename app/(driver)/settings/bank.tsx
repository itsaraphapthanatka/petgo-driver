import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Building2, User as UserIcon, CreditCard } from 'lucide-react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { AppButton } from '../../../components/ui/AppButton';
import { useRouter } from 'expo-router';

export default function BankSettingsScreen() {
    const { user, setUser } = useAuthStore();
    const router = useRouter();

    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setBankName(user.bank_name || '');
            setBankAccountNumber(user.bank_account_number || '');
            setBankAccountName(user.bank_account_name || '');
        }
    }, [user]);

    const handleSave = async () => {
        if (!bankName || !bankAccountNumber || !bankAccountName) {
            Alert.alert('คำเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
            return;
        }

        setIsSaving(true);
        try {
            await api.updateDriverBank({
                bank_name: bankName,
                bank_account_number: bankAccountNumber,
                bank_account_name: bankAccountName
            });

            if (user && setUser) {
                setUser({
                    ...user,
                    bank_name: bankName,
                    bank_account_number: bankAccountNumber,
                    bank_account_name: bankAccountName
                });
            }

            Alert.alert('สำเร็จ', 'บันทึกข้อมูลธนาคารเรียบร้อยแล้ว');
            router.back();
        } catch (error: any) {
            Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
            {/* Header */}
            <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">ข้อมูลธนาคาร</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                <View className="bg-white p-5 rounded-2xl shadow-sm mb-6">
                    <Text className="text-gray-500 mb-6 text-center">
                        ข้อมูลนี้จะใช้สำหรับการโอนรายได้ที่ได้จากการรับงานเข้ากระแสบัญชีของคุณ
                    </Text>

                    <View className="mb-4">
                        <Text className="text-gray-600 mb-1 text-sm font-medium">ชื่อธนาคาร</Text>
                        <View className="bg-gray-50 rounded-xl flex-row items-center px-4 border border-gray-100">
                            <Building2 size={18} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 p-4 text-gray-800"
                                placeholder="เช่น กสิกรไทย, ไทยพาณิชย์"
                                value={bankName}
                                onChangeText={setBankName}
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-600 mb-1 text-sm font-medium">เลขที่บัญชี</Text>
                        <View className="bg-gray-50 rounded-xl flex-row items-center px-4 border border-gray-100">
                            <CreditCard size={18} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 p-4 text-gray-800"
                                placeholder="000-0-00000-0"
                                keyboardType="numeric"
                                value={bankAccountNumber}
                                onChangeText={setBankAccountNumber}
                            />
                        </View>
                    </View>

                    <View className="mb-2">
                        <Text className="text-gray-600 mb-1 text-sm font-medium">ชื่อบัญชี</Text>
                        <View className="bg-gray-50 rounded-xl flex-row items-center px-4 border border-gray-100">
                            <UserIcon size={18} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 p-4 text-gray-800"
                                placeholder="ชื่อ-นามสกุล (ภาษาอังกฤษหรือไทย)"
                                value={bankAccountName}
                                onChangeText={setBankAccountName}
                            />
                        </View>
                    </View>
                </View>

                <AppButton
                    title={isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลสมาชิกรถยนต์"}
                    onPress={handleSave}
                    disabled={isSaving}
                    icon={<Save size={20} color="white" />}
                />
            </ScrollView>
        </SafeAreaView>
    );
}
