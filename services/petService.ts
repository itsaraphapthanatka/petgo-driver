import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from './httpClient';
import { apiErrorFromResponse } from '../utils/apiError';

export interface Pet {
    id: string;
    user_id: number;
    name: string;
    type: string;
    breed?: string;
    weight: number;
    image?: string;
}

export interface PetType {
    id: number;
    name: string;
    icon: string;
}

export interface PetCreate {
    name: string;
    type: string;
    breed?: string;
    weight: number;
}

// Every request below goes through apiFetch (services/httpClient.ts) so an expired token (401) clears the
// session once instead of leaving the pet list empty with a generic error. Never call bare fetch here.
const API_BASE_URL = Platform.OS === 'android' ? process.env.EXPO_PUBLIC_API_BASE_URL : process.env.EXPO_PUBLIC_API_BASE_URL;
const TOKEN_KEY = '@pet_transport_token';

async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

export const petService = {
    getPets: async (): Promise<Pet[]> => {
        const headers = await getAuthHeaders();
        const response = await apiFetch(`${API_BASE_URL}/pets/`, { headers });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to fetch pets');
        }

        const data = await response.json();
        // Add emoji based on type for consistency with UI mapping if not provided
        return data.map((pet: any) => ({
            ...pet,
            id: pet.id.toString(),
            image: pet.type === 'Dog' ? '🐶' : pet.type === 'Cat' ? '🐱' : '🐰'
        }));
    },

    getPetTypes: async (): Promise<PetType[]> => {
        const response = await apiFetch(`${API_BASE_URL}/pets/types`);

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to fetch pet types');
        }

        return await response.json();
    },

    createPet: async (data: PetCreate): Promise<Pet> => {
        const headers = await getAuthHeaders();
        const response = await apiFetch(`${API_BASE_URL}/pets/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to create pet');
        }

        const pet = await response.json();
        return {
            ...pet,
            id: pet.id.toString(),
            image: pet.type === 'Dog' ? '🐶' : pet.type === 'Cat' ? '🐱' : '🐰'
        };
    },
};
