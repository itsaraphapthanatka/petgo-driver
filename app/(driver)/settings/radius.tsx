import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, MapPin } from 'lucide-react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { AppButton } from '../../../components/ui/AppButton';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';

export default function RadiusSettingsScreen() {
    const { user, setUser } = useAuthStore();
    const router = useRouter();
    const [workRadius, setWorkRadius] = useState(10);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user?.work_radius_km) {
            setWorkRadius(user.work_radius_km);
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateDriverWorkRadius(workRadius);

            if (user && setUser) {
                setUser({ ...user, work_radius_km: workRadius });
            }

            Alert.alert('สำเร็จ', 'บันทึกรัศมีการรับงานเรียบร้อยแล้ว');
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
                <Text className="text-xl font-bold text-gray-800">ขอบเขตการรับงาน</Text>
            </View>

            <View className="flex-1 p-4">
                <View className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                    <View className="items-center mb-8">
                        <View className="bg-green-50 p-4 rounded-full mb-4">
                            <MapPin size={40} color="#00C853" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-800">{workRadius} กม.</Text>
                        <Text className="text-gray-500 mt-1">รัศมีการรับงานรอบตัวคุณ</Text>
                    </View>

                    <Slider
                        style={{ width: '100%', height: 40 }}
                        minimumValue={2}
                        maximumValue={50}
                        step={1}
                        value={workRadius}
                        onValueChange={setWorkRadius}
                        minimumTrackTintColor="#00C853"
                        maximumTrackTintColor="#D1D5DB"
                        thumbTintColor="#00C853"
                    />

                    <View className="flex-row justify-between mt-2">
                        <Text className="text-gray-400 text-xs">2 กม.</Text>
                        <Text className="text-gray-400 text-xs">50 กม.</Text>
                    </View>
                </View>

                <View className="bg-blue-50 p-4 rounded-xl mb-8">
                    <Text className="text-blue-700 text-sm leading-5">
                        💡 การปรับรัศมีที่กว้างขึ้นอาจช่วยให้คุณมีโอกาสได้รับงานมากขึ้น แต่ควรพิจารณาความพร้อมในการเดินทางด้วย
                    </Text>
                </View>

                <AppButton
                    title={isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                    onPress={handleSave}
                    disabled={isSaving}
                    icon={<Save size={20} color="white" />}
                />
            </View>
        </SafeAreaView>
    );
}
