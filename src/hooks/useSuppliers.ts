import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { Supplier } from '../types';

export function useSuppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSuppliers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/suppliers`, {
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(`Backend fetch failed: ${resp.status}`);
            const json = await resp.json();
            setSuppliers(json.suppliers || []);
        } catch (err: any) {
            console.warn('Backend fetch failed, trying Supabase:', err.message);
            try {
                const { data, error: sErr } = await supabase
                    .from('suppliers')
                    .select('*')
                    .order('name');
                if (sErr) throw sErr;
                setSuppliers((data || []) as Supplier[]);
            } catch (sErr: any) {
                setError(sErr.message || 'Failed to load suppliers');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const saveSupplier = async (supplierData: Partial<Supplier>, id?: string) => {
        try {
            const method = id ? 'PUT' : 'POST';
            const url = id
                ? `${ADMIN_BASE}/admin/suppliers/${id}`
                : `${ADMIN_BASE}/admin/suppliers`;

            const resp = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Role': 'admin'
                },
                body: JSON.stringify(supplierData),
            });

            if (!resp.ok) {
                const errorTxt = await resp.text();
                throw new Error(errorTxt || `HTTP Error ${resp.status}`);
            }

            await loadSuppliers();
            return { success: true };
        } catch (err: any) {
            console.error('Save supplier error:', err);
            try {
                if (id) {
                    const { error: sErr } = await (supabase.from('suppliers' as any) as any).update(supplierData).match({ id });
                    if (sErr) throw sErr;
                } else {
                    const { error: sErr } = await (supabase.from('suppliers' as any) as any).insert([supplierData]);
                    if (sErr) throw sErr;
                }
                await loadSuppliers();
                return { success: true };
            } catch (fallbackErr: any) {
                return { success: false, error: fallbackErr.message };
            }
        }
    };

    const deleteSupplier = async (id: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/suppliers/${id}`, {
                method: 'DELETE',
                headers: { 'X-Role': 'admin' },
            });

            if (resp.status === 409) {
                return { success: false, conflict: true };
            }

            if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);

            await loadSuppliers();
            return { success: true };
        } catch (err: any) {
            try {
                const { error: sErr } = await (supabase.from('suppliers' as any) as any).delete().match({ id });
                if (sErr) throw sErr;
                await loadSuppliers();
                return { success: true };
            } catch (sErr: any) {
                return { success: false, error: sErr.message };
            }
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, [loadSuppliers]);

    return {
        suppliers,
        loading,
        error,
        refresh: loadSuppliers,
        saveSupplier,
        deleteSupplier
    };
}
