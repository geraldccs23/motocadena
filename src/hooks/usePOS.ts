import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { PosSale, PosItem, PosPayment } from '../types';

export function usePOS() {
    const [currentSale, setCurrentSale] = useState<PosSale | null>(null);
    const [items, setItems] = useState<PosItem[]>([]);
    const [payments, setPayments] = useState<PosPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [todaySales, setTodaySales] = useState<PosSale[]>([]);

    const loadTodaySales = useCallback(async () => {
        try {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const { data, error: sErr } = await supabase
                .from('pos_sales')
                .select('*, client:clients(full_name)')
                .gte('created_at', start.toISOString())
                .order('created_at', { ascending: false });
            if (sErr) throw sErr;
            setTodaySales((data || []) as any);
        } catch (err: any) {
            console.error('Error loading today sales:', err.message);
        }
    }, []);

    const refreshSale = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${id}`, {
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(await resp.text());
            const json = await resp.json();
            setCurrentSale(json.sale);
            setItems(json.items || []);
            setPayments(json.payments || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const createSale = async (clientId?: string) => {
        setLoading(true);
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify({ client_id: clientId || null })
            });
            if (!resp.ok) throw new Error(await resp.text());
            const json = await resp.json();
            const saleId = json.id || json.sale?.id;
            await refreshSale(saleId);
            await loadTodaySales();
            return { success: true, saleId };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const addItem = async (saleId: string, itemData: any) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify(itemData)
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateItem = async (saleId: string, itemId: string, itemData: any) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify(itemData)
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const removeItem = async (saleId: string, itemId: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const addPayment = async (saleId: string, paymentData: any) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify(paymentData)
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const finalizeSale = async (saleId: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}/finalize`, {
                method: 'POST',
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            await loadTodaySales();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const voidSale = async (saleId: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}/void`, {
                method: 'POST',
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            await loadTodaySales();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateClient = async (saleId: string, clientId: string | null) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify({ client_id: clientId })
            });
            if (!resp.ok) throw new Error(await resp.text());
            await refreshSale(saleId);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        loadTodaySales();
    }, [loadTodaySales]);

    return {
        currentSale,
        items,
        payments,
        loading,
        error,
        todaySales,
        createSale,
        addItem,
        updateItem,
        removeItem,
        addPayment,
        finalizeSale,
        voidSale,
        refreshSale,
        updateClient,
        loadTodaySales
    };
}
