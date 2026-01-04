import { useHereRoutes } from "./hooks/useHereRoutes";
import { useEstimatePrice } from "./hooks/useEstimatePrice";
import { BookingBottomSheet } from "./components/BookingBottomSheet";
import { RouteSelector } from "./components/RouteSelector";
import { VehicleSelector } from "./components/VehicleSelector";
import { BookingMap } from "./components/BookingMap";
import { useBookingStore } from "../../../../store/useBookingStore";
import { useLocalSearchParams } from "expo-router";
import { useState, useRef } from "react";
import { View } from "react-native";
import MapView from "react-native-maps";
import { MOCK_RIDE_OPTIONS } from "../../../../utils/mockData";
import { api } from "../../../../services/api";

export default function ConfirmBookingScreen() {
    const mapRef = useRef<MapView>(null);
    const { pickupLocation, dropoffLocation } = useBookingStore();
    const { petWeight = 0 } = useLocalSearchParams();

    const { routes, selectedRoute, selectedIndex, setSelectedIndex } =
        useHereRoutes(pickupLocation, dropoffLocation);

    const [vehicles, setVehicles] = useState(MOCK_RIDE_OPTIONS);
    const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);

    const { price, loading } = useEstimatePrice({
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        vehicleId: selectedVehicle?.id,
        petWeight: Number(petWeight),
    });

    return (
        <View className="flex-1">
            <BookingMap
                ref={mapRef}
                initialRegion={{
                    latitude: pickupLocation?.latitude ?? 0,
                    longitude: pickupLocation?.longitude ?? 0,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                route={selectedRoute}
            />

            <BookingBottomSheet
                distance={selectedRoute?.distance / 1000 || 0}
                duration={selectedRoute?.duration / 60 || 0}
                price={price}
                loading={loading}
                onConfirm={() => { }}
            >
                <RouteSelector
                    routes={routes}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />

                <VehicleSelector
                    vehicles={vehicles}
                    selected={selectedVehicle}
                    onSelect={setSelectedVehicle}
                />
            </BookingBottomSheet>
        </View>
    );
}
