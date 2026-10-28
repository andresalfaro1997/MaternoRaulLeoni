-- Email visible en el perfil (para que el admin identifique usuarios)
alter table public.usuarios_perfil add column if not exists email text;

update public.usuarios_perfil p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios_perfil (id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', ''), new.email);
  return new;
end; $$;

-- El admin gestiona a OTROS usuarios (no puede quitarse su propio rol)
drop policy if exists "perfil_admin_update" on public.usuarios_perfil;
create policy "perfil_admin_update" on public.usuarios_perfil
  for update to authenticated
  using (public.current_role_name() = 'admin' and id <> auth.uid())
  with check (public.current_role_name() = 'admin' and id <> auth.uid());

drop policy if exists "perfil_admin_delete" on public.usuarios_perfil;
create policy "perfil_admin_delete" on public.usuarios_perfil
  for delete to authenticated
  using (public.current_role_name() = 'admin' and id <> auth.uid());
