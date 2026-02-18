import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, ProductCategory } from '../types';

export function useShop() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadShopData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch active categories
            const { data: catData, error: catErr } = await supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (catErr) throw catErr;
            setCategories(catData || []);

            // Fetch products marked for ecommerce
            const { data: prodData, error: prodErr } = await supabase
                .from('products')
                .select(`
                    *,
                    image_url
                `)
                .eq('is_ecommerce', true)
                .order('created_at', { ascending: false })
                .limit(8);

            if (prodErr) throw prodErr;
            setProducts(prodData || []);

        } catch (err: any) {
            console.error('CRITICAL: Shop data load failed.', {
                name: err.name,
                message: err.message,
                reason: err.reason, // Algunos browsers lo ponen aquí
                stack: err.stack
            });
            setError(err.message || 'Error al cargar la tienda');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadShopData();
    }, [loadShopData]);

    return {
        products,
        categories,
        loading,
        error,
        refresh: loadShopData
    };
}
