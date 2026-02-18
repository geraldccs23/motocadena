-- 0045_product_image_url.sql
-- Add image_url directly to products table for simplicity

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Optional: Migrate data from product_images if any exists
-- UPDATE public.products p 
-- SET image_url = (SELECT url FROM public.product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1)
-- WHERE image_url IS NULL;
