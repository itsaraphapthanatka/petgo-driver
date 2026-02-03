import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderCreate } from '../types/order';

const API_BASE_URL = Platform.OS === 'android' ? process.env.EXPO_PUBLIC_API_BASE_URL : process.env.EXPO_PUBLIC_API_BASE_URL;
const TOKEN_KEY = '@pet_transport_token';

console.log('API_BASE_URL', API_BASE_URL);
console.log('TOKEN_KEY', TOKEN_KEY);

// Helper function to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    console.log('getAuthHeaders: Token found', token);
    if (!token) {
        console.warn('getAuthHeaders: No token found');
    } else {
        // console.log('getAuthHeaders: Token found');
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

export const orderService = {
    // Create a new order (customer creates booking)
    createOrder: async (data: OrderCreate): Promise<Order> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/orders/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create order: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    // Get all orders (optionally filter by status)
    getOrders: async (status?: string): Promise<Order[]> => {
        const headers = await getAuthHeaders();
        let url = `${API_BASE_URL}/orders/`;
        if (status) {
            url += `?status=${status}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch orders:', response.status, errorText);
            throw new Error(`Failed to fetch orders: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    // Get single order by ID
    getOrder: async (orderId: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch order');
        }

        return await response.json();
    },

    // Get pending orders for drivers
    getPendingOrders: async (): Promise<Order[]> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/orders/`, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch pending orders');
        }

        const orders: Order[] = await response.json();
        // Filter for pending orders on the client side
        return orders.filter(order => order.status === 'pending');
    },

    // Driver accepts an order
    async acceptOrder(orderId: number): Promise<Order> {
        const headers = await getAuthHeaders();

        // Use the specific endpoint for accepting orders
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/accept`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to accept order: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    // Driver updates order status (picked up, completed, etc.)
    updateOrderStatus: async (orderId: number, status: string): Promise<Order> => {
        const headers = await getAuthHeaders();

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

        console.log(`Updating status to ${status} via ${method} ${endpoint}`);

        const response = await fetch(endpoint, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update order status: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    cancelOrder: async (orderId: number, driverId?: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        console.log(`Canceling order ${orderId}`);
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'cancelled' }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to cancel order: ${response.status} - ${errorText}`);
        }
        return await response.json();
    },

    declineOrder: async (orderId: number): Promise<{ message: string }> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/decline`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to decline order: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    updateCustomerLocation: async (orderId: number, lat: number, lng: number): Promise<Order> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                customer_lat: lat,
                customer_lng: lng
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update customer location: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },
    payWithWallet: async (orderId: number): Promise<Order> => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pay-wallet`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to pay with wallet');
        }
        return response.json();
    },

    getActiveOrder: async (userId: number): Promise<Order | null> => {
        try {
            // Fetch all orders for the user
            const orders = await orderService.getOrders();
            // Filter for active status
            const activeStatuses = ['pending', 'accepted', 'arrived', 'picked_up', 'in_progress'];
            // Find the most recent active order (assuming API returns sorted or we just take first found)
            const activeOrder = orders.find(o => activeStatuses.includes(o.status));
            return activeOrder || null;
        } catch (error: any) {
            // Suppress Redbox for auth errors (401/403) to allow user to logout
            if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
                console.warn('Authentication mismatch in getActiveOrder (ignoring):', error.message);
                return null;
            }
            console.error('Error fetching active order:', error);
            return null;
        }
    }
};
