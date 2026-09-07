import { useEffect, useState } from 'react';
import { googleDirectionsApi, DirectionsRoute } from '../../../../services/googleDirectionsApi';

export function useDirectionsRoutes(pickup: any, dropoff: any) {
    const [routes, setRoutes] = useState<DirectionsRoute[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
        if (!pickup || !dropoff) return;

        let cancelled = false;
        setLoading(true);
        googleDirectionsApi
            .getRouteAlternatives(pickup, dropoff, 3)
            .then((result) => {
                if (cancelled) return;
                setRoutes(result);
                setError(null);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setRoutes([]);
                setError(err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [pickup, dropoff]);

    const selectedRoute = routes[selectedIndex];

    return {
        routes,
        selectedRoute,
        selectedIndex,
        setSelectedIndex,
        loading,
        error,
    };
}
