-- POS returns module and exchange rate column
-- Adds returns tables and optional exchange_rate on pos_sales

BEGIN;

-- Add exchange_rate to pos_sales (optional)
ALTER TABLE public.pos_sales
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,4);

-- Returns header
CREATE TABLE IF NOT EXISTS public.pos_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  notes text,
  status text NOT NULL DEFAULT 'completed',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Returns items
CREATE TABLE IF NOT EXISTS public.pos_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.pos_returns(id) ON DELETE CASCADE,
  sale_item_id uuid REFERENCES public.pos_sale_items(id),
  product_id uuid REFERENCES public.products(id),
  service_id uuid REFERENCES public.services(id),
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_returns_sale ON public.pos_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_return_items_return ON public.pos_return_items(return_id);

COMMIT;