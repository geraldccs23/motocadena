-- Migration 0034_inventory_v2.sql

BEGIN;

-- 1. Create inventory_movements if it doesn't exist, matching user's schema
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  product_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  unit_cost numeric(10, 2) NOT NULL DEFAULT 0,
  source text NULL,
  source_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT inventory_movements_movement_type_check CHECK (
    (
      movement_type = ANY (ARRAY['in'::text, 'out'::text])
    )
  ),
  CONSTRAINT inventory_movements_quantity_check CHECK ((quantity > (0)::numeric)),
  CONSTRAINT inventory_movements_source_check CHECK (
    (
      source = ANY (
        ARRAY[
          'purchase'::text,
          'sale'::text,
          'adjustment'::text,
          'init'::text
        ]
      )
    )
  )
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_inv_mov_prod ON public.inventory_movements USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_source ON public.inventory_movements USING btree (source, source_id);

-- 3. View for products with stock (Optimized: Subquery instead of JOIN + GROUP BY)
CREATE OR REPLACE VIEW public.v_products_with_stock AS
SELECT 
    p.*,
    (
        SELECT COALESCE(SUM(
            CASE 
                WHEN m.movement_type = 'in' THEN m.quantity 
                WHEN m.movement_type = 'out' THEN -m.quantity 
                ELSE 0 
            END
        ), 0)
        FROM public.inventory_movements m
        WHERE m.product_id = p.id
    ) as stock
FROM 
    public.products p;

-- 4. Enable RLS on the new table if not already
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Minimal)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'anon_select_inv_mov') THEN
    CREATE POLICY anon_select_inv_mov ON public.inventory_movements FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_movements' AND policyname = 'anon_insert_inv_mov') THEN
    CREATE POLICY anon_insert_inv_mov ON public.inventory_movements FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

COMMIT;
