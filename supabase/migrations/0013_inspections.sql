-- Create tables for Initial and Final Inspections linked to work_orders
create extension if not exists pgcrypto;

-- Initial Inspection
create table if not exists public.initial_inspections (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  inspector_name text not null,
  mechanic_id uuid references public.users(id) on delete set null,
  fecha_inspeccion timestamptz not null default now(),
  kilometraje_actual integer,
  combustible text check (combustible in ('lleno','medio','bajo')),
  nivel_aceite text check (nivel_aceite in ('correcto','bajo','sucio')),
  nivel_refrigerante text check (nivel_refrigerante in ('correcto','bajo','no_aplica')),
  bateria text check (bateria in ('buena','debil','sin_carga')),
  presion_neumaticos text check (presion_neumaticos in ('correcta','baja','alta')),
  luces_alta boolean default false,
  luces_baja boolean default false,
  direccionales boolean default false,
  stop boolean default false,
  frenos text check (frenos in ('firmes','esponjosos','requieren_ajuste')),
  suspension_delantera text check (suspension_delantera in ('sin_fugas','con_fugas','ruidosa')),
  cadena_y_pinon text check (cadena_y_pinon in ('buena','floja','desgastada')),
  embrague text check (embrague in ('normal','duro','patina')),
  observaciones_generales text,
  foto_recepcion_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_initial_inspections_work_order on public.initial_inspections(work_order_id);

alter table public.initial_inspections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'initial_inspections'
  ) then
    create policy authenticated_select_initial_inspections on public.initial_inspections
      for select to authenticated using (true);

    create policy authenticated_insert_initial_inspections on public.initial_inspections
      for insert to authenticated with check (true);

    create policy authenticated_update_initial_inspections on public.initial_inspections
      for update to authenticated using (true) with check (true);
  end if;
end $$;

-- Final Inspection
create table if not exists public.final_inspections (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  inspector_name text not null,
  mechanic_id uuid references public.users(id) on delete set null,
  fecha_revision timestamptz not null default now(),
  servicios_realizados text,
  prueba_arranque boolean default false,
  ruidos_inusuales boolean default false,
  luces_funcionando boolean default false,
  frenos_operativos boolean default false,
  direccion_sin_juego boolean default false,
  nivel_aceite_correcto boolean default false,
  sin_fugas_visibles boolean default false,
  neumaticos_correctos boolean default false,
  comentarios_finales text,
  foto_entrega_url text,
  estado_general text check (estado_general in ('apto','observado')) default 'observado',
  firma_mecanico text,
  created_at timestamptz not null default now()
);

create index if not exists idx_final_inspections_work_order on public.final_inspections(work_order_id);

alter table public.final_inspections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'final_inspections'
  ) then
    create policy authenticated_select_final_inspections on public.final_inspections
      for select to authenticated using (true);

    create policy authenticated_insert_final_inspections on public.final_inspections
      for insert to authenticated with check (true);

    create policy authenticated_update_final_inspections on public.final_inspections
      for update to authenticated using (true) with check (true);
  end if;
end $$;