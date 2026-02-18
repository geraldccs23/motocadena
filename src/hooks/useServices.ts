import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { Service } from '../types';

export function useServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadServices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: sErr } = await supabase
                .from('services')
                .select('*')
                .order('name');
            if (sErr) throw sErr;
            setServices((data || []) as Service[]);
        } catch (err: any) {
            console.warn('Supabase fetch failed, trying backend:', err.message);
            try {
                const resp = await fetch(`${ADMIN_BASE}/admin/services`, {
                    headers: { 'X-Role': 'admin' }
                });
                if (!resp.ok) throw new Error(`Backend fetch failed: ${resp.status}`);
                const json = await resp.json();
                setServices(json?.services || []);
            } catch (be: any) {
                console.error('Error in useServices backend fetch:', be);
                setError(be.message || 'Failed to load services');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const saveService = async (serviceData: any, id?: string) => {
        try {
            if (id) {
                const { error: sErr } = await (supabase
                    .from('services' as any) as any)
                    .update(serviceData)
                    .match({ id });
                if (sErr) throw sErr;
            } else {
                const { error: sErr } = await (supabase
                    .from('services' as any) as any)
                    .insert([serviceData]);
                if (sErr) throw sErr;
            }
            await loadServices();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteService = async (id: string) => {
        try {
            const { error: sErr } = await supabase
                .from('services')
                .delete()
                .eq('id', id);
            if (sErr) throw sErr;
            await loadServices();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    return {
        services,
        loading,
        error,
        refresh: loadServices,
        saveService,
        deleteService
    };
}
