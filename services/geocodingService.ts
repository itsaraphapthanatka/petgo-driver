import { Platform } from 'react-native';

const getBaseUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.140:8000';
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return url;
};

const API_BASE_URL = getBaseUrl();
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * Convert coordinates to human-readable address using Google Maps Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=th`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            // Get the formatted address (first result is usually the most accurate)
            return data.results[0].formatted_address;
        } else {
            console.warn('Reverse geocoding failed:', data.status);
            return 'ตำแหน่งปัจจุบัน'; // Fallback in Thai
        }
    } catch (error) {
        console.error('Error in reverse geocoding:', error);
        return 'ตำแหน่งปัจจุบัน'; // Fallback in Thai
    }
}

/**
 * Search for address using Google Places Autocomplete API
 */
export async function searchAddress(query: string): Promise<any[]> {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&language=th&components=country:th`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.predictions) {
            return data.predictions;
        }
        return [];
    } catch (error) {
        console.error('Error searching address:', error);
        return [];
    }
}

/**
 * Get place details by place_id
 */
export async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&language=th&fields=geometry,formatted_address`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
            return {
                lat: data.result.geometry.location.lat,
                lng: data.result.geometry.location.lng,
                address: data.result.formatted_address
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting place details:', error);
        return null;
    }
}
