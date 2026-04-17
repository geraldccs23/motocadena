-- MASTER RECONSTRUCTION SQL: MOTOCADENA INVENCIBLE V2.0
-- Este script realiza una limpieza controlada y establece las bases maestras.

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LIMPIEZA DE TABLAS REDUNDANTES O EN CONFLICTO
-- Eliminamos primero las tablas hijas para evitar fallos de FK
DROP TABLE IF EXISTS public.cash_sessions CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.pos_sale_items CASCADE;
DROP TABLE IF EXISTS public.pos_sales CASCADE;
DROP TABLE IF EXISTS public.work_order_parts CASCADE;
DROP TABLE IF EXISTS public.work_order_services CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE; -- Eliminada en favor de customers
DROP TABLE IF EXISTS public.customers CASCADE;

-- 2. CREACIÓN DE TABLAS MAESTRAS (UNIFICADAS)

-- TABLA: CLIENTES (Unificada)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    id_number TEXT UNIQUE, -- Cédula / RIF
    email TEXT,
    phone TEXT NOT NULL, -- Importante para el Portal
    address TEXT,
    referred_by_customer_id UUID REFERENCES public.customers(id),
    is_vip BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: VEHÍCULOS
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    plate TEXT NOT NULL UNIQUE, -- Placa para el portal
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    vin TEXT,
    color TEXT,
    engine_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: SESIONES DE CAJA (Z-Reads)
CREATE TABLE public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    opened_by UUID REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    opening_balance_usd DECIMAL(12,2) DEFAULT 0,
    opening_balance_bs DECIMAL(12,2) DEFAULT 0,
    calculated_usd DECIMAL(12,2) DEFAULT 0,
    calculated_bs DECIMAL(12,2) DEFAULT 0,
    declared_usd DECIMAL(12,2) DEFAULT 0,
    declared_bs DECIMAL(12,2) DEFAULT 0,
    breakdown JSONB, -- { "100": qty, "50": qty, ... }
    closing_notes TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: VENTAS POS
CREATE TABLE public.pos_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    customer_id UUID REFERENCES public.customers(id),
    seller_id UUID REFERENCES auth.users(id),
    total_amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'COMPLETED', -- COMPLETED, PENDING, CANCELLED
    is_credit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: PAGOS E INGRESOS (Centralizada)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    cash_session_id UUID REFERENCES public.cash_sessions(id),
    sale_id UUID REFERENCES public.pos_sales(id),
    work_order_id UUID, -- Referencia opcional si es pago de orden
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD', -- USD o VEF
    method TEXT NOT NULL, -- EFECTIVO_USD, PAGO_MOVIL, TRANSFERENCIA_BS, etc.
    reference_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: EGRESOS (GAV)
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    cash_session_id UUID REFERENCES public.cash_sessions(id),
    category TEXT NOT NULL, -- ALQUILER, NOMINA, REPUESTOS, OTROS
    description TEXT,
    amount_usd DECIMAL(12,2) NOT NULL,
    amount_bs DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- TABLA: CITAS (Appointments)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    customer_id UUID REFERENCES public.customers(id),
    vehicle_id UUID REFERENCES public.vehicles(id),
    service_id UUID REFERENCES public.services(id),
    mechanic_id UUID REFERENCES auth.users(id), -- Referencia a auth.users
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_min INTEGER NOT NULL,
    status TEXT DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: ÓRDENES DE TRABAJO (Work Orders)
CREATE TABLE public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES public.workshops(id),
    vehicle_id UUID REFERENCES public.vehicles(id),
    customer_id UUID REFERENCES public.customers(id),
    advisor_id UUID REFERENCES auth.users(id),
    mechanic_id UUID REFERENCES auth.users(id),
    mileage INTEGER,
    fault_description TEXT,
    diagnostic TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
    total_labor DECIMAL(12,2) DEFAULT 0,
    total_parts DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    billing_status TEXT DEFAULT 'NOT_BILLED', -- NOT_BILLED, PAID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: SERVICIOS DE ORDEN (Work Order Services)
CREATE TABLE public.work_order_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id),
    price DECIMAL(12,2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: REPUESTOS DE ORDEN (Work Order Parts)
CREATE TABLE public.work_order_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    price DECIMAL(12,2) NOT NULL,
    quantity INTEGER NOT NULL,
    is_consumed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: ITEMS DE VENTA POS
CREATE TABLE public.pos_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES public.pos_sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    service_id UUID REFERENCES public.services(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SEGURIDAD Y VISTAS

-- VISTA PARA MECÁNICOS (Sin Precios)
CREATE OR REPLACE VIEW public.v_mechanic_work_orders AS
SELECT 
    wo.id,
    wo.workshop_id,
    wo.vehicle_id,
    v.plate,
    v.brand,
    v.model,
    wo.status,
    wo.fault_description,
    wo.diagnostic,
    wo.created_at
FROM public.work_orders wo
JOIN public.vehicles v ON wo.vehicle_id = v.id;

-- POLÍTICAS BÁSICAS (RLS)
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access for service role" ON public.cash_sessions FOR ALL USING (true);
-- Repetir para el resto según necesidad

-- 4. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
