import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Phone, HelpCircle, MapPin, Clock, Calendar, CreditCard, Wallet, Info, Car } from 'lucide-react-native';
import { orderService } from '../../../services/orderService';
import { Order } from '../../../types/order';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

export default function HistoryDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    const fetchOrderDetail = async () => {
        try {
            setIsLoading(true);
            const data = await orderService.getOrder(Number(id));
            setOrder(data);
        } catch (error) {
            console.error('[HistoryDetail] Error fetching order:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCall = () => {
        if (order?.customer?.phone) {
            Linking.openURL(`tel:${order.customer.phone}`);
        }
    };

    const formatPrice = (price: number | null | undefined) => {
        if (price === null || price === undefined) return '0.00';
        return price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 items-center justify-center bg-white p-6">
                <Text className="text-gray-500 text-lg mb-4 text-center font-medium">ไม่พบข้อมูลการเดินทาง</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-emerald-500 px-8 py-3 rounded-2xl"
                >
                    <Text className="text-white font-black">ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const platformFee = Number(order.platform_fee || 0);
    const driverEarnings = Number(order.driver_earnings || 0);
    const totalPrice = Number(order.price || 0) + platformFee; // If price is net, we add fee to show gross
    // Wait, in our backend 'price' is the amount the customer pays.
    // So 'price' is the gross.
    const grossFare = Number(order.price || 0);
    const commissionRatePercent = (order.commission_rate ? Math.round(Number(order.commission_rate) * 100) : 7);

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center border-b border-gray-100 bg-white">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full mr-3">
                    <ChevronLeft size={24} color="#111827" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-gray-900 font-black text-xl">รายละเอียดทริป</Text>
                    <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        #{order.id} • {dayjs(order.created_at).locale('th').format('D MMM BBBB HH:mm')}
                    </Text>
                </View>
                <TouchableOpacity className="bg-gray-50 p-2 rounded-full">
                    <HelpCircle size={22} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Map View */}
                <View className="h-64 w-full bg-gray-100 relative">
                    <MapView
                        key={`map-${order.id}`}
                        style={{ width: '100%', height: '100%' }}
                        initialRegion={{
                            latitude: (order.pickup_lat + order.dropoff_lat) / 2,
                            longitude: (order.pickup_lng + order.dropoff_lng) / 2,
                            latitudeDelta: Math.max(Math.abs(order.pickup_lat - order.dropoff_lat) * 2.5, 0.05),
                            longitudeDelta: Math.max(Math.abs(order.pickup_lng - order.dropoff_lng) * 2.5, 0.05),
                        }}
                        scrollEnabled={true}
                        mapPadding={{ top: 20, right: 20, bottom: 80, left: 20 }}
                    >
                        <Marker coordinate={{ latitude: order.pickup_lat, longitude: order.pickup_lng }}>
                            <View className="bg-emerald-500 p-1.5 rounded-full border-2 border-white shadow-lg">
                                <View className="w-2 h-2 bg-white rounded-full" />
                            </View>
                        </Marker>
                        <Marker coordinate={{ latitude: order.dropoff_lat, longitude: order.dropoff_lng }}>
                            <View className="bg-rose-500 p-1.5 rounded-full border-2 border-white shadow-lg">
                                <View className="w-2 h-2 bg-white rounded-full" />
                            </View>
                        </Marker>
                        <Polyline
                            coordinates={[
                                { latitude: order.pickup_lat, longitude: order.pickup_lng },
                                { latitude: order.dropoff_lat, longitude: order.dropoff_lng }
                            ]}
                            strokeColor="#10B981"
                            strokeWidth={4}
                        />
                    </MapView>

                    {/* Floating Summary */}
                    <View className="absolute bottom-4 left-4 right-4 bg-white/95 rounded-2xl p-4 flex-row justify-between items-center shadow-2xl border border-gray-100">
                        <View className="items-center flex-1">
                            <Car size={18} color="#10B981" className="mb-1" />
                            <Text className="text-[10px] text-gray-400 font-bold uppercase">รูปแบบรถ</Text>
                            <Text className="text-gray-900 font-black text-xs">{order.driver?.vehicle_type?.toUpperCase() || 'PETGO CAR'}</Text>
                        </View>
                        <View className="w-[1] h-8 bg-gray-100" />
                        <View className="items-center flex-1">
                            <MapPin size={18} color="#3B82F6" className="mb-1" />
                            <Text className="text-[10px] text-gray-400 font-bold uppercase">ระยะทาง</Text>
                            <Text className="text-gray-900 font-black text-xs">~4.8 กม.</Text>
                        </View>
                        <View className="w-[1] h-8 bg-gray-100" />
                        <View className="items-center flex-1">
                            <Clock size={18} color="#F59E0B" className="mb-1" />
                            <Text className="text-[10px] text-gray-400 font-bold uppercase">เวลาทริป</Text>
                            <Text className="text-gray-900 font-black text-xs">18 นาที</Text>
                        </View>
                    </View>
                </View>

                {/* Timeline Section */}
                <View className="p-6 bg-white">
                    <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6 px-1">เส้นทางการเดินทาง</Text>

                    <View className="flex-row items-start">
                        <View className="items-center mr-6">
                            <View className="w-4 h-4 rounded-full bg-emerald-100 items-center justify-center">
                                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                            </View>
                            <View className="w-[2] h-16 bg-emerald-50 my-1" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">จุดรับลูกค้า • {dayjs(order.created_at).format('HH:mm')}</Text>
                            <Text className="text-gray-900 font-bold text-sm leading-5 mb-2" numberOfLines={2}>
                                {order.pickup_address}
                            </Text>
                        </View>
                    </View>

                    {/* Intermediate Stops if any */}
                    {order.stops?.map((stop, index) => (
                        <View key={index} className="flex-row items-start">
                            <View className="items-center mr-6">
                                <View className="w-4 h-4 rounded-full bg-amber-100 items-center justify-center">
                                    <View className="w-2 h-2 rounded-full bg-amber-500" />
                                </View>
                                <View className="w-[2] h-16 bg-gray-50 my-1" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">จุดแวะที่ {index + 1}</Text>
                                <Text className="text-gray-900 font-bold text-sm leading-5 mb-2" numberOfLines={2}>
                                    {stop.address}
                                </Text>
                            </View>
                        </View>
                    ))}

                    <View className="flex-row items-start">
                        <View className="items-center mr-6">
                            <View className="w-4 h-4 rounded-full bg-rose-100 items-center justify-center">
                                <View className="w-2 h-2 rounded-full bg-rose-500" />
                            </View>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">จุดส่งลูกค้า • {dayjs(order.created_at).add(20, 'minute').format('HH:mm')}</Text>
                            <Text className="text-gray-900 font-bold text-sm leading-5" numberOfLines={2}>
                                {order.dropoff_address}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row px-6 pb-8 bg-white gap-x-3">
                    <TouchableOpacity
                        onPress={handleCall}
                        className="flex-1 flex-row items-center justify-center bg-gray-900 py-4 rounded-2xl shadow-lg"
                    >
                        <Phone size={18} color="white" className="mr-2" />
                        <Text className="text-white font-black">โทรหาลูกค้า</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider Line */}
                <View className="h-[8] bg-gray-50" />

                {/* Earnings Summary */}
                <View className="p-8 bg-white">
                    <View className="flex-row justify-between items-end mb-8">
                        <View>
                            <Text className="text-gray-900 font-black text-2xl mb-1">สรุปยอดทริป</Text>
                            <View className="flex-row items-center bg-emerald-50 px-3 py-1 rounded-full self-start">
                                <CreditCard size={12} color="#10B981" className="mr-1.5" />
                                <Text className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">{order.payment_method === 'cash' ? 'ชำระด้วยเงินสด' : 'ชำระผ่านระบบ'}</Text>
                            </View>
                        </View>
                        <View className="items-end">
                            <Text className="text-gray-400 text-[10px] font-black uppercase mb-1">ยอดรวมทริป</Text>
                            <Text className="text-gray-900 font-black text-2xl">฿{formatPrice(grossFare)}</Text>
                        </View>
                    </View>

                    {/* Breakdown items */}
                    <View className="bg-gray-50 rounded-3xl p-6 space-y-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-gray-500 font-bold text-sm">ค่าบริการการเดินทาง</Text>
                            <Text className="text-gray-900 font-black text-sm">฿{formatPrice(grossFare)}</Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-gray-500 font-bold text-sm">ค่าธรรมเนียมการจอง</Text>
                            <Text className="text-gray-900 font-black text-sm">฿0.00</Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-rose-500 font-bold text-sm">หักค่าบริการระบาย ({commissionRatePercent}%)</Text>
                            <Text className="text-rose-500 font-black text-sm">-฿{formatPrice(platformFee)}</Text>
                        </View>

                        {/* Net Earnings Highlight */}
                        <View className="pt-6 border-t border-gray-100">
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text className="text-gray-900 font-black text-base">ยอดเงินโอนเข้าวอลเล็ท</Text>
                                    <View className="flex-row items-center mt-1">
                                        <Wallet size={14} color="#10B981" className="mr-1.5" />
                                        <Text className="text-emerald-500 text-[10px] font-bold">เข้ากระเป๋าเงินทันที</Text>
                                    </View>
                                </View>
                                <Text className="text-emerald-500 font-black text-3xl">฿{formatPrice(driverEarnings)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer Section */}
                <View className="px-8 pb-12 pt-4 items-center">
                    <View className="w-12 h-12 bg-gray-50 rounded-full items-center justify-center mb-4">
                        <Info size={24} color="#D1D5DB" />
                    </View>
                    <Text className="text-gray-400 text-center text-xs leading-5 font-bold">
                        หากคุณมีข้อสงสัยเกี่ยวกับยอดเงินในทริปนี้{'\n'}
                        สามารถติดต่อฝ่ายซัพพอร์ตของเราได้ตลอด 24 ชม.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
