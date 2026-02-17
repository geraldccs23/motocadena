import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { Product } from '../types';

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0, currentPage: 1, limit: 10 });

    const loadProducts = useCallback(async (page = 1, limit = 10) => {
        setLoading(true);
        setError(null);
        try {
            // Usar el endpoint de stock con paginación
            const resp = await fetch(`${ADMIN_BASE}/admin/inventory/stock?page=${page}&limit=${limit}`, {
                headers: { 'X-Role': 'admin' }
            });
            if (!resp.ok) throw new Error(`Backend fetch failed: ${resp.status}`);
            const json = await resp.json();

            // Mapear StockRow a Product (adaptando product_id a id)
            const mapped = (json.stock || []).map((s: any) => ({
                id: s.product_id,
                sku: s.sku,
                name: s.name,
                unit_price: s.unit_price,
                unit_cost: s.unit_cost,
                status: s.status,
                stock: s.stock
            }));

            setProducts(mapped);
            if (json.pagination) {
                setPagination(json.pagination);
            }
        } catch (err: any) {
            console.warn('Backend stock fetch failed, trying Supabase products:', err.message);
            // Fallback for direct Supabase access (without pagination for now)
            try {
                const { data, error: sErr } = await supabase
                    .from('products')
                    .select('*')
                    .order('name');
                if (sErr) throw sErr;
                setProducts((data || []) as Product[]);
            } catch (sErr: any) {
                setError(sErr.message || 'Failed to load products');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const saveProduct = async (productData: any, id?: string) => {
        try {
            const method = id ? 'PUT' : 'POST';
            const url = id
                ? `${ADMIN_BASE}/admin/products/${id}`
                : `${ADMIN_BASE}/admin/products`;

            const resp = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Role': 'admin'
                },
                body: JSON.stringify(productData),
            });

            if (!resp.ok) {
                const errorTxt = await resp.text();
                throw new Error(errorTxt || `HTTP Error ${resp.status}`);
            }

            await loadProducts(pagination.currentPage, pagination.limit);
            return { success: true };
        } catch (err: any) {
            console.error('Save product error:', err);
            try {
                if (id) {
                    const { error: sErr } = await (supabase.from('products' as any) as any).update(productData).match({ id });
                    if (sErr) throw sErr;
                } else {
                    const { error: sErr } = await (supabase.from('products' as any) as any).insert([productData]);
                    if (sErr) throw sErr;
                }
                await loadProducts(pagination.currentPage, pagination.limit);
                return { success: true };
            } catch (fallbackErr: any) {
                return { success: false, error: fallbackErr.message };
            }
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'X-Role': 'admin' },
            });

            if (resp.status === 409) {
                return { success: false, conflict: true };
            }

            if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);

            await loadProducts(pagination.currentPage, pagination.limit);
            return { success: true };
        } catch (err: any) {
            try {
                const { error: sErr } = await (supabase.from('products' as any) as any).delete().match({ id });
                if (sErr) throw sErr;
                await loadProducts(pagination.currentPage, pagination.limit);
                return { success: true };
            } catch (sErr: any) {
                return { success: false, error: sErr.message };
            }
        }
    };

    const adjustStock = async (id: string, type: 'in' | 'out', quantity: number, unitCost?: number) => {
        try {
            const resp = await fetch(`${ADMIN_BASE}/admin/inventory/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
                body: JSON.stringify({ product_id: id, movement_type: type, quantity, unit_cost: unitCost })
            });

            if (!resp.ok) throw new Error(await resp.text());
            await loadProducts(pagination.currentPage, pagination.limit);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    return {
        products,
        loading,
        error,
        pagination,
        refresh: loadProducts,
        saveProduct,
        deleteProduct,
        adjustStock
    };
}
