-- 0044_ecommerce_schema.sql
-- Módulo de eCommerce para Motocadena

BEGIN;

-- 1. Categorías de Productos
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON public.product_categories(slug);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- 2. Imágenes de Productos (Múltiples imágenes por producto)
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- 3. Extensiones a la tabla de Productos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'slug') THEN
        ALTER TABLE public.products ADD COLUMN slug TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_ecommerce') THEN
        ALTER TABLE public.products ADD COLUMN is_ecommerce BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_featured') THEN
        ALTER TABLE public.products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_ecommerce ON public.products(is_ecommerce);

-- 4. Extensiones a la tabla de Ventas POS para eCommerce
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pos_sales' AND column_name = 'sale_source') THEN
        ALTER TABLE public.pos_sales ADD COLUMN sale_source TEXT DEFAULT 'pos' CHECK (sale_source IN ('pos', 'ecommerce'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pos_sales' AND column_name = 'shipping_address') THEN
        ALTER TABLE public.pos_sales ADD COLUMN shipping_address JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pos_sales' AND column_name = 'customer_email') THEN
        ALTER TABLE public.pos_sales ADD COLUMN customer_email TEXT;
    END IF;
END $$;

-- 5. Triggers para actualizar updated_at en product_categories
DROP TRIGGER IF EXISTS trg_product_categories_set_updated ON public.product_categories;
CREATE TRIGGER trg_product_categories_set_updated
BEFORE UPDATE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- 6. Políticas RLS para Acceso Público (Lectura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'public_select_categories') THEN
        CREATE POLICY public_select_categories ON public.product_categories FOR SELECT TO anon, authenticated USING (is_active = TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_images' AND policyname = 'public_select_images') THEN
        CREATE POLICY public_select_images ON public.product_images FOR SELECT TO anon, authenticated USING (TRUE);
    END IF;
END $$;

-- Asegurar que las políticas de products permiten lectura pública
DROP POLICY IF EXISTS anon_select_products ON public.products;
CREATE POLICY anon_select_products ON public.products 
FOR SELECT TO anon, authenticated 
USING (true);

COMMIT;
