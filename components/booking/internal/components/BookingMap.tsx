import React, { forwardRef } from 'react';
import { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import MapView from 'react-native-maps';
import { AppMapView } from '../../../AppMapView';

export const BookingMap = forwardRef<MapView, any>(
    ({ initialRegion, route }, mapRef) => {
        return (
            <AppMapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
            >
                {route && (
                    <Polyline
                        coordinates={route.coordinates}
                        strokeWidth={4}
                        strokeColor="#2563EB"
                    />
                )}
            </AppMapView>
        );
    }
);
