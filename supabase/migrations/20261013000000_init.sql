-- =====================================================================
-- RRHH Hospital - Esquema inicial Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================================

-- ---------- TABLAS ----------
create table if not exists public.roles (
  id     smallint primary key generated always as identity,
  nombre text not null unique check (nombre in ('admin','editor','lector'))
);

insert into public.roles (nombre) values ('admin'), ('editor'), ('lector')
on conflict (nombre) do nothing;

create table if not exists public.usuarios_perfil (
  id      uuid primary key references auth.users(id) on delete cascade,
  rol_id  smallint not null references public.roles(id) default 3, -- 3 = lector por defecto
  nombre  text not null default ''
);

create table if not exists public.grupos_trabajo (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  descripcion text,
  created_at  timestamptz not null default now()
);

create table if not exists public.trabajadores (
  id                uuid primary key default gen_random_uuid(),
  cedula            text not null,
  nombres           text not null,
  apellidos         text not null,
  telefono          text,
  grupo_trabajo_id  uuid not null references public.grupos_trabajo(id) on update cascade on delete restrict,
  estado            boolean not null default true,  -- true = activo
  created_at        timestamptz not null default now()
);

-- Índice único sobre cédula (búsqueda indexada)
create unique index if not exists trabajadores_cedula_uidx on public.trabajadores (cedula);
create index if not exists trabajadores_grupo_idx on public.trabajadores (grupo_trabajo_id);

-- ---------- TRIGGER: crear perfil al registrarse ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios_perfil (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', ''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- HELPER: rol del usuario actual ----------
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select r.nombre
  from public.usuarios_perfil p
  join public.roles r on r.id = p.rol_id
  where p.id = auth.uid();
$$;

-- ---------- RLS ----------
alter table public.roles           enable row level security;
alter table public.usuarios_perfil enable row level security;
alter table public.grupos_trabajo  enable row level security;
alter table public.trabajadores    enable row level security;

-- roles: lectura para cualquier usuario autenticado
create policy "roles_select" on public.roles
  for select to authenticated using (true);

-- usuarios_perfil: cada quien ve su perfil; admin ve y gestiona todos
create policy "perfil_select_own_or_admin" on public.usuarios_perfil
  for select to authenticated
  using (id = auth.uid() or public.current_role_name() = 'admin');
create policy "perfil_admin_update" on public.usuarios_perfil
  for update to authenticated
  using (public.current_role_name() = 'admin')
  with check (public.current_role_name() = 'admin');
create policy "perfil_admin_delete" on public.usuarios_perfil
  for delete to authenticated using (public.current_role_name() = 'admin');

-- grupos_trabajo: todos leen; admin/editor crean y editan; solo admin borra
create policy "grupos_select" on public.grupos_trabajo
  for select to authenticated using (true);
create policy "grupos_insert" on public.grupos_trabajo
  for insert to authenticated
  with check (public.current_role_name() in ('admin','editor'));
create policy "grupos_update" on public.grupos_trabajo
  for update to authenticated
  using (public.current_role_name() in ('admin','editor'))
  with check (public.current_role_name() in ('admin','editor'));
create policy "grupos_delete" on public.grupos_trabajo
  for delete to authenticated using (public.current_role_name() = 'admin');

-- trabajadores: igual esquema
create policy "trab_select" on public.trabajadores
  for select to authenticated using (true);
create policy "trab_insert" on public.trabajadores
  for insert to authenticated
  with check (public.current_role_name() in ('admin','editor'));
create policy "trab_update" on public.trabajadores
  for update to authenticated
  using (public.current_role_name() in ('admin','editor'))
  with check (public.current_role_name() in ('admin','editor'));
create policy "trab_delete" on public.trabajadores
  for delete to authenticated using (public.current_role_name() = 'admin');

-- ---------- DATOS DE EJEMPLO ----------
insert into public.grupos_trabajo (nombre, descripcion) values
  ('Médicos','Personal médico'),
  ('Enfermeros','Personal de enfermería'),
  ('Obreros','Personal obrero y mantenimiento'),
  ('Administrativos','Personal administrativo')
on conflict (nombre) do nothing;

-- Para convertir a un usuario en admin:
-- update public.usuarios_perfil set rol_id = 1 where id = '<UUID_DEL_USUARIO>';
