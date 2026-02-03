import { create } from 'zustand';

type MapProvider = 'google' | 'here' | 'longdo';

interface SettingsState {
    mapProvider: MapProvider;
    setMapProvider: (provider: MapProvider) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    mapProvider: 'google',
    setMapProvider: (provider) => set({ mapProvider: provider }),
}));
