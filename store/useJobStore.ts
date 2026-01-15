import { create } from 'zustand';
import { Order } from '../types/order';
import { orderService } from '../services/orderService';

interface JobState {
    pendingJobs: Order[];
    activeJob: Order | null;
    isLoading: boolean;
    error: string | null;
    declinedJobIds: number[];

    // Actions
    fetchPendingJobs: () => Promise<void>;
    acceptJob: (orderId: number) => Promise<Order>;
    declineJob: (orderId: number) => Promise<void>;
    setActiveJob: (job: Order | null) => void;
    clearJobs: () => void;
    refreshActiveJob: () => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
    pendingJobs: [],
    activeJob: null,
    isLoading: false,
    error: null,
    declinedJobIds: [],

    fetchPendingJobs: async () => {
        set({ isLoading: true, error: null });
        try {
            const jobs = await orderService.getPendingOrders();
            const { declinedJobIds } = get();
            // Filter out declined jobs
            const filteredJobs = jobs.filter(job => !declinedJobIds.includes(job.id));
            set({ pendingJobs: filteredJobs, isLoading: false });
        } catch (error: any) {
            console.error('Failed to fetch pending jobs:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    acceptJob: async (orderId: number) => {
        set({ isLoading: true, error: null });
        try {
            const acceptedOrder = await orderService.acceptOrder(orderId);
            set((state) => ({
                pendingJobs: state.pendingJobs.filter(job => job.id !== orderId),
                activeJob: acceptedOrder,
                isLoading: false,
            }));
            return acceptedOrder;
        } catch (error: any) {
            console.error('Failed to accept job:', error);
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    declineJob: async (orderId: number) => {
        try {
            // Local filtering for immediate UI feedback
            set((state) => ({
                pendingJobs: state.pendingJobs.filter(job => job.id !== orderId),
                declinedJobIds: [...state.declinedJobIds, orderId],
            }));

            // Persistent decline on backend
            await orderService.declineOrder(orderId);
        } catch (error: any) {
            console.error('Failed to decline job on backend:', error);
            // Optional: revert local state or show error if critical
        }
    },

    setActiveJob: (job: Order | null) => {
        set({ activeJob: job });
    },

    clearJobs: () => {
        set({ pendingJobs: [], activeJob: null, error: null });
    },

    refreshActiveJob: async () => {
        const { activeJob } = get();
        if (!activeJob) return;

        try {
            const refreshedOrder = await orderService.getOrder(activeJob.id);
            set({ activeJob: refreshedOrder });
        } catch (error: any) {
            console.error('Failed to refresh active job:', error);
        }
    },
}));
