import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, Lock, User, Phone, KeyRound, Hash } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { api } from '../../services/api';
import { AppButton } from '../../components/ui/AppButton';
import { AppInput } from '../../components/ui/AppInput';

type VehicleOption = { key: string; name: string };

// Mirrors PHONE_REGEX in backend app/routers/auth.py
const THAI_PHONE_REGEX = /^(\+66|66|0)\d{8,9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 6;
// Fallback when GET /pricing/vehicle-types is unreachable; mirrors the backend's own fallback (PRICING_RATES keys)
const DEFAULT_VEHICLE_TYPES: VehicleOption[] = [
    { key: 'car', name: 'CAR' },
    { key: 'suv', name: 'SUV' },
    { key: 'van', name: 'VAN' },
];

// Strip spaces/dashes only. The backend stores `phone` exactly as sent and matches it exactly on
// /auth/driver/login, so we deliberately do not rewrite 08x -> +668x here: the driver must be able to
// log in later with the same number they typed. OTP matching is normalized server-side for both formats.
const normalizePhone = (raw: string) => raw.replace(/[\s-]/g, '');

export default function RegisterScreen() {
    const { t } = useTranslation();

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [vehicleTypes, setVehicleTypes] = useState<VehicleOption[]>(DEFAULT_VEHICLE_TYPES);
    const [vehicleType, setVehicleType] = useState<string>(DEFAULT_VEHICLE_TYPES[0].key);
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [debugOTP, setDebugOTP] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const { register, isLoading, clearError } = useAuthStore();

    // Vehicle types come from the same public endpoint the customer app uses to price a ride,
    // so the driver's vehicle_type always matches a real pricing key.
    useEffect(() => {
        let cancelled = false;
        api.getVehicleTypes()
            .then((list) => {
                if (cancelled || list.length === 0) return;
                setVehicleTypes(list.map((v) => ({ key: v.key, name: v.name })));
                setVehicleType((current) => (list.some((v) => v.key === current) ? current : list[0].key));
            })
            .catch(() => {
                // api.getVehicleTypes already warns; keep DEFAULT_VEHICLE_TYPES
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPlate = vehiclePlate.trim();
    const normalizedPhone = normalizePhone(phone);

    const canSubmit =
        trimmedName.length > 0 &&
        normalizedPhone.length > 0 &&
        password.length > 0 &&
        otpSent &&
        otp.length === OTP_LENGTH &&
        vehicleType.length > 0 &&
        trimmedPlate.length > 0 &&
        agreeToTerms;

    const handlePhoneChange = (text: string) => {
        setPhone(text);
        if (otpSent) {
            // The OTP is bound to the phone it was requested for
            setOtpSent(false);
            setOtp('');
            setDebugOTP('');
        }
    };

    const handleRequestOTP = async () => {
        if (!THAI_PHONE_REGEX.test(normalizedPhone)) {
            Alert.alert(t('error'), t('register_screen.error_invalid_phone'));
            return;
        }

        setOtpSending(true);
        try {
            const response = await authService.requestOTP(normalizedPhone);
            setOtpSent(true);
            setOtp('');
            setDebugOTP(response.debug_otp ?? '');
            Alert.alert(t('register_screen.otp_sent'), t('register_screen.otp_sent_desc', { phone: normalizedPhone }));
        } catch (error: any) {
            Alert.alert(t('error'), error.message || t('register_screen.otp_request_failed'));
        } finally {
            setOtpSending(false);
        }
    };

    const handleRegister = async () => {
        if (!trimmedName || !normalizedPhone || !password || !vehicleType || !trimmedPlate) {
            Alert.alert(t('error'), t('register_screen.error_required_fields'));
            return;
        }
        if (!THAI_PHONE_REGEX.test(normalizedPhone)) {
            Alert.alert(t('error'), t('register_screen.error_invalid_phone'));
            return;
        }
        if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
            Alert.alert(t('error'), t('register_screen.error_invalid_email'));
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            Alert.alert(t('error'), t('register_screen.error_password_length'));
            return;
        }
        if (!otpSent || otp.length !== OTP_LENGTH) {
            Alert.alert(t('error'), t('register_screen.error_otp_required'));
            return;
        }
        if (!agreeToTerms) {
            Alert.alert(t('error'), t('register_screen.error_agree_terms'));
            return;
        }

        try {
            clearError();
            await register({
                full_name: trimmedName,
                phone: normalizedPhone,
                email: trimmedEmail || undefined,
                password,
                vehicle_type: vehicleType,
                vehicle_plate: trimmedPlate,
                otp,
            });
            // Navigation handled by app/_layout.tsx based on role
        } catch (error: any) {
            Alert.alert(t('register_screen.register_failed'), error.message || t('register_screen.register_failed_desc'));
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6" keyboardShouldPersistTaps="handled">

                    <TouchableOpacity onPress={() => router.back()} className="mt-4 mb-6">
                        <ArrowLeft color="black" size={24} />
                    </TouchableOpacity>

                    <View className="mb-8">
                        <Text className="text-3xl font-bold text-gray-900">{t('register_screen.title')}</Text>
                        <Text className="text-gray-500 mt-2">{t('register_screen.subtitle')}</Text>
                    </View>

                    <View className="space-y-4">
                        <AppInput
                            label={t('register_screen.full_name')}
                            placeholder={t('register_screen.full_name_placeholder')}
                            value={fullName}
                            onChangeText={setFullName}
                            icon={<User size={20} color="gray" />}
                        />

                        <AppInput
                            label={t('register_screen.phone')}
                            placeholder={t('register_screen.phone_placeholder')}
                            value={phone}
                            onChangeText={handlePhoneChange}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            icon={<Phone size={20} color="gray" />}
                            containerClassName="mb-2"
                        />
                        <AppButton
                            title={otpSent ? t('register_screen.resend_otp') : t('register_screen.send_otp')}
                            variant="outline"
                            size="sm"
                            onPress={handleRequestOTP}
                            isLoading={otpSending}
                            className="mb-4"
                        />

                        {otpSent && (
                            <View>
                                <AppInput
                                    label={t('register_screen.otp')}
                                    placeholder={t('register_screen.otp_placeholder')}
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={OTP_LENGTH}
                                    icon={<KeyRound size={20} color="gray" />}
                                    containerClassName={debugOTP ? 'mb-1' : undefined}
                                />
                                {debugOTP ? (
                                    <Text className="text-sm text-orange-600 mb-4">{t('register_screen.dev_otp', { otp: debugOTP })}</Text>
                                ) : null}
                            </View>
                        )}

                        <AppInput
                            label={t('register_screen.email_optional')}
                            placeholder={t('register_screen.email_placeholder')}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            icon={<Mail size={20} color="gray" />}
                        />
                        <AppInput
                            label={t('register_screen.password')}
                            placeholder="********"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            icon={<Lock size={20} color="gray" />}
                        />

                        <View className="mb-4">
                            <Text className="text-gray-700 font-medium mb-1.5">{t('register_screen.vehicle_type')}</Text>
                            <View className="flex-row flex-wrap">
                                {vehicleTypes.map((v) => {
                                    const selected = v.key === vehicleType;
                                    return (
                                        <TouchableOpacity
                                            key={v.key}
                                            onPress={() => setVehicleType(v.key)}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected }}
                                            className={`px-4 py-2 mr-2 mb-2 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-300'}`}
                                        >
                                            <Text className={`font-semibold ${selected ? 'text-white' : 'text-gray-700'}`}>{v.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <AppInput
                            label={t('register_screen.vehicle_plate')}
                            placeholder={t('register_screen.vehicle_plate_placeholder')}
                            value={vehiclePlate}
                            onChangeText={setVehiclePlate}
                            autoCapitalize="characters"
                            icon={<Hash size={20} color="gray" />}
                        />

                        <TouchableOpacity
                            onPress={() => setAgreeToTerms(!agreeToTerms)}
                            className="flex-row items-start mb-6 mt-2"
                        >
                            <View className={`w-5 h-5 border ${agreeToTerms ? 'bg-primary border-primary' : 'border-gray-400'} rounded mr-3 mt-0.5 items-center justify-center`}>
                                {agreeToTerms && <Text className="text-white text-xs">✓</Text>}
                            </View>
                            <Text className="flex-1 text-gray-500 text-sm">
                                {t('register_screen.agree_prefix')} <Text className="text-primary font-bold">{t('register_screen.terms')}</Text> {t('register_screen.and')} <Text className="text-primary font-bold">{t('register_screen.privacy')}</Text>
                            </Text>
                        </TouchableOpacity>

                        <AppButton
                            title={t('register_screen.sign_up')}
                            onPress={handleRegister}
                            isLoading={isLoading}
                            disabled={!canSubmit || isLoading}
                        />
                    </View>

                    <View className="flex-row justify-center mt-8 mb-8">
                        <Text className="text-gray-500">{t('register_screen.already_have_account')} </Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text className="text-primary font-bold">{t('register_screen.login')}</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
