import { useHereRoutes } from "./hooks/useHereRoutes";
import { useEstimatePrice } from "./hooks/useEstimatePrice";
import { BookingBottomSheet } from "./components/BookingBottomSheet";
import { RouteSelector } from "./components/RouteSelector";
import { VehicleSelector } from "./components/VehicleSelector";
import { useBookingStore } from "../../../store/useBookingStore";
import { useLocalSearchParams } from "expo-router";
import { useState, useRef, useCallback } from "react";
import { View } from "react-native";
import { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapView from 'react-native-maps';
import { AppMapView } from '../../AppMapView';
import { MOCK_RIDE_OPTIONS } from "../../../utils/mockData";
import { api } from "../../../services/api";

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

    const initialRegion = {
        latitude: pickupLocation?.latitude ?? 0,
        longitude: pickupLocation?.longitude ?? 0,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    const handleMapReady = useCallback(() => {
        if (mapRef.current && pickupLocation && dropoffLocation) {
            mapRef.current.fitToCoordinates(
                [
                    { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
                    { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
                ],
                {
                    edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                    animated: true,
                }
            );
        }
    }, [pickupLocation, dropoffLocation]);

    return (
        <View className="flex-1">
            <AppMapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                onMapReady={handleMapReady}
            >
                {pickupLocation && (
                    <Marker
                        coordinate={{
                            latitude: pickupLocation.latitude,
                            longitude: pickupLocation.longitude,
                        }}
                        title="Pickup Location"
                    />
                )}
                {dropoffLocation && (
                    <Marker
                        coordinate={{
                            latitude: dropoffLocation.latitude,
                            longitude: dropoffLocation.longitude,
                        }}
                        title="Dropoff Location"
                    />
                )}
                {selectedRoute && (
                    <Polyline
                        coordinates={selectedRoute.coordinates}
                        strokeWidth={4}
                        strokeColor="blue"
                    />
                )}
            </AppMapView>

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
