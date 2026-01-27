-- Agregar columnas extra a productos: marca, código proveedor y código OEM
alter table if exists public.products
  add column if not exists brand text;

alter table if exists public.products
  add column if not exists supplier_code text;

alter table if exists public.products
  add column if not exists oem_code text;

-- Índices para búsqueda
create index if not exists idx_products_brand on public.products(brand);
create index if not exists idx_products_supplier_code on public.products(supplier_code);
create index if not exists idx_products_oem_code on public.products(oem_code);
