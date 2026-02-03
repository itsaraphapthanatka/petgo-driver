import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle2, Circle } from 'lucide-react-native';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            const data = await api.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await api.markNotificationAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            onPress={() => !item.is_read && handleMarkAsRead(item.id)}
            className={`p-4 mb-3 rounded-xl border ${item.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'}`}
        >
            <View className="flex-row items-start">
                <View className={`p-2 rounded-full mr-3 ${item.is_read ? 'bg-gray-100' : 'bg-blue-100'}`}>
                    <Bell size={20} color={item.is_read ? '#9CA3AF' : '#3B82F6'} />
                </View>
                <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className={`font-bold ${item.is_read ? 'text-gray-600' : 'text-gray-900'}`}>{item.title}</Text>
                        {!item.is_read && <View className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </View>
                    <Text className={`text-sm mb-2 ${item.is_read ? 'text-gray-500' : 'text-gray-700'}`}>{item.message}</Text>
                    <Text className="text-xs text-gray-400">
                        {format(new Date(item.created_at), 'd MMM yyyy, HH:mm', { locale: th })}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#00C853" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
            {notifications.length === 0 ? (
                <View className="flex-1 items-center justify-center p-10">
                    <View className="bg-gray-200 w-20 h-20 rounded-full items-center justify-center mb-4">
                        <Bell size={40} color="gray" />
                    </View>
                    <Text className="text-xl font-bold text-gray-400 text-center">ไม่มีการแจ้งเตือน</Text>
                    <Text className="text-gray-500 text-center mt-2">เมื่อมีข่าวสารหรืออัปเดตใหม่ๆ จะแสดงที่นี่</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderNotification}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00C853']} />
                    }
                />
            )}
        </SafeAreaView>
    );
}
