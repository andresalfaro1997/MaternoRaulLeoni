-- Login por cédula: Supabase Auth exige email, así que cada usuario usa un
-- email interno "<cedula>@rrhh.local". La cédula se guarda en el perfil.
alter table public.usuarios_perfil add column if not exists cedula text;
create unique index if not exists usuarios_perfil_cedula_uidx on public.usuarios_perfil (cedula);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios_perfil (id, nombre, email, cedula)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'cedula', split_part(new.email, '@', 1))
  );
  return new;
end; $$;
