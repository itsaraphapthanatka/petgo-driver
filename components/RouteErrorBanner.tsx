import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isRoutingError } from '../services/googleDirectionsApi';

interface RouteErrorBannerProps {
    /** Error thrown by googleDirectionsApi (or anything else). null/undefined renders nothing. */
    error: unknown;
    /** Absolute position inside the map container. Default clears a `top-12` back button. */
    style?: StyleProp<ViewStyle>;
}

const DEFAULT_POSITION: ViewStyle = { top: 100, left: 16, right: 16 };

/**
 * Explains why no route is drawn: "no route between these points" vs "the maps key
 * was rejected" vs "offline" — instead of a silently empty map.
 */
export function RouteErrorBanner({ error, style }: RouteErrorBannerProps) {
    const { t } = useTranslation();
    if (error === null || error === undefined) return null;

    let message: string;
    if (isRoutingError(error)) {
        switch (error.code) {
            case 'ZERO_RESULTS':
            case 'NOT_FOUND':
                message = t('route_not_found');
                break;
            case 'REQUEST_DENIED':
                message = t('route_error_denied');
                break;
            case 'MISSING_KEY':
                message = t('route_error_config');
                break;
            case 'OVER_QUERY_LIMIT':
            case 'OVER_DAILY_LIMIT':
                message = t('route_error_quota');
                break;
            case 'NETWORK':
                message = t('route_error_network');
                break;
            default:
                message = t('route_error_generic', { detail: error.message });
        }
    } else {
        message = t('route_error_generic', { detail: error instanceof Error ? error.message : String(error) });
    }

    return (
        <View
            pointerEvents="none"
            className="absolute bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-sm z-20"
            style={style ?? DEFAULT_POSITION}
        >
            <Text className="text-red-700 text-sm text-center">{message}</Text>
        </View>
    );
}
