import { create } from 'zustand';

export interface Location {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

interface BookingState {
    pickupLocation: Location | null;
    dropoffLocation: Location | null;
    stops: Location[];
    setPickupLocation: (location: Location | null) => void;
    setDropoffLocation: (location: Location | null) => void;
    setStops: (locations: Location[]) => void;
    addStop: (location: Location) => void;
    updateStop: (index: number, location: Location) => void;
    removeStop: (index: number) => void;
    clearBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
    pickupLocation: null,
    dropoffLocation: null,
    stops: [],
    setPickupLocation: (location) => set({ pickupLocation: location }),
    setDropoffLocation: (location) => set({ dropoffLocation: location }),
    setStops: (locations) => set({ stops: locations }),
    addStop: (location) => set((state) => ({ stops: [...state.stops, location] })),
    updateStop: (index, location) => set((state) => {
        const newStops = [...state.stops];
        newStops[index] = location;
        return { stops: newStops };
    }),
    removeStop: (index) => set((state) => ({ stops: state.stops.filter((_, i) => i !== index) })),
    clearBooking: () => set({ pickupLocation: null, dropoffLocation: null, stops: [] }),
}));
