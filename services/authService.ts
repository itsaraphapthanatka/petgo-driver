import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
    LoginRequest,
    RegisterRequest,
    OTPRequest,
    OTPVerifyRequest,
    AuthResponse,
    OTPResponse,
    User,
} from '../types/auth';

const getBaseUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.140:8000';
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return url;
};

const API_BASE_URL = getBaseUrl();
const TOKEN_KEY = '@pet_transport_token';

// Token Management
export const tokenManager = {
    async getToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    },

    async setToken(token: string): Promise<void> {
        try {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
            console.error('Error saving token:', error);
        }
    },

    async removeToken(): Promise<void> {
        try {
            await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error removing token:', error);
        }
    },
};

// Authentication API
export const authService = {
    /**
     * Login with email or phone + password
     */
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            // Backend expects form-urlencoded for OAuth2 compatibility
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data: AuthResponse = await response.json();

            // Store token
            await tokenManager.setToken(data.access_token);

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    /**
     * Register new user
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            const authData: AuthResponse = await response.json();

            // Store token
            await tokenManager.setToken(authData.access_token);

            return authData;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    /**
     * Request OTP for phone number
     */
    async requestOTP(phoneNumber: string): Promise<OTPResponse> {
        try {
            const url = `${API_BASE_URL}/auth/request-otp`;
            console.log(`[authService] Requesting OTP from: ${url} with phone: ${phoneNumber}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to request OTP');
            }

            return await response.json();
        } catch (error) {
            console.error('Request OTP error:', error);
            throw error;
        }
    },

    /**
     * Verify OTP and login/register user
     */
    async verifyOTP(phoneNumber: string, otp: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone_number: phoneNumber, otp }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'OTP verification failed');
            }

            const data: AuthResponse = await response.json();

            // Store token
            await tokenManager.setToken(data.access_token);

            return data;
        } catch (error) {
            console.error('Verify OTP error:', error);
            throw error;
        }
    },

    /**
     * Get current user info
     */
    async getCurrentUser(): Promise<User> {
        try {
            const token = await tokenManager.getToken();

            if (!token) {
                throw new Error('No authentication token found');
            }

            const url = `${API_BASE_URL}/auth/me`;
            console.log(`[authService] Fetching current user from: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid, remove it
                    await tokenManager.removeToken();
                }
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get user info');
            }

            return await response.json();
        } catch (error: any) {
            // Don't log error if it's just no token (normal for first launch/logout) or invalid token
            if (error.message !== 'No authentication token found' && error.message !== 'Could not validate credentials') {
                console.error('Get current user error:', error);
            }
            throw error;
        }
    },

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        await tokenManager.removeToken();
    },
};
