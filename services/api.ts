
export interface PricingRequest {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    vehicle_type: string;
    pet_weight_kg: number;
    provider?: string;
}

export interface PricingResponse {
    estimated_price: number;
    distance_km: number;
    duration_min: number;
    weight_surcharge: number;
    surge_multiplier: number;
    surge_reasons: string[];
}

export interface PaymentCreate {
    order_id: number;
    amount: number;
    method: string; // cash, promptpay, etc.
    status?: string;
    transaction_id?: string;
}

export interface PaymentResponse {
    id: number;
    order_id: number;
    amount: number;
    method: string;
    status: string;
    transaction_id?: string;
    created_at: string;
}

export interface DriverDetails {
    user_id: number;
    vehicle_type: string;
    vehicle_plate: string;
    is_online: boolean;
    work_radius_km: number;
    id: number;
    user: {
        full_name: string;
        phone: string;
        email: string;
        id: number;
    }
}

export interface DriverLocation {
    driver_id: number;
    lat: number;
    lng: number;
    id: number;
    driver: DriverDetails;
}

export interface VehicleTypeRate {
    base: number;
    per_km: number;
    per_min: number;
    min: number;
}

export interface VehicleType {
    key: string;
    name: string;
    rates: VehicleTypeRate;
}

export interface PricingSettings {
    map: string;
    id: number;
}

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.140:8000';
    if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
    return url;
};

const API_BASE_URL = getBaseUrl();
const TOKEN_KEY = '@pet_transport_token';

// Helper function to get auth headers
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

