-- Add manual entry columns to budgets table
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS manual_customer_name TEXT,
ADD COLUMN IF NOT EXISTS manual_vehicle_name TEXT;

-- Make customer_id and vehicle_id nullable (already are, but to be sure)
ALTER TABLE public.budgets
ALTER COLUMN customer_id DROP NOT NULL,
ALTER COLUMN vehicle_id DROP NOT NULL;
