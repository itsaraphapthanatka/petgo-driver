/** Where a driver stands in the admin verification queue (backend `drivers.registration_status`). */
export type DriverRegistrationStatus = 'pending' | 'approved' | 'rejected';

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

    // ---- Drivers only: GET /auth/me returns backend schemas.DriverOut for a driver token ----
    /** Absent on customers/admins, and on older backends. `undefined` must not lock a driver out. */
    registration_status?: DriverRegistrationStatus;
    is_verified?: boolean;
    /** Reason the admin typed when rejecting the application (shown on the pending-approval screen). */
    rejection_reason?: string | null;
    /** Vehicle the driver registered; shown so they can spot a wrong plate before an admin rejects it. */
    vehicle_type?: string | null;
    vehicle_plate?: string | null;
    // Documents the admin verification queue looks at. Only presence is used in the app (there is no
    // upload UI yet), never the URL itself: /uploads is public, so a URL must not be rendered or logged.
    id_card_front_url?: string | null;
    driver_license_front_url?: string | null;
    selfie_with_id_url?: string | null;
    vehicle_registration_url?: string | null;
    bank_account_image_url?: string | null;
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

/** Payload for POST /auth/driver/register (backend schemas.DriverRegister). Used by the driver app only. */
export interface DriverRegisterRequest {
    full_name: string;
    phone: string;
    email?: string;
    password: string;
    vehicle_type: string; // key from GET /pricing/vehicle-types, e.g. 'car' | 'suv' | 'van'
    vehicle_plate: string;
    otp: string; // 6-digit code from POST /auth/request-otp for the same phone
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
