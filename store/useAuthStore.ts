import { create } from 'zustand';
import { authService } from '../services/authService';
import { User } from '../types/auth';

type UserRole = 'customer' | 'driver' | 'admin' | null;

interface AuthState {
    user: User | null;
    role: UserRole;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    loginWithPassword: (username: string, password: string) => Promise<void>;
    loginWithOTP: (phoneNumber: string, otp: string) => Promise<void>;
    register: (fullName: string, phone: string, email: string, password: string) => Promise<void>;
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

    register: async (fullName: string, phone: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.register({
                full_name: fullName,
                phone,
                email: email || undefined,
                password,
            });
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

