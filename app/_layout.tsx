import '../i18n';
import '../global.css';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { api } from '../services/api';
import { View } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { NotificationListener } from '../components/NotificationListener';

let StripeProvider: any;
try {
    StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
} catch (e) {
    console.warn("Stripe native module not found. Stripe payments will be disabled.");
    StripeProvider = ({ children }: any) => <>{children}</>;
}

// Initial Route Logic
function RootLayout() {
    const { isAuthenticated, role, user } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();
    const { setMapProvider } = useSettingsStore();

    // Fetch Map Settings
    useEffect(() => {
        const syncSettings = async () => {
            try {
                const settings = await api.getPricingSettings();
                if (settings && (settings.map === 'google' || settings.map === 'here' || settings.map === 'longdo')) {
                    setMapProvider(settings.map as 'google' | 'here' | 'longdo');
                    console.log('Map provider synced:', settings.map);
                }
            } catch (error) {
                // Just warn, not critical - app can work with default settings
                console.warn('Could not sync map settings from backend, using defaults:', error);
            }
        };

        syncSettings();
    }, []);

    // Restore user session on app start
    useEffect(() => {
        const { loadUser } = useAuthStore.getState();
        loadUser();
    }, []);

    // A driver may only work once an admin approved the account (PRD-driver-onboarding US-3/US-4);
    // `undefined` means the backend did not send the field, and must not lock anyone out - the
    // backend answers 403 driver_not_approved on the endpoints that matter anyway.
    const registrationStatus = user?.registration_status;
    const awaitingApproval =
        role === 'driver' && registrationStatus !== undefined && registrationStatus !== 'approved';

    useEffect(() => {
        if (!navigationState?.key) return;

        const inAuthGroup = segments[0] === '(auth)';
        // useSegments() is typed as a one-element tuple until expo-router typed routes are generated
        const onApprovalScreen = (segments as string[]).join('/') === '(driver)/pending-approval';

        if (isAuthenticated && inAuthGroup) {
            const { registerForPushNotificationsAsync } = require('../services/notificationService');
            registerForPushNotificationsAsync();

            if (role === 'driver') {
                router.replace(awaitingApproval ? '/(driver)/pending-approval' : '/(driver)/(tabs)/home');
            } else {
                // Not a driver, show error and logout
                const { logout } = useAuthStore.getState();
                logout();
                require('react-native').Alert.alert(
                    i18n.t('access_denied'),
                    i18n.t('driver_only_error')
                );
            }
        } else if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if token expired (mock)
            setTimeout(() => {
                router.replace('/(auth)/onboarding');
            }, 0);
        } else if (isAuthenticated && awaitingApproval && !onApprovalScreen) {
            // Approval was revoked / rejected while the app was open, or GET /auth/me came back pending
            router.replace('/(driver)/pending-approval');
        } else if (isAuthenticated && !awaitingApproval && onApprovalScreen) {
            // The admin approved while the driver waited on that screen
            router.replace('/(driver)/(tabs)/home');
        }
    }, [isAuthenticated, role, awaitingApproval, segments, navigationState?.key]);

    return (
        <I18nextProvider i18n={i18n}>
            <StripeProvider
                publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
                merchantIdentifier="merchant.com.pettransport" // optional
            >
                <Slot />
                <NotificationListener />
            </StripeProvider>
        </I18nextProvider>
    );
}

export default RootLayout;
