import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, Modal, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';
import { Mail, Lock, Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [debugOTP, setDebugOTP] = useState('');

    const { loginWithPassword, loginWithOTP, isLoading, error, clearError, role } = useAuthStore();
    const { t } = useTranslation();
    const { mapProvider } = useSettingsStore();

    const handlePasswordLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please enter both email/phone and password');
            return;
        }

        try {
            clearError();
            await loginWithPassword(username, password);
            // Navigation handled by _layout.tsx based on role
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid credentials');
        }
    };

    const handleRequestOTP = async () => {
        if (!phoneNumber) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }

        try {
            const response = await authService.requestOTP(phoneNumber);
            setOtpSent(true);
            if (response.debug_otp) {
                setDebugOTP(response.debug_otp);
                Alert.alert('OTP Sent', `OTP sent to ${phoneNumber}\nDev OTP: ${response.debug_otp}`);
            } else {
                Alert.alert('OTP Sent', `OTP sent to ${phoneNumber}`);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send OTP');
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp) {
            Alert.alert('Error', 'Please enter the OTP code');
            return;
        }

        try {
            clearError();
            await loginWithOTP(phoneNumber, otp);
            setShowOTPModal(false);
            // Navigation handled by _layout.tsx based on role
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Invalid OTP');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="px-6">

                    <View className="items-center mb-10">
                        <View className="w-20 h-20 bg-green-100 rounded-2xl items-center justify-center mb-4 transform -rotate-6">
                            <Text className="text-4xl">🐾</Text>
                        </View>
                        <Text className="text-3xl font-bold text-gray-900">{t('login_screen.title')}</Text>
                        <Text className="text-gray-500 mt-2">{t('login_screen.subtitle')}</Text>
                    </View>

                    <View className="space-y-4">
                        <AppInput
                            label={t('login_screen.email')}
                            placeholder="email@example.com or +66812345678"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            icon={<Mail size={20} color="gray" />}
                        />
                        <AppInput
                            label={t('login_screen.password')}
                            placeholder="********"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            icon={<Lock size={20} color="gray" />}
                        />

                        <TouchableOpacity className="items-end mb-6">
                            <Text className="text-primary font-semibold">{t('login_screen.forgot_password')}</Text>
                        </TouchableOpacity>

                        <AppButton
                            title={t('login_screen.login_as_customer')}
                            onPress={handlePasswordLogin}
                            isLoading={isLoading}
                        />

                        <View className="flex-row items-center my-6">
                            <View className="flex-1 h-px bg-gray-300" />
                            <Text className="mx-4 text-gray-500">OR</Text>
                            <View className="flex-1 h-px bg-gray-300" />
                        </View>

                        <AppButton
                            title="Login with OTP"
                            variant="outline"
                            onPress={() => setShowOTPModal(true)}
                        />
                    </View>

                    <View className="flex-row justify-center mt-10">
                        <Text className="text-gray-500">{t('login_screen.dont_have_account')} </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text className="text-primary font-bold">{t('login_screen.sign_up')}</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="items-center mt-8 mb-4">
                        <Text className="text-[10px] text-gray-400 font-medium tracking-tight">
                            API: {process.env.EXPO_PUBLIC_API_BASE_URL}
                        </Text>
                        <View className="flex-row items-center mt-1">
                            <View className="w-1 h-1 rounded-full bg-green-400 mr-2" />
                            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Map Provider: {mapProvider}
                            </Text>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* OTP Modal */}
            <Modal
                visible={showOTPModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setShowOTPModal(false);
                    setOtpSent(false);
                    setOtp('');
                    setPhoneNumber('');
                }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View className="flex-1 justify-end bg-black/50">
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <View className="bg-white rounded-t-3xl p-6 min-h-[400px]">
                                <Text className="text-2xl font-bold text-gray-900 mb-2">Login with OTP</Text>
                                <Text className="text-gray-500 mb-6">Enter your phone number to receive a one-time password</Text>

                                <AppInput
                                    label="Phone Number"
                                    placeholder="+66812345678"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    keyboardType="phone-pad"
                                    icon={<Phone size={20} color="gray" />}
                                    editable={!otpSent}
                                />

                                {otpSent && (
                                    <View className="mt-4">
                                        <AppInput
                                            label="OTP Code"
                                            placeholder="Enter 6-digit code"
                                            value={otp}
                                            onChangeText={(text) => {
                                                setOtp(text);
                                                if (text.length === 6) {
                                                    Keyboard.dismiss();
                                                }
                                            }}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                        {debugOTP && (
                                            <Text className="text-sm text-orange-600 mt-2">Dev OTP: {debugOTP}</Text>
                                        )}
                                    </View>
                                )}

                                <View className="mt-6 space-y-3">
                                    {!otpSent ? (
                                        <AppButton
                                            title="Request OTP"
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                handleRequestOTP();
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <AppButton
                                                title="Verify OTP"
                                                onPress={() => {
                                                    Keyboard.dismiss();
                                                    handleVerifyOTP();
                                                }}
                                                isLoading={isLoading}
                                            />
                                            <AppButton
                                                title="Request New OTP"
                                                variant="outline"
                                                onPress={() => {
                                                    Keyboard.dismiss();
                                                    handleRequestOTP();
                                                }}
                                            />
                                        </>
                                    )}
                                    <AppButton
                                        title="Cancel"
                                        variant="ghost"
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setShowOTPModal(false);
                                            setOtpSent(false);
                                            setOtp('');
                                            setPhoneNumber('');
                                        }}
                                    />
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}
