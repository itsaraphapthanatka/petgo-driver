import React, { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';

export const NotificationListener: React.FC = () => {
    const { t } = useTranslation();
    const { user, isAuthenticated } = useAuthStore();
    const router = useRouter();
    const lastCheckTime = useRef<Date>(new Date());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Handle Push Notification Tap (Background/Terminated -> Foreground)
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as { order_id?: number; notification_id?: number };
            const orderId = data?.order_id;
            const notificationId = data?.notification_id;

            if (notificationId) {
                api.markNotificationAsRead(notificationId);
            }

            if (orderId) {
                router.push({
                    pathname: "/(customer)/chat/[orderId]",
                    params: { orderId }
                } as any);
            } else {
                router.push("/(customer)/notifications" as any);
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            // ... existing polling logic ...
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const checkNotifications = async () => {
            try {
                const notifications = await api.getNotifications();
                if (notifications && notifications.length > 0) {
                    // Filter for new unread notifications that were created after last check
                    // For simplicity in this mock-like environment, we'll just check the most recent unread one
                    const unread = notifications.filter(n => !n.is_read);

                    if (unread.length > 0) {
                        const latest = unread[0];

                        // Check if it's a chat notification
                        if (latest.title === "ข้อความใหม่" || latest.message.includes("ข้อความ")) {
                            // Try to parse order_id from message: (งาน #123)
                            const orderIdMatch = latest.message.match(/#(\d+)/);
                            const orderId = orderIdMatch ? orderIdMatch[1] : null;

                            Alert.alert(
                                latest.title,
                                latest.message,
                                [
                                    {
                                        text: t('cancel'), style: 'cancel', onPress: () => {
                                            api.markNotificationAsRead(latest.id);
                                        }
                                    },
                                    {
                                        text: t('chat'),
                                        onPress: async () => {
                                            await api.markNotificationAsRead(latest.id);
                                            if (orderId) {
                                                router.push({
                                                    pathname: "/(customer)/chat/[orderId]",
                                                    params: { orderId }
                                                } as any);
                                            } else {
                                                router.push("/(customer)/notifications" as any);
                                            }
                                        }
                                    }
                                ]
                            );
                        } else {
                            // General notification
                            Alert.alert(
                                latest.title,
                                latest.message,
                                [
                                    { text: "OK", onPress: () => api.markNotificationAsRead(latest.id) }
                                ]
                            );
                        }
                    }
                }
            } catch (error) {
                // Silently fail polling errors
            }
        };

        // Poll every 10 seconds
        intervalRef.current = setInterval(checkNotifications, 10000);

        // Initial check
        checkNotifications();

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isAuthenticated, user]);

    return null;
};
