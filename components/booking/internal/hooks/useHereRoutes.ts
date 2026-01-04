import { useEffect, useState } from 'react';
import { hereMapApi, HereRoute } from '../../../../../services/hereMapApi';

const HERE_MAPS_API_KEY = process.env.EXPO_PUBLIC_HERE_MAP_KEY as string;

export function useHereRoutes(pickup: any, dropoff: any) {
    const [routes, setRoutes] = useState<HereRoute[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!pickup || !dropoff) return;

        setLoading(true);
        hereMapApi
            .getHereRouteAlternatives(pickup, dropoff, HERE_MAPS_API_KEY, 3)
            .then(setRoutes)
            .finally(() => setLoading(false));
    }, [pickup, dropoff]);

    const selectedRoute = routes[selectedIndex];

    return {
        routes,
        selectedRoute,
        selectedIndex,
        setSelectedIndex,
        loading,
    };
}