export const api = {
    getVehicleTypes: async (): Promise<VehicleType[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/pricing/vehicle-types`);
            if (!response.ok) {
                throw new Error('Failed to fetch vehicle types');
            }
            return await response.json();
        } catch (error) {
            console.warn('Could not fetch vehicle types from backend:', error);
            throw error;
        }
    },

    getPricingSettings: async (): Promise<PricingSettings> => {
        try {
            const response = await fetch(`${API_BASE_URL}/pricing/settings`);
            if (!response.ok) {
                throw new Error('Failed to fetch pricing settings');
            }
            return await response.json();
        } catch (error) {
            console.warn('Could not fetch pricing settings from backend:', error);
            throw error;
        }
    },

    estimatePrice: async (req: PricingRequest): Promise<PricingResponse> => {
        try {
            console.log("Sending estimatePrice request:", JSON.stringify(req, null, 2));
            const response = await fetch(`${API_BASE_URL}/pricing/estimate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(req),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.warn('Could not estimate price from backend:', error);
            throw error;
        }
    },

    getDriverLocations: async (): Promise<DriverLocation[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/driver_locations/`);
            if (!response.ok) {
                throw new Error('Failed to fetch driver locations');
            }
            return await response.json();
        } catch (error) {
            console.warn('Could not fetch driver locations from backend:', error);
            // Return empty array instead of throwing to prevent blocking the UI
            return [];
        }
    },

    getDriverLocationById: async (id: number): Promise<DriverLocation | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/driver_locations/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch driver location');
            }
            return await response.json();
        } catch (error) {
            console.warn('Could not fetch driver location from backend:', error);
            // Return null instead of throwing to prevent blocking the UI
            return null;
        }
    },

    updateDriverLocation: async (_userId: number, lat: number, lng: number): Promise<void> => {
        try {
            const headers = await getAuthHeaders();

            // Using the new optimized PUT /driver_locations/me endpoint
            const response = await fetch(`${API_BASE_URL}/driver_locations/me`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ lat, lng }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`Failed to update driver location via PUT /me: ${response.status} - ${errorText}`);
            } else {
                console.log("Location successfully updated via PUT /me");
            }
        } catch (error) {
            console.error('Error in updateDriverLocation:', error);
        }
    },

    updateDriverStatus: async (isOnline: boolean, lat?: number, lng?: number): Promise<void> => {
        try {
            const headers = await getAuthHeaders();
            console.log(`Updating driver status to: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

            const body: any = { is_online: isOnline };
            if (isOnline && lat !== undefined && lng !== undefined) {
                body.lat = lat;
                body.lng = lng;
            }

            const response = await fetch(`${API_BASE_URL}/drivers/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update driver status: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('Error updating driver status:', error);
            throw error;
        }
    },

    getChatHistory: async (orderId: number): Promise<any[]> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/chat/${orderId}`, {
                headers,
            });
            console.log("getChatHistory response", response);
            if (!response.ok) {
                throw new Error('Failed to fetch chat history');
            }
            return await response.json();
        } catch (error) {
            console.warn('Could not fetch chat history', error);
            return [];
        }
    },

    markChatRead: async (orderId: number, userId: number): Promise<void> => {
        try {
            const headers = await getAuthHeaders();
            await fetch(`${API_BASE_URL}/chat/${orderId}/read?user_id=${userId}`, {
                method: 'POST',
                headers,
            });
        } catch (error) {
            console.warn('Could not mark chat as read', error);
        }
    },

    updateDriverWorkRadius: async (radiusKm: number): Promise<DriverDetails> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/drivers/settings`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ work_radius_km: radiusKm }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update work radius: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating driver work radius:', error);
            throw error;
        }
    },

    getNotifications: async (): Promise<any[]> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/notifications/`, {
                headers,
            });

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            return await response.json();
        } catch (error) {
            console.warn('Could not fetch notifications', error);
            return [];
        }
    },

    markNotificationAsRead: async (notificationId: number): Promise<void> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers,
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
        } catch (error) {
            console.warn('Could not mark notification as read', error);
        }
    },

    getDriverEarnings: async (period: 'daily' | 'weekly' | 'monthly'): Promise<any> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/drivers/earnings/summary?period=${period}`, {
                headers,
            });

            if (!response.ok) {
                throw new Error('Failed to fetch earnings');
            }

            return await response.json();
        } catch (error) {
            console.warn('Could not fetch earnings', error);
            throw error;
        }
    },

    getDriverStats: async (): Promise<any> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/drivers/stats`, {
                headers,
            });

            if (!response.ok) {
                throw new Error('Failed to fetch driver stats');
            }

            return await response.json();
        } catch (error) {
            console.warn('Could not fetch driver stats', error);
            throw error;
        }
    },

    // ---------- Payments ----------
    createPayment: async (data: PaymentCreate): Promise<PaymentResponse> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create payment');
        return response.json();
    },

    getPayment: async (paymentId: number): Promise<PaymentResponse> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch payment');
        return response.json();
    },

    verifyPayment: async (paymentId: number, status: string, transactionId?: string): Promise<PaymentResponse> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/verify?status=${status}${transactionId ? `&transaction_id=${transactionId}` : ''}`, {
            method: 'POST',
            headers
        });
        if (!response.ok) throw new Error('Failed to verify payment');
        return response.json();
    },
    getPaymentByOrderId: async (orderId: number): Promise<PaymentResponse> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/order/${orderId}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch payment by order ID');
        return response.json();
    },

    createPaymentIntent: async (data: PaymentCreate): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/create-payment-intent`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to create payment intent' }));
            throw new Error(errorData.detail || 'Failed to create payment intent');
        }
        return response.json();
    },

    // ---------- Wallet ----------
    getWalletBalance: async (): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/wallet/balance`, { headers });
        if (!response.ok) throw new Error('Failed to fetch wallet balance');
        return response.json();
    },

    getWalletTransactions: async (): Promise<any[]> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/wallet/transactions`, { headers });
        if (!response.ok) throw new Error('Failed to fetch transactions');
        return response.json();
    },

    topupWallet: async (amount: number, method: string = 'promptpay'): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/wallet/topup`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount, method })
        });
        if (!response.ok) throw new Error('Failed to topup wallet');
        return response.json();
    },

    verifyTopup: async (transactionId: number): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/wallet/verify-topup/${transactionId}`, {
            method: 'POST',
            headers
        });
        if (!response.ok) throw new Error('Failed to verify topup');
        return response.json();
    },

    createSetupIntent: async (): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/setup-intent`, {
            method: 'POST',
            headers
        });
        if (!response.ok) throw new Error('Failed to create setup intent');
        return response.json();
    },

    getPaymentMethods: async (): Promise<any[]> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/payment-methods`, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch payment methods:', errorText);
            throw new Error(`Failed to fetch payment methods: ${errorText}`);
        }
        return response.json();
    },

    detachPaymentMethod: async (pmId: string): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/payment-methods/${pmId}`, {
            method: 'DELETE',
            headers
        });
        if (!response.ok) throw new Error('Failed to detach payment method');
        return response.json();
    },
<<<<<<< HEAD
    chargeSavedCard: async (orderId: number, paymentMethodId: string): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/payments/charge-card?order_id=${orderId}&payment_method_id=${paymentMethodId}`, {
            method: 'POST',
            headers
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Charge failed: ${errorText}`);
        }
        return response.json();
=======

    updateDriverBank: async (bankData: { bank_name: string, bank_account_number: string, bank_account_name: string }): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/drivers/bank-account`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(bankData)
        });
        if (!response.ok) throw new Error('Failed to update bank account');
        return response.json();
    },

    requestWithdrawal: async (amount: number): Promise<any> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ amount })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to request withdrawal');
        }
        return response.json();
    },

    getActiveOrder: async (): Promise<any | null> => {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/orders/`, { headers });

            if (!response.ok) {
                console.error('Failed to fetch orders for active check');
                return null;
            }

            const orders = await response.json();
            const activeStatuses = ['accepted', 'arrived', 'picked_up', 'in_progress'];

            // Find any order that is currently active for this driver
            const activeOrder = orders.find((o: any) => activeStatuses.includes(o.status));
            return activeOrder || null;
        } catch (error) {
            console.error('Error fetching active order:', error);
            return null;
        }
>>>>>>> 84c5a5c (feat: Configure app as petgo-driver, update authenticated navigation, and enhance chat message deduplication logic.)
    }
};
