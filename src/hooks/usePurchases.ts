import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { PurchaseInvoice } from '../types';

export function usePurchases() {
    const [purchases, setPurchases] = useState<PurchaseInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPurchases = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases`, {
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(`Backend fetch failed: ${resp.status}`);
            const json = await resp.json();
            setPurchases(json.purchases || []);
        } catch (err: any) {
            console.warn('Backend fetch failed, trying Supabase:', err.message);
            try {
                const { data, error: sErr } = await supabase
                    .from('purchase_invoices')
                    .select('*, supplier:suppliers(name)')
                    .order('created_at', { ascending: false });
                if (sErr) throw sErr;
                setPurchases((data || []) as any);
            } catch (sErr: any) {
                setError(sErr.message || 'Failed to load purchases');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const createPurchase = async (supplier_id: string, notes?: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify({ supplier_id, notes })
            });
            if (!resp.ok) throw new Error(await resp.text());
            const json = await resp.json();
            await loadPurchases();
            return { success: true, purchase: json.purchase || json };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deletePurchase = async (id: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases/${id}`, {
                method: 'DELETE',
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) {
                if (resp.status === 409) return { success: false, conflict: true };
                throw new Error(await resp.text());
            }
            await loadPurchases();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const getPurchaseDetails = async (id: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases/${id}`, {
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(await resp.text());
            const json = await resp.json();
            return { success: true, invoice: json.invoice, items: json.items };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const addItem = async (purchaseId: string, itemData: { product_id: string, quantity: number, unit_cost: number }) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases/${purchaseId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify(itemData)
            });
            if (!resp.ok) throw new Error(await resp.text());
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateItem = async (purchaseId: string, itemId: string, itemData: { quantity?: number, unit_cost?: number }) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases/${purchaseId}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify(itemData)
            });
            if (!resp.ok) throw new Error(await resp.text());
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const removeItem = async (purchaseId: string, itemId: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases/${purchaseId}/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(await resp.text());
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const receivePurchase = async (id: string, docs?: any) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/purchases/${id}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify(docs || {})
            });
            if (!resp.ok) throw new Error(await resp.text());
            await loadPurchases();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        loadPurchases();
    }, [loadPurchases]);

    return {
        purchases,
        loading,
        error,
        refresh: loadPurchases,
        createPurchase,
        deletePurchase,
        getPurchaseDetails,
        addItem,
        updateItem,
        removeItem,
        receivePurchase
    };
}
