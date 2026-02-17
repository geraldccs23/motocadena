import { useState, useCallback } from 'react';
import { ADMIN_BASE } from '../lib/api';

export interface PlateLookupResult {
    customer?: {
        full_name?: string;
        id?: string;
    };
    vehicle?: {
        plate?: string;
        brand?: string;
        model?: string;
        id?: string;
    };
    order?: {
        id: string;
        created_at: string;
        status: string;
        status_label: string;
        total?: number;
    };
    orders?: any[];
    inspections?: { initial?: boolean; final?: boolean };
    services?: any[];
}

export function useOrderStatus() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PlateLookupResult | null>(null);

    const lookupByPlate = useCallback(async (plate: string) => {
        if (!plate || plate.trim().length < 3) {
            setError('Por favor ingresa una placa válida');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const resp = await fetch(`${ADMIN_BASE}/public/orders/by-plate/${encodeURIComponent(plate.trim())}`);
            if (!resp.ok) throw new Error('Error consultando la orden');
            const json = await resp.json();
            setResult(json);

            // If no orders found via backend but client exists, try direct Supabase fallback 
            // (This logic matches the original PublicWebsite.tsx)
            if (!json?.orders?.length && json?.client?.id) {
                // Fallback logic could be added here if needed, 
                // but for now we follow the backend primary source
            }
        } catch (err: any) {
            console.warn('Backend lookup failed, error:', err);
            setError(err.message || 'Error al consultar la placa');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        result,
        lookupByPlate
    };
}
