import React, { forwardRef } from 'react';
import MapView, { MapViewProps, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSettingsStore } from '../store/useSettingsStore';

// Map Tile URLs
const HERE_API_KEY = process.env.EXPO_PUBLIC_HERE_MAPS_API_KEY || '';
const LONGDO_API_KEY = process.env.EXPO_PUBLIC_LONGDO_MAP_API_KEY || '';

const HERE_TILE_URL = `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?apiKey=${HERE_API_KEY}`;
const LONGDO_TILE_URL = `https://ms.longdo.com/mm/0/{z}/{x}/{y}.png?key=${LONGDO_API_KEY}`;

export const AppMapView = forwardRef<MapView, MapViewProps>((props, ref) => {
    const { mapProvider } = useSettingsStore();

    // Determine if we should use Google Maps native provider
    const isGoogle = mapProvider === 'google';

    // Verify keys for other providers
    const hasHereKey = !!HERE_API_KEY;
    const hasLongdoKey = !!LONGDO_API_KEY;

    // Fallback logic could be added here, but for now we trust the setting

    return (
        <MapView
            ref={ref}
            {...props}
            provider={props.provider || (isGoogle ? PROVIDER_GOOGLE : undefined)}
            mapType={props.provider === PROVIDER_GOOGLE || isGoogle ? "standard" : "none"}
        >
            {props.children}

            {/* Third-party Tiles */}
            {!isGoogle && mapProvider === 'here' && (
                <UrlTile
                    urlTemplate={hasHereKey ? HERE_TILE_URL : "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                    maximumZ={20}
                    flipY={false}
                    zIndex={-1}
                />
            )}

            {!isGoogle && mapProvider === 'longdo' && (
                <UrlTile
                    urlTemplate={hasLongdoKey ? LONGDO_TILE_URL : "https://ms.longdo.com/mm/0/{z}/{x}/{y}.png"}
                    maximumZ={20}
                    flipY={false}
                    zIndex={-1}
                />
            )}
        </MapView>
    );
});
