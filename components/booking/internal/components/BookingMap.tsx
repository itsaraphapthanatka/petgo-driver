import React, { forwardRef } from 'react';
import MapView from 'react-native-maps';
import { Polyline } from 'react-native-maps';

export const BookingMap = forwardRef<MapView, any>(
    ({ initialRegion, route }, ref) => {
        return (
            <MapView ref={ref} style={{ flex: 1 }} initialRegion={initialRegion}>
                {route && (
                    <Polyline
                        coordinates={route.coordinates}
                        strokeWidth={4}
                        strokeColor="#2563EB"
                    />
                )}
            </MapView>
        );
    }
);
