-- Migración para Movimientos de Inventario Atómicos (Evitar Race Conditions)

CREATE OR REPLACE FUNCTION public.process_inventory_movement(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_movement_type TEXT,
    p_quantity NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock NUMERIC := 0;
    v_new_stock NUMERIC := 0;
BEGIN
    IF lower(p_movement_type) NOT IN ('in', 'out') THEN
        RAISE EXCEPTION 'Invalid movement_type. Must be in or out.';
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be greater than 0.';
    END IF;

    -- Upsert inicial por si nunca se inicializó
    INSERT INTO public.inventory_levels (product_id, warehouse_id, stock)
    VALUES (p_product_id, p_warehouse_id, 0)
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;

    -- Seleccionar stock actual con bloqueo exclusivo por fila (FOR UPDATE)
    SELECT stock INTO v_current_stock
    FROM public.inventory_levels
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF lower(p_movement_type) = 'in' THEN
        v_new_stock := v_current_stock + p_quantity;
    ELSE
        v_new_stock := v_current_stock - p_quantity;
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para descontar %', p_quantity;
        END IF;
    END IF;

    -- Aplicar nuevo stock
    UPDATE public.inventory_levels
    SET stock = v_new_stock
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    -- Registrar la traza del movimiento
    INSERT INTO public.inventory_movements(product_id, warehouse_id, movement_type, quantity, notes)
    VALUES (p_product_id, p_warehouse_id, lower(p_movement_type), p_quantity, p_notes);

    RETURN jsonb_build_object('success', true, 'new_stock', v_new_stock);
END;
$$;
