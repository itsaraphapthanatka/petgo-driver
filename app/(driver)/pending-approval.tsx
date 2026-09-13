import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Clock, XCircle, CheckCircle2, Check, AlertCircle } from 'lucide-react-native';
import { AppButton } from '../../components/ui/AppButton';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { User } from '../../types/auth';

/**
 * What a driver sees until an admin approves the account (PRD-driver-onboarding US-3/US-4).
 *
 * The root layout keeps every driver whose `registration_status` is not `approved` on this screen, and
 * the 403 `driver_not_approved` from PATCH /drivers/status and POST /orders/{id}/accept lands here too,
 * so the driver reads a real status instead of an alert that explains nothing.
 *
 * Everything comes from GET /auth/me (backend schemas.DriverOut): status, the admin's rejection
 * reason, and which documents the verification queue has. There is no upload UI in the app yet
 * (PRD non-goal), so missing documents are listed with a pointer to support.
 */

type DocumentField = Extract<
    keyof User,
    | 'id_card_front_url'
    | 'driver_license_front_url'
    | 'selfie_with_id_url'
    | 'vehicle_registration_url'
    | 'bank_account_image_url'
>;

/** The documents the admin verification modal shows (pet_transport_admin DriverVerificationModal). */
const REVIEW_DOCUMENTS: { field: DocumentField; labelKey: string }[] = [
    { field: 'id_card_front_url', labelKey: 'pending_approval.doc_id_card' },
    { field: 'driver_license_front_url', labelKey: 'pending_approval.doc_license' },
    { field: 'selfie_with_id_url', labelKey: 'pending_approval.doc_selfie' },
    { field: 'vehicle_registration_url', labelKey: 'pending_approval.doc_vehicle_registration' },
    { field: 'bank_account_image_url', labelKey: 'pending_approval.doc_bank_account' },
];

export default function PendingApprovalScreen() {
    const { t } = useTranslation();
    const { user, setUser, logout } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);
    const [refreshFailed, setRefreshFailed] = useState(false);

    // `undefined` means the backend did not send the field (older build): treat it as pending here,
    // but the root layout deliberately does not lock the driver out on a missing field.
    const status = user?.registration_status ?? 'pending';
    const isRejected = status === 'rejected';
    const isApproved = status === 'approved';

    /**
     * Re-read the driver from GET /auth/me. `useAuthStore.loadUser()` is not used on purpose: it clears
     * the whole session on *any* error, so one flaky pull-to-refresh would drop the driver at the login
     * screen. Here a failure only shows a message.
     */
    const refreshStatus = useCallback(async () => {
        setRefreshing(true);
        setRefreshFailed(false);
        try {
            const fresh = await authService.getCurrentUser();
            setUser(fresh);
        } catch {
            setRefreshFailed(true);
        } finally {
            setRefreshing(false);
        }
    }, [setUser]);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/onboarding');
    };

    const missingDocuments = REVIEW_DOCUMENTS.filter((doc) => !user?.[doc.field]);

    const statusIcon = isApproved ? (
        <CheckCircle2 size={40} color="#16A34A" />
    ) : isRejected ? (
        <XCircle size={40} color="#DC2626" />
    ) : (
        <Clock size={40} color="#D97706" />
    );

    const statusTitle = isApproved
        ? t('pending_approval.title_approved')
        : isRejected
            ? t('pending_approval.title_rejected')
            : t('pending_approval.title_pending');

    const statusBody = isApproved
        ? t('pending_approval.body_approved')
        : isRejected
            ? t('pending_approval.body_rejected')
            : t('pending_approval.body_pending');

    const vehicleSummary = [user?.vehicle_type, user?.vehicle_plate].filter(Boolean).join(' · ');

    return (
        <View className="flex-1 bg-gray-50">
            <SafeAreaView className="flex-1">
                <ScrollView
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshStatus} />}
                >
                    {/* Status */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 items-center">
                        <View
                            className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isApproved ? 'bg-green-50' : isRejected ? 'bg-red-50' : 'bg-amber-50'
                                }`}
                        >
                            {statusIcon}
                        </View>
                        <Text className="text-xl font-bold text-gray-900 text-center">{statusTitle}</Text>
                        <Text className="text-sm text-gray-600 text-center mt-2 leading-5">{statusBody}</Text>

                        {isRejected && !!user?.rejection_reason && (
                            <View className="w-full bg-red-50 border border-red-100 rounded-xl p-4 mt-5">
                                <Text className="text-xs font-bold text-red-700 uppercase mb-1">
                                    {t('pending_approval.rejection_reason_label')}
                                </Text>
                                <Text className="text-sm text-red-900">{user.rejection_reason}</Text>
                            </View>
                        )}
                    </View>

                    {/* Documents the review team needs */}
                    {!isApproved && (
                        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4">
                            <Text className="text-base font-bold text-gray-900">
                                {t('pending_approval.documents_title')}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-1 mb-4">
                                {missingDocuments.length === 0
                                    ? t('pending_approval.documents_complete')
                                    : t('pending_approval.documents_hint')}
                            </Text>

                            {REVIEW_DOCUMENTS.map((doc) => {
                                const received = !!user?.[doc.field];
                                return (
                                    <View
                                        key={doc.field}
                                        className="flex-row items-center justify-between py-2 border-b border-gray-50"
                                    >
                                        <Text className="text-sm text-gray-800 flex-1 pr-3">{t(doc.labelKey)}</Text>
                                        <View className="flex-row items-center">
                                            {received ? (
                                                <Check size={14} color="#16A34A" />
                                            ) : (
                                                <AlertCircle size={14} color="#D97706" />
                                            )}
                                            <Text
                                                className={`text-xs font-bold ml-1 ${received ? 'text-green-700' : 'text-amber-700'}`}
                                            >
                                                {received
                                                    ? t('pending_approval.doc_received')
                                                    : t('pending_approval.doc_missing')}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* What the admin sees, so the driver can spot a wrong plate or name */}
                    <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4">
                        <Text className="text-base font-bold text-gray-900 mb-3">
                            {t('pending_approval.account_title')}
                        </Text>
                        {[
                            { label: t('pending_approval.account_name'), value: user?.full_name },
                            { label: t('pending_approval.account_phone'), value: user?.phone },
                            { label: t('pending_approval.account_vehicle'), value: vehicleSummary },
                        ].map((row) => (
                            <View key={row.label} className="flex-row justify-between py-1.5">
                                <Text className="text-sm text-gray-500">{row.label}</Text>
                                <Text className="text-sm font-semibold text-gray-900 flex-1 text-right" numberOfLines={1}>
                                    {row.value || t('pending_approval.account_missing_value')}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {refreshFailed && (
                        <Text className="text-xs text-red-600 mt-4 text-center">
                            {t('pending_approval.refresh_failed')}
                        </Text>
                    )}

                    <View className="mt-6">
                        {isApproved ? (
                            <AppButton
                                title={t('pending_approval.go_home')}
                                onPress={() => router.replace('/(driver)/(tabs)/home')}
                            />
                        ) : (
                            <AppButton
                                title={t('pending_approval.refresh')}
                                onPress={refreshStatus}
                                isLoading={refreshing}
                                disabled={refreshing}
                            />
                        )}
                        <AppButton
                            title={t('pending_approval.logout')}
                            variant="ghost"
                            className="mt-2"
                            onPress={handleLogout}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
