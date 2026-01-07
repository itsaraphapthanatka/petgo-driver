export interface User {
    id: number;
    full_name: string;
    photo: string;
    phone: string;
    email: string | null;
    role: 'customer' | 'driver' | 'admin';
    wallet_balance?: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    work_radius_km?: number;
}

export interface LoginRequest {
    username: string; // Can be email or phone
    password: string;
}

export interface RegisterRequest {
    full_name: string;
    email?: string;
    phone: string;
    password: string;
}

export interface OTPRequest {
    phone_number: string;
}

export interface OTPVerifyRequest {
    phone_number: string;
    otp: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user?: User;
    driver?: User;
    role: string;
}

export interface OTPResponse {
    status: string;
    message: string;
    expires_at: string;
    debug_otp?: string; // Only in development
}

export interface AuthError {
    detail: string;
}
