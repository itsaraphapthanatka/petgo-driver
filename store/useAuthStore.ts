import { create } from 'zustand';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/httpClient';
import { User, DriverRegisterRequest } from '../types/auth';
import { useBookingStore } from './useBookingStore';
import { useJobStore } from './useJobStore';

type UserRole = 'customer' | 'driver' | 'admin' | null;

interface AuthState {
    user: User | null;
    role: UserRole;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    loginWithPassword: (username: string, password: string) => Promise<void>;
    loginWithOTP: (phoneNumber: string, otp: string) => Promise<void>;
    register: (data: DriverRegisterRequest) => Promise<void>;
    loadUser: () => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    loginWithPassword: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.login(username, password);
            set({
                isAuthenticated: true,
                role: response.role as UserRole,
                user: (response.driver || response.user) as User,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Login failed',
                isLoading: false,
            });
            throw error;
        }
    },

    loginWithOTP: async (phoneNumber: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.verifyOTP(phoneNumber, otp);
            set({
                isAuthenticated: true,
                role: response.role as UserRole,
                user: (response.driver || response.user) as User,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'OTP verification failed',
                isLoading: false,
            });
            throw error;
        }
    },

    register: async (data: DriverRegisterRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.register(data);
            set({
                isAuthenticated: true,
                role: response.role as UserRole,
                user: (response.driver || response.user) as User,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Registration failed',
                isLoading: false,
            });
            throw error;
        }
    },

    loadUser: async () => {
        set({ isLoading: true, error: null });
        try {
            const user = await authService.getCurrentUser();
            set({
                isAuthenticated: true,
                role: user.role,
                user,
                isLoading: false,
            });
        } catch (error: any) {
            // Token is invalid or expired
            set({
                isAuthenticated: false,
                role: null,
                user: null,
                isLoading: false,
            });
        }
    },

    logout: async () => {
        await authService.logout();

        // Clear other stores
        if (useBookingStore.getState().clearBooking) {
            useBookingStore.getState().clearBooking();
        }
        if (useJobStore.getState().clearJobs) {
            useJobStore.getState().clearJobs();
        }

        set({
            isAuthenticated: false,
            role: null,
            user: null,
            error: null,
        });
    },

    setUser: (user: User | null) => set({ user }),

    clearError: () => set({ error: null }),
}));

// Global rule for expired sessions: any 401 from a service that uses apiFetch (api.ts, orderService.ts,
// petService.ts, authService.ts) clears the session once, so the root layout sends the user to login
// instead of leaving them on a screen that failed silently. The handler is injected (see
// services/httpClient.ts) because a service importing this store would close the require cycle
// services -> useAuthStore -> useJobStore -> services/orderService.
setUnauthorizedHandler(async () => {
    if (!useAuthStore.getState().isAuthenticated) return; // already signed out, or a public endpoint
    await useAuthStore.getState().logout();
});

