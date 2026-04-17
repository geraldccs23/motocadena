-- Cierres de Caja, Turnos y Lecturas Z (Cash Flow)

CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    opened_by UUID REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    workshop_id UUID REFERENCES public.workshops(id),
    
    opening_balance_usd NUMERIC(15,2) DEFAULT 0,
    opening_balance_bs NUMERIC(15,2) DEFAULT 0,
    
    calculated_usd NUMERIC(15,2),
    calculated_bs NUMERIC(15,2),
    
    declared_usd NUMERIC(15,2),
    declared_bs NUMERIC(15,2),
    
    closing_notes TEXT,
    breakdown JSONB,
    
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evitar que hayan múltiples turnos abiertos a la vez para un mismo taller
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_open_session ON public.cash_sessions(workshop_id) WHERE status = 'OPEN';

-- Activar RLS temporalmente o definir políticas basicas
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users on cash_sessions"
ON public.cash_sessions FOR SELECT
TO authenticated
USING (true);

-- Backend Service Role will write here without RLS constraints.
