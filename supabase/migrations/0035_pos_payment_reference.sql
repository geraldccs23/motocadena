-- Migration 0035_pos_payment_reference.sql
BEGIN;

-- 1. Add reference column to track transfer IDs, mobile payment refs, etc.
ALTER TABLE public.pos_sale_payments
  ADD COLUMN IF NOT EXISTS reference text;

-- 2. Ensure bank column is present (already in 0028, but for safety)
ALTER TABLE public.pos_sale_payments
  ADD COLUMN IF NOT EXISTS bank text;

-- 3. Update any existing RLS if necessary (usually 'anon' already has access)
-- No changes needed if the previous anon policies were the same.

COMMIT;
