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

let StripeProvider: any;
try {
    StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
} catch (e) {
    console.warn("Stripe native module not found. Stripe payments will be disabled.");
    StripeProvider = ({ children }: any) => <>{children}</>;
}

// Initial Route Logic
function RootLayout() {
    const { isAuthenticated, role } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();
    const navigationState = useRootNavigationState();
    const { setMapProvider } = useSettingsStore();

    // Fetch Map Settings
    useEffect(() => {
        const syncSettings = async () => {
            try {
                const settings = await api.getPricingSettings();
                if (settings && (settings.map === 'google' || settings.map === 'here')) {
                    setMapProvider(settings.map as 'google' | 'here');
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

    useEffect(() => {
        if (!navigationState?.key) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (isAuthenticated && inAuthGroup) {
            router.replace('/(customer)/(tabs)/home');
        } else if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if token expired (mock)
            setTimeout(() => {
                router.replace('/(auth)/onboarding');
            }, 0);
        }
    }, [isAuthenticated, role, segments, navigationState?.key]);

    return (
        <I18nextProvider i18n={i18n}>
            <StripeProvider
                publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
                merchantIdentifier="merchant.com.pettransport" // optional
            >
                <Slot />
            </StripeProvider>
        </I18nextProvider>
    );
}

export default RootLayout;
