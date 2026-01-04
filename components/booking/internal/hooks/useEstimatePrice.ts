import { useEffect, useState } from 'react';
import { api } from '../../../../../services/api';

export function useEstimatePrice(params: {
    pickup: any;
    dropoff: any;
    vehicleId?: string;
    petWeight: number;
}) {
    const [price, setPrice] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!params.pickup || !params.dropoff || !params.vehicleId) return;

        setLoading(true);
        api
            .estimatePrice({
                pickup_lat: params.pickup.latitude,
                pickup_lng: params.pickup.longitude,
                dropoff_lat: params.dropoff.latitude,
                dropoff_lng: params.dropoff.longitude,
                vehicle_type: params.vehicleId,
                pet_weight_kg: params.petWeight,
                provider: 'here',
            })
            .then(res => setPrice(res.estimated_price))
            .finally(() => setLoading(false));
    }, [params]);

    return { price, loading };
}
