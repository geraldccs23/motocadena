-- Extend POS payments with currency, original amount and bank
BEGIN;

-- Add columns if not exist
ALTER TABLE public.pos_sale_payments
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS original_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS bank text;

-- Try to drop restrictive check on method to allow new methods
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pos_sale_payments'::regclass
      AND conname = 'pos_sale_payments_method_check'
  ) THEN
    ALTER TABLE public.pos_sale_payments DROP CONSTRAINT pos_sale_payments_method_check;
  END IF;
END $$;

-- Optional: constrain currency values
ALTER TABLE public.pos_sale_payments
  ADD CONSTRAINT pos_sale_payments_currency_check CHECK (currency IS NULL OR currency IN ('USD','VES'));

-- Backfill existing rows
UPDATE public.pos_sale_payments
SET currency = COALESCE(currency, 'USD'),
    original_amount = COALESCE(original_amount, amount)
WHERE currency IS NULL OR original_amount IS NULL;

COMMIT;