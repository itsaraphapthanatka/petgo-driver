// Order types based on API schema at http://192.168.1.127:8000/openapi.json

export interface UserOut {
    id: number;
    full_name: string;
    phone?: string | null;
    email?: string | null;
}

export interface DriverOut {
    id: number;
    user_id: number;
    vehicle_type?: string | null;
    vehicle_plate?: string | null;
    is_online: boolean;
    user: UserOut;
}

export interface PetOut {
    id: number;
    user_id: number;
    name: string;
    type?: string | null;
    breed?: string | null;
    weight?: number | null;
    owner: UserOut;
}

export type OrderStatus = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'picked_up' | 'completed' | 'cancelled';

export interface Order {
    id: number;
    user_id: number;
    driver_id?: number | null;
    pet_id: number;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_address: string;
    dropoff_lat: number;
    dropoff_lng: number;
    status: string;
    price?: number | null;
    platform_fee?: number | null;
    driver_earnings?: number | null;
    commission_rate?: number | null;
    passengers?: number;
    pet_details?: string | null;
    customer: UserOut;
    driver?: DriverOut | null;
    customer_lat?: number;
    customer_lng?: number;
    created_at: string;
    pet: PetOut;
    pets: PetOut[]; // New array
}

export interface OrderCreate {
    user_id: number;
    driver_id?: number | null;
    pet_id: number;
    pet_ids?: number[]; // New array
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_address: string;
    dropoff_lat: number;
    dropoff_lng: number;
    status?: OrderStatus;
    price?: number | null;
    passengers?: number;
    pet_details?: string;
    customer_lat?: number;
    customer_lng?: number;
}
