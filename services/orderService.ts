import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderCreate } from '../types/order';
import { apiFetch } from './httpClient';
import { apiErrorFromResponse } from '../utils/apiError';

const API_BASE_URL = Platform.OS === 'android' ? process.env.EXPO_PUBLIC_API_BASE_URL : process.env.EXPO_PUBLIC_API_BASE_URL;
const TOKEN_KEY = '@pet_transport_token';

// Helper function to get auth headers.
// Every request below goes through apiFetch (services/httpClient.ts), so an expired token (401) clears
// the session once through the handler store/useAuthStore registers, and the root layout sends the driver
// back to login instead of leaving them on a screen that failed silently. Never call bare fetch here.
async function getAuthHeaders(): Promise<HeadersInit | null> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
        // Silently return null instead of warning to avoid noise during logout
        return null;
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    return headers;
}

export const orderService = {
    // Create a new order (customer creates booking)
    createOrder: async (data: OrderCreate): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to create order');
        }

        return await response.json();
    },

    // Get all orders (optionally filter by status)
    getOrders: async (status?: string): Promise<Order[]> => {
        const headers = await getAuthHeaders();
        if (!headers) {
            // No token at all = nobody is signed in (first launch, or a request that raced logout)
            return [];
        }

        let url = `${API_BASE_URL}/orders/`;
        if (status) {
            url += `?status=${status}`;
        }

        const response = await apiFetch(url, { headers });

        if (!response.ok) {
            // 401 (expired token) and 403 (driver_not_approved / negative wallet) used to become an empty
            // list here, so a driver whose session died just saw "no jobs" for ever. Both must reach the
            // caller: apiFetch already cleared the session on 401, and the screens route a 403 to
            // (driver)/pending-approval (utils/apiError.ts::isDriverNotApprovedError).
            throw await apiErrorFromResponse(response, 'Failed to fetch orders');
        }

        return await response.json();
    },

    // Get single order by ID
    getOrder: async (orderId: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}`, { headers });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to fetch order');
        }

        return await response.json();
    },

    // Get pending orders for drivers
    getPendingOrders: async (): Promise<Order[]> => {
        const headers = await getAuthHeaders();
        if (!headers) return [];

        const response = await apiFetch(`${API_BASE_URL}/orders/`, { headers });

        if (!response.ok) {
            // See getOrders: never swallow 401/403 here, the driver has to know why the job list is empty
            throw await apiErrorFromResponse(response, 'Failed to fetch pending orders');
        }

        const orders: Order[] = await response.json();
        // Filter for pending orders on the client side
        return orders.filter(order => order.status === 'pending');
    },

    // Driver accepts an order
    async acceptOrder(orderId: number): Promise<Order> {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        // Use the specific endpoint for accepting orders
        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}/accept`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to accept order');
        }

        return await response.json();
    },

    // Driver updates order status (picked up, completed, etc.)
    updateOrderStatus: async (orderId: number, status: string): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        let endpoint = `${API_BASE_URL}/orders/${orderId}`;
        let method = 'PATCH';
        let body: any = { status };

        // Map status to specific endpoints if applicable
        if (status === 'in_progress') {
            // 'in_progress' can transition from 'arrived' via PATCH
            endpoint = `${API_BASE_URL}/orders/${orderId}`;
            method = 'PATCH';
            body = { status: 'in_progress' };
        } else if (status === 'picked_up') {
            // 'picked_up' usually transitions from 'accepted' via POST /pickup
            endpoint = `${API_BASE_URL}/orders/${orderId}/pickup`;
            method = 'POST';
            body = undefined;
        } else if (status === 'arrived') {
            // For 'arrived', we use the generic PATCH /orders/{id}
            endpoint = `${API_BASE_URL}/orders/${orderId}`;
            method = 'PATCH';
            body = { status: 'arrived' };
        } else if (status === 'completed') {
            endpoint = `${API_BASE_URL}/orders/${orderId}/complete`;
            method = 'POST';
            body = undefined;
        }

        const response = await apiFetch(endpoint, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to update order status');
        }

        return await response.json();
    },

    cancelOrder: async (orderId: number, driverId?: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'cancelled' }),
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to cancel order');
        }
        return await response.json();
    },

    declineOrder: async (orderId: number): Promise<{ message: string }> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}/decline`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to decline order');
        }

        return await response.json();
    },

    updateStopStatus: async (orderId: number, stopId: number, status: string): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}/stops/${stopId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to update stop status');
        }

        return await response.json();
    },
    updateCustomerLocation: async (orderId: number, lat: number, lng: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                customer_lat: lat,
                customer_lng: lng
            }),
        });

        if (!response.ok) {
            throw await apiErrorFromResponse(response, 'Failed to update customer location');
        }

        return await response.json();
    },
    payWithWallet: async (orderId: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Authentication required');

        const response = await apiFetch(`${API_BASE_URL}/orders/${orderId}/pay-wallet`, {
            method: 'POST',
            headers,
        });
        if (!response.ok) {
            // Screens show errorDetail(error) so the user reads the backend reason, not the context prefix
            throw await apiErrorFromResponse(response, 'Failed to pay with wallet');
        }
        return response.json();
    },

    getActiveOrder: async (userId?: number): Promise<Order | null> => {
        try {
            // Fetch all orders for the user
            const orders = await orderService.getOrders();
            // Filter for active status
            const activeStatuses = ['pending', 'accepted', 'arrived', 'picked_up', 'in_progress'];
            // Find the most recent active order (assuming API returns sorted or we just take first found)
            const activeOrder = orders.find(o => activeStatuses.includes(o.status));
            return activeOrder || null;
        } catch (error: any) {
            // The session was already cleared by apiFetch on a 401; a 403 is a role/approval problem that the
            // screens handle themselves. Returning null here only keeps this convenience call from red-boxing.
            if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
                console.warn('Authentication mismatch in getActiveOrder (ignoring):', error.message);
                return null;
            }
            console.error('Error fetching active order:', error);
            return null;
        }
    }
};
