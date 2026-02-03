import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapView from 'react-native-maps';
import { AppMapView } from '../../../components/AppMapView';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { Order } from '../../../types/order';
import { orderService } from '../../../services/orderService';
import { hereMapApi, LatLng } from '../../../services/hereMapApi';
import { formatPrice } from '../../../utils/format';
import { AppButton } from '../../../components/ui/AppButton';
import { useJobStore } from '../../../store/useJobStore';
import { useAuthStore } from '../../../store/useAuthStore';

const HERE_API_KEY = process.env.EXPO_PUBLIC_HERE_MAPS_API_KEY || "";
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function JobPreviewScreen() {
    const { id } = useLocalSearchParams();
    const { acceptJob } = useJobStore();
    const { user } = useAuthStore();
    const mapRef = useRef<MapView>(null);

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [routeCoordinates, setRouteCoordinates] = useState<LatLng[]>([]);
    const [isAccepting, setIsAccepting] = useState(false);
    const [distance, setDistance] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);

    // Fetch order details
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const fetchedOrder = await orderService.getOrder(Number(id));
                setOrder(fetchedOrder);

                // Fetch route
                const origin = {
                    latitude: fetchedOrder.pickup_lat,
                    longitude: fetchedOrder.pickup_lng
                };
                const destination = {
                    latitude: fetchedOrder.dropoff_lat,
                    longitude: fetchedOrder.dropoff_lng
                };

                const route = await hereMapApi.getHereRoute(
                    origin,
                    destination,
                    fetchedOrder.stops.map(s => ({ latitude: s.lat, longitude: s.lng })),
                    HERE_API_KEY
                );
                setRouteCoordinates(route);

                // Calculate distance
                const dist = getDistance(
                    fetchedOrder.pickup_lat,
                    fetchedOrder.pickup_lng,
                    fetchedOrder.dropoff_lat,
                    fetchedOrder.dropoff_lng
                );
                setDistance(dist);

                // Estimate duration (rough estimate: avg 40 km/h in city)
                setDuration(Math.round((dist / 40) * 60));

                // Fit map to route
                if (mapRef.current && route.length > 0) {
                    setTimeout(() => {
                        mapRef.current?.fitToCoordinates(route, {
                            edgePadding: { top: 100, right: 50, bottom: SCREEN_HEIGHT * 0.5 + 50, left: 50 },
                            animated: true,
                        });
                    }, 500);
                }
            } catch (error) {
                console.error('Failed to fetch order:', error);
                Alert.alert('Error', 'Failed to load job details');
                router.back();
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleConfirmBooking = async () => {
        if (!order || !user?.id) return;

        setIsAccepting(true);
        try {
            await acceptJob(order.id);
            router.replace(`/(driver)/job/${order.id}`);
        } catch (error: any) {
            console.error('Failed to accept job:', error);
            const errorMessage = error.message || '';

            if (errorMessage.includes('403') || errorMessage.includes('ยอดเงินในกระเป๋าติดลบเกิน 500 บาท') || errorMessage.includes('Insufficient wallet balance')) {
                Alert.alert(
                    "ยอดเงินไม่เพียงพอ",
                    "ยอดเงินในกระเป๋าของคุณติดลบเกิน 500 บาท กรุณาเติมเงินเข้าระบบเพื่อรับงานต่อ",
                    [
                        { text: "ยกเลิก", style: "cancel", onPress: () => setIsAccepting(false) },
                        {
                            text: "ไปหน้ากระเป๋าเงิน",
                            onPress: () => router.push('/(driver)/wallet')
                        }
                    ]
                );
            } else {
                Alert.alert("ไม่สามารถรับงานได้", "เกิดข้อผิดพลาดในการรับงาน กรุณาลองใหม่อีกครั้ง");
                setIsAccepting(false);
            }
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#00A862" />
                <Text className="text-gray-500 mt-4">กำลังโหลดข้อมูล...</Text>
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 bg-white items-center justify-center p-8">
                <Text className="text-xl font-bold text-gray-800 mb-2">ไม่พบงาน</Text>
                <AppButton title="กลับ" onPress={() => router.back()} />
            </View>
        );
    }

    const serviceFare = order.price ? order.price * 0.7 : 0;
    const surgeFare = order.price ? order.price * 0.2 : 0;
    const hasSurge = surgeFare > 0;

    return (
        <View className="flex-1 bg-white">
            {/* Map */}
            <AppMapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: (order.pickup_lat + order.dropoff_lat) / 2,
                    longitude: (order.pickup_lng + order.dropoff_lng) / 2,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
            >
                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeWidth={5}
                        strokeColor="#3B82F6"
                    />
                )}

                {/* Pickup Marker */}
                <Marker
                    coordinate={{ latitude: order.pickup_lat, longitude: order.pickup_lng }}
                    title="Pickup"
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <View className="bg-white p-2 rounded-full border-2 border-blue-500 shadow-lg">
                        <View className="w-3 h-3 bg-blue-500 rounded-full" />
                    </View>
                </Marker>

                {/* Dropoff Marker */}
                <Marker
                    coordinate={{ latitude: order.dropoff_lat, longitude: order.dropoff_lng }}
                    title="Dropoff"
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <View className="bg-white p-2 rounded-full border-2 border-red-500 shadow-lg">
                        <View className="w-3 h-3 bg-red-500 rounded-full" />
                    </View>
                </Marker>
            </AppMapView>

            {/* Back Button */}
            <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-12 left-5 bg-white p-3 rounded-full shadow-lg z-10"
            >
                <ArrowLeft size={24} color="black" />
            </TouchableOpacity>

            {/* Bottom Sheet */}
            <View
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    maxHeight: SCREEN_HEIGHT * 0.65,
                    backgroundColor: 'white',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 10,
                }}
            >
                <View className="w-full items-center pt-3 pb-2">
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </View>

                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-5">
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-gray-900">รายละเอียดงาน</Text>
                            <Text className="text-gray-500 text-sm mt-1">
                                {distance.toFixed(1)} km • {duration} นาที
                            </Text>
                        </View>
                        <View className="bg-green-100 px-4 py-2 rounded-xl">
                            <Text className="text-green-700 font-bold text-xl">
                                ฿{order.price ? formatPrice(order.price) : '-'}
                            </Text>
                        </View>
                    </View>

                    {/* Pickup Location */}
                    <View className="mb-4">
                        <View className="flex-row items-start">
                            <View className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 uppercase font-semibold mb-1">PICK UP</Text>
                                <Text className="text-gray-900 font-semibold text-base" numberOfLines={2}>
                                    {order.pickup_address}
                                </Text>
                            </View>
                        </View>
                        {order.stops?.length > 0 && <View className="w-0.5 h-6 bg-gray-200 ml-0.75 my-1" />}
                    </View>

                    {/* Stops */}
                    {order.stops?.map((stop, index) => (
                        <View key={`stop-${index}`} className="mb-4">
                            <View className="flex-row items-start">
                                <View className="w-2 h-2 rounded-full bg-orange-400 mt-2 mr-3" />
                                <View className="flex-1">
                                    <Text className="text-xs text-gray-500 uppercase font-semibold mb-1">STOP {index + 1}</Text>
                                    <Text className="text-gray-900 font-semibold text-base" numberOfLines={2}>
                                        {stop.address}
                                    </Text>
                                </View>
                            </View>
                            <View className="w-0.5 h-6 bg-gray-200 ml-0.75 my-1" />
                        </View>
                    ))}

                    {/* Dropoff Location */}
                    <View className="mb-6 pb-6 border-b border-gray-100">
                        <View className="flex-row items-start">
                            <View className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 uppercase font-semibold mb-1">DROP OFF</Text>
                                <Text className="text-gray-900 font-semibold text-base">
                                    {order.dropoff_address}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Pricing Breakdown */}
                    <View className="mb-6">
                        <View className="flex-row justify-between mb-3">
                            <Text className="text-gray-700">ค่าบริการ</Text>
                            <Text className="text-gray-900 font-semibold">
                                ฿{formatPrice(serviceFare)}
                            </Text>
                        </View>

                        {order.stops?.length > 0 && (
                            <View className="flex-row justify-between mb-3">
                                <Text className="text-gray-700">จุดพัก ({order.stops.length} จุด)</Text>
                                <Text className="text-gray-900 font-semibold">
                                    +฿{formatPrice(order.stops.length * 30)}
                                </Text>
                            </View>
                        )}

                        {hasSurge && (
                            <View className="flex-row justify-between mb-3">
                                <View className="flex-1">
                                    <Text className="text-orange-600 font-semibold">Surge pricing (1.5x)</Text>
                                    <Text className="text-orange-500 text-xs">Evening Peak Hour</Text>
                                </View>
                                <Text className="text-orange-600 font-semibold">
                                    +฿{formatPrice(surgeFare)}
                                </Text>
                            </View>
                        )}

                        <View className="flex-row justify-between mb-3">
                            <Text className="text-gray-700">น้ำหนัก (kg) ({order.pet?.weight || 10}kg)</Text>
                            <Text className="text-gray-900 font-semibold">Free</Text>
                        </View>

                        <View className="flex-row justify-between mb-4">
                            <Text className="text-gray-700">วิธีชำระเงิน</Text>
                            <Text className="text-gray-900 font-semibold capitalize">
                                {order.payment_method || 'บัตรเครดิต'}
                            </Text>
                        </View>

                        <View className="border-t border-gray-200 pt-4">
                            <View className="flex-row justify-between">
                                <Text className="text-gray-900 font-bold text-lg">Total</Text>
                                <Text className="text-green-600 font-bold text-2xl">
                                    ฿{order.price ? formatPrice(order.price) : '-'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-24" />
                </ScrollView>

                {/* Confirm Button */}
                <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
                    <AppButton
                        title={isAccepting ? "กำลังรับงาน..." : "รับงาน"}
                        onPress={handleConfirmBooking}
                        disabled={isAccepting}
                        className="bg-green-500"
                        size="lg"
                    />
                </View>
            </View>
        </View>
    );
}
