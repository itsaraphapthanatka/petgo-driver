import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/useAuthStore';
import { useJobStore } from '../../../store/useJobStore';
import { AppButton } from '../../../components/ui/AppButton';
import { MapPin, Navigation, AlertCircle, Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { Order } from '../../../types/order';
import * as Location from 'expo-location';
import { api } from '../../../services/api';
import { orderService } from '../../../services/orderService';
import { formatPrice } from '../../../utils/format';

export default function DriverHomeScreen() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const role = user?.role;
    const { pendingJobs, isLoading, error, fetchPendingJobs, acceptJob, declineJob } = useJobStore();
    const [isOnline, setIsOnline] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [acceptingJobId, setAcceptingJobId] = useState<number | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const lastSentLocationRef = React.useRef<{ lat: number; lng: number } | null>(null);

    // Check if user is actually a driver
    React.useEffect(() => {
        if (user && user.role !== 'driver') {
            Alert.alert(
                "ข้อผิดพลาด - ไม่ใช่บัญชีคนขับ",
                `คุณกำลังเข้าแอปคนขับด้วยบัญชี${user.role === 'customer' ? 'ลูกค้า' : 'ผู้ใช้ทั่วไป'} กรุณาออกจากระบบและเข้าสู่ระบบด้วยบัญชีคนขับ`,
                [
                    {
                        text: "ออกจากระบบ",
                        onPress: () => {
                            const { logout } = useAuthStore.getState();
                            logout();
                        }
                    }
                ]
            );
        }
    }, [user]);

    // Check for active job on mount
    useEffect(() => {
        (async () => {
            try {
                const activeJob = await orderService.getActiveOrder();
                if (activeJob) {
                    console.log(`[Home] Active job found: ${activeJob.id}. Redirecting...`);
                    router.push(`/(driver)/job/${activeJob.id}`);
                }
            } catch (err) {
                console.error("Failed to check for active job:", err);
            }
        })();
    }, []);

    const handleToggleOnline = async (value: boolean) => {
        if (isUpdatingStatus) return;

        // Prevent non-drivers from going online
        if (user?.role !== 'driver') {
            Alert.alert(
                "ไม่สามารถดำเนินการได้",
                "คุณต้องเข้าสู่ระบบด้วยบัญชีคนขับเพื่อใช้ฟีเจอร์นี้",
                [{ text: "ตกลง" }]
            );
            return;
        }

        setIsUpdatingStatus(true);
        console.log(`[Status] Toggling status to: ${value ? 'Online' : 'Offline'}`);
        try {
            let lat, lng;
            if (value) {
                // Check permissions first
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Permission Denied',
                        'Location permission is required to go online and receive jobs. Please enable it in your device settings.',
                        [{ text: 'OK' }]
                    );
                    setIsUpdatingStatus(false);
                    return;
                }

                // If going online, get current location first
                const location = await Location.getCurrentPositionAsync({});
                lat = location.coords.latitude;
                lng = location.coords.longitude;
                console.log("[Status] Initial location for online toggle:", { lat, lng });

                // Track this as the last sent location to prevent redundant update in effect
                lastSentLocationRef.current = { lat, lng };
            }

            await api.updateDriverStatus(value, lat, lng);
            setIsOnline(value);
        } catch (error) {
            console.error("Failed to update driver status:", error);
            Alert.alert("Status Error", "Failed to update online status. Please check your connection.");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Services management based on isOnline state (polling & tracking)
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription | null = null;
        let jobInterval: NodeJS.Timeout | null = null;

        const startServices = async () => {
            if (isOnline) {
                console.log("Status: ONLINE - Starting tracking & polling");

                // 1. Start Job Polling
                fetchPendingJobs();
                jobInterval = setInterval(fetchPendingJobs, 10000);

                // 2. Start Location Tracking
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Permission Denied', 'Location permission is required to receive jobs.');
                        return;
                    }

                    // Watch for changes (every 50m or 10s)
                    locationSubscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            timeInterval: 10000,
                            distanceInterval: 50,
                        },
                        async (newLocation) => {
                            const { latitude: lat, longitude: lng } = newLocation.coords;

                            // Check if location actually changed significantly to avoid duplicate inserts
                            if (lastSentLocationRef.current &&
                                lastSentLocationRef.current.lat === lat &&
                                lastSentLocationRef.current.lng === lng) {
                                console.log("[Status] Skipping duplicate location update");
                                return;
                            }

                            console.log("[Status] Background location update:", newLocation.coords);
                            await api.updateDriverLocation(0, lat, lng);
                            lastSentLocationRef.current = { lat, lng };
                        }
                    );
                } catch (err) {
                    console.error("Error setting up location tracking:", err);
                }
            } else {
                console.log("Status: OFFLINE - Services stopped");
            }
        };

        startServices();

        return () => {
            if (jobInterval) clearInterval(jobInterval);
            if (locationSubscription) {
                console.log("Cleaning up location watcher");
                locationSubscription.remove();
            }
        };
    }, [isOnline, user?.id]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPendingJobs();
        setRefreshing(false);
    }, []);

    const handleAcceptJob = async (job: Order) => {
        if (!user?.id) {
            console.error('User not found');
            return;
        }

        setAcceptingJobId(job.id);
        try {
            await acceptJob(job.id);
            router.push(`/(driver)/job/${job.id}`);
        } catch (error: any) {
            console.error('Failed to accept job:', error);
            const errorMessage = error.message || '';

            // Check for 403 or specific error message from backend
            if (errorMessage.includes('403') || errorMessage.includes('ยอดเงินในกระเป๋าติดลบเกิน 500 บาท') || errorMessage.includes('Insufficient wallet balance')) {
                Alert.alert(
                    "ยอดเงินไม่เพียงพอ",
                    "ยอดเงินในกระเป๋าของคุณติดลบเกิน 500 บาท กรุณาเติมเงินเข้าระบบเพื่อรับงานต่อ",
                    [
                        { text: "ยกเลิก", style: "cancel" },
                        {
                            text: "ไปหน้ากระเป๋าเงิน",
                            onPress: () => router.push('/(driver)/wallet')
                        }
                    ]
                );
            } else {
                Alert.alert("ไม่สามารถรับงานได้", "เกิดข้อผิดพลาดในการรับงาน กรุณาลองใหม่อีกครั้ง");
            }
        } finally {
            setAcceptingJobId(null);
        }
    };

    const handleDeclineJob = (jobId: number) => {
        Alert.alert(
            "Decline Job",
            "Are you sure you want to decline this request?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Decline",
                    style: "destructive",
                    onPress: () => {
                        declineJob(jobId);
                    }
                }
            ]
        );
    };

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1);
    };

    const getPetEmoji = (petType?: string | null) => {
        switch (petType?.toLowerCase()) {
            case 'dog': return '🐶';
            case 'cat': return '🐱';
            case 'bird': return '🐦';
            case 'rabbit': return '🐰';
            default: return '🐾';
        }
    };

    const renderJob = ({ item: job }: { item: Order }) => {
        const distance = getDistance(
            job.pickup_lat,
            job.pickup_lng,
            job.dropoff_lat,
            job.dropoff_lng
        );

        return (
            <View className="bg-white p-5 rounded-xl shadow-sm mb-4 border border-gray-100">
                <View className="flex-row justify-between mb-4">
                    <View className="flex-row space-x-2">
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                            <Text className="text-green-700 font-bold text-xs">{distance} km</Text>
                        </View>
                        {job.stops?.length > 0 && (
                            <View className="bg-orange-100 px-3 py-1 rounded-full">
                                <Text className="text-orange-700 font-bold text-xs">{job.stops.length} STOPS</Text>
                            </View>
                        )}
                    </View>
                    <View className="items-end">
                        <Text className="text-xl font-bold text-green-600">
                            ฿{job.price ? formatPrice(job.price) : '-'}
                        </Text>
                        {job.is_round_trip && (
                            <View className="bg-blue-100 px-2 py-0.5 rounded mt-1 items-center flex-row">
                                <Text className="text-blue-700 font-bold text-[10px] mr-1">🔁 ไป-กลับ</Text>
                                <Text className="text-blue-600 text-[10px] ml-1">{job.return_time}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View className="mb-4">
                    <View className="flex-row items-center mb-2">
                        <MapPin size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                        <View className="flex-1">
                            <Text className="font-semibold text-gray-800" numberOfLines={1}>
                                {job.pickup_address}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <MapPin size={16} color="#EF4444" style={{ marginRight: 8 }} />
                        <View className="flex-1">
                            <Text className="font-semibold text-gray-800" numberOfLines={1}>
                                {job.dropoff_address}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="bg-gray-50 p-3 rounded-lg flex-row items-center mb-4">
                    <Text className="text-lg mr-2">{getPetEmoji(job.pet?.type)}</Text>
                    <View className="flex-1">
                        {/* Display multiple pets if available in array */}
                        {job.pets && job.pets.length > 0 ? (
                            job.pets.map((pet, index) => (
                                <View key={pet.id || index} className="mb-1">
                                    <Text className="text-gray-800 font-medium">
                                        {pet.name}
                                    </Text>
                                    <Text className="text-gray-500 text-xs">
                                        {pet.type} {pet.breed ? `(${pet.breed})` : ''} • {pet.weight ? `${pet.weight}kg` : ''}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            // Fallback to single pet or details string
                            <>
                                <Text className="text-gray-800 font-medium">
                                    {job.pet_details || job.pet?.name || 'Pet'}
                                </Text>
                                <Text className="text-gray-500 text-xs">
                                    {job.pet?.type} {job.pet?.breed ? `(${job.pet.breed})` : ''} • {job.pet?.weight ? `${job.pet.weight}kg` : ''}
                                </Text>
                            </>
                        )}
                        {job.passengers && (
                            <Text className="text-gray-500 text-xs mt-1">
                                Passengers: {job.passengers}
                            </Text>
                        )}
                    </View>
                </View>

                <View className="flex-row items-center mb-4 bg-blue-50 p-3 rounded-lg">
                    <Text className="text-gray-600 text-sm flex-1">
                        Customer: <Text className="font-semibold">{job.customer?.full_name || 'Unknown'}</Text>
                    </Text>
                </View>

                <View className="flex-row space-x-3">
                    <AppButton
                        title="Decline"
                        variant="secondary"
                        className="flex-1 bg-gray-200"
                        textClassName="text-gray-600"
                        onPress={() => handleDeclineJob(job.id)}
                    />
                    <AppButton
                        title="ดูรายละเอียด"
                        className="flex-1"
                        onPress={() => router.push(`/(driver)/job-preview/${job.id}`)}
                    />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
            {/* Header Status */}
            <View className="bg-white p-5 shadow-sm flex-row justify-between items-center mb-4">
                <View>
                    <Text className="text-gray-500 text-xs">{t('driver_status')}</Text>
                    <Text className={`font-bold text-lg ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                        {isOnline ? t('online') : t('offline')}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    {/* Notification Bell Icon */}
                    <TouchableOpacity
                        onPress={() => router.push('/(driver)/notifications')}
                        className="mr-4 p-2"
                    >
                        <Bell size={24} color="#4B5563" />
                    </TouchableOpacity>

                    {isUpdatingStatus && <ActivityIndicator size="small" color="#00C853" style={{ marginRight: 8 }} />}
                    <Switch
                        value={isOnline}
                        onValueChange={handleToggleOnline}
                        trackColor={{ false: "#767577", true: "#00C853" }}
                        disabled={isUpdatingStatus}
                    />
                </View>
            </View>

            {!isOnline ? (
                <View className="flex-1 items-center justify-center p-10">
                    <View className="bg-gray-200 w-20 h-20 rounded-full items-center justify-center mb-4">
                        <Navigation size={40} color="gray" />
                    </View>
                    <Text className="text-xl font-bold text-gray-400 text-center">{t('you_are_offline')}</Text>
                    <Text className="text-gray-500 text-center mt-2">{t('offline_desc')}</Text>
                </View>
            ) : isLoading && pendingJobs.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#00C853" />
                    <Text className="text-gray-500 mt-4">{t('loading_jobs')}</Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center p-10">
                    <AlertCircle size={48} color="#EF4444" />
                    <Text className="text-red-500 font-bold mt-4 text-center">{error}</Text>
                    <AppButton
                        title={t('retry')}
                        onPress={fetchPendingJobs}
                        className="mt-4"
                    />
                </View>
            ) : pendingJobs.length === 0 ? (
                <View className="flex-1 items-center justify-center p-10">
                    <View className="bg-green-100 w-20 h-20 rounded-full items-center justify-center mb-4">
                        <Navigation size={40} color="#00C853" />
                    </View>
                    <Text className="text-xl font-bold text-gray-600 text-center">{t('no_jobs_online')}</Text>
                    <Text className="text-gray-500 text-center mt-2">{t('waiting_requests')}</Text>
                </View>
            ) : (
                <FlatList
                    data={pendingJobs}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 20 }}
                    ListHeaderComponent={() => (
                        <Text className="text-lg font-bold mb-4">
                            {t('incoming_requests')} ({pendingJobs.length})
                        </Text>
                    )}
                    renderItem={renderJob}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#00C853']}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}
