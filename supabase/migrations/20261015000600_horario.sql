-- =====================================================================
-- Horario / guardias del personal + solicitudes
--   * Cambio de guardia con un compañero (compañero acepta -> jefe aprueba)
--   * Permiso                 (jefe aprueba)
--   * Suspensión médica        (jefe aprueba)
-- =====================================================================

-- ---------- HELPER: identidad del usuario autenticado ----------
-- Cédula del usuario actual (los trabajadores se vinculan por cédula).
create or replace function public.current_user_cedula()
returns text language sql stable security definer set search_path = public as $$
  select cedula from public.usuarios_perfil where id = auth.uid();
$$;

-- Trabajador asociado al usuario autenticado (o null si no tiene ficha).
create or replace function public.current_trabajador_id()
returns uuid language sql stable security definer set search_path = public as $$
  select t.id
  from public.trabajadores t
  join public.usuarios_perfil p on p.cedula = t.cedula
  where p.id = auth.uid()
  limit 1;
$$;

-- ---------- TABLA: guardias ----------
create table if not exists public.guardias (
  id            uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  fecha         date not null,
  turno         text not null check (turno in ('MANANA', 'TARDE', 'NOCHE')),
  departamento  text,
  observacion   text,
  created_at    timestamptz not null default now()
);
create index if not exists guardias_fecha_idx on public.guardias (fecha);
create index if not exists guardias_trabajador_idx on public.guardias (trabajador_id);
-- Una sola guardia por trabajador / fecha / turno.
create unique index if not exists guardias_unq on public.guardias (trabajador_id, fecha, turno);

-- ---------- TABLA: solicitudes ----------
create table if not exists public.solicitudes (
  id                   uuid primary key default gen_random_uuid(),
  tipo                 text not null check (tipo in ('CAMBIO_GUARDIA', 'PERMISO', 'SUSPENSION_MEDICA')),
  estado               text not null default 'PENDIENTE_JEFE'
                         check (estado in ('PENDIENTE_COMPANERO', 'PENDIENTE_JEFE', 'APROBADA', 'RECHAZADA', 'CANCELADA')),
  solicitante_id       uuid not null references public.trabajadores(id) on delete cascade,
  companero_id         uuid references public.trabajadores(id) on delete set null,
  guardia_id           uuid references public.guardias(id) on delete set null,
  guardia_companero_id uuid references public.guardias(id) on delete set null,
  fecha_inicio         date,
  fecha_fin            date,
  motivo               text,
  comentario_jefe      text,
  revisado_por         uuid references public.usuarios_perfil(id) on delete set null,
  revisado_en          timestamptz,
  created_at           timestamptz not null default now(),
  -- Un cambio de guardia siempre indica al compañero; permiso/suspensión indican rango de fechas.
  constraint solicitudes_cambio_chk check (tipo <> 'CAMBIO_GUARDIA' or companero_id is not null),
  constraint solicitudes_fechas_chk check (tipo = 'CAMBIO_GUARDIA' or fecha_inicio is not null)
);
create index if not exists solicitudes_estado_idx on public.solicitudes (estado);
create index if not exists solicitudes_solicitante_idx on public.solicitudes (solicitante_id);
create index if not exists solicitudes_companero_idx on public.solicitudes (companero_id);

-- ---------- RLS ----------
alter table public.guardias    enable row level security;
alter table public.solicitudes enable row level security;

-- guardias: todos leen; admin/editor gestionan
drop policy if exists "guardias_select" on public.guardias;
create policy "guardias_select" on public.guardias
  for select to authenticated using (true);
drop policy if exists "guardias_insert" on public.guardias;
create policy "guardias_insert" on public.guardias
  for insert to authenticated with check (public.current_role_name() in ('admin', 'editor'));
drop policy if exists "guardias_update" on public.guardias;
create policy "guardias_update" on public.guardias
  for update to authenticated
  using (public.current_role_name() in ('admin', 'editor'))
  with check (public.current_role_name() in ('admin', 'editor'));
drop policy if exists "guardias_delete" on public.guardias;
create policy "guardias_delete" on public.guardias
  for delete to authenticated using (public.current_role_name() in ('admin', 'editor'));

-- solicitudes: todos leen; el solicitante crea;
-- solicitante / compañero / jefe pueden actualizar; el jefe o el solicitante borran.
drop policy if exists "solicitudes_select" on public.solicitudes;
create policy "solicitudes_select" on public.solicitudes
  for select to authenticated using (true);
drop policy if exists "solicitudes_insert" on public.solicitudes;
create policy "solicitudes_insert" on public.solicitudes
  for insert to authenticated
  with check (solicitante_id = public.current_trabajador_id());
drop policy if exists "solicitudes_update" on public.solicitudes;
create policy "solicitudes_update" on public.solicitudes
  for update to authenticated
  using (
    public.current_role_name() in ('admin', 'editor')
    or solicitante_id = public.current_trabajador_id()
    or companero_id = public.current_trabajador_id()
  )
  with check (
    public.current_role_name() in ('admin', 'editor')
    or solicitante_id = public.current_trabajador_id()
    or companero_id = public.current_trabajador_id()
  );
drop policy if exists "solicitudes_delete" on public.solicitudes;
create policy "solicitudes_delete" on public.solicitudes
  for delete to authenticated
  using (public.current_role_name() = 'admin' or solicitante_id = public.current_trabajador_id());

-- ---------- TRIGGER: solo un jefe puede APROBAR ----------
-- Evita que el solicitante o el compañero aprueben por su cuenta.
create or replace function public.solicitudes_guard_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'APROBADA' and public.current_role_name() not in ('admin', 'editor') then
    raise exception 'Solo un jefe puede aprobar solicitudes';
  end if;
  return new;
end; $$;

drop trigger if exists solicitudes_guard_estado on public.solicitudes;
create trigger solicitudes_guard_estado
  before insert or update on public.solicitudes
  for each row execute function public.solicitudes_guard_estado();

