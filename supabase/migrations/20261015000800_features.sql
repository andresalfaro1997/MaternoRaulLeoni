-- Funcionalidades corto plazo:
--  * Comprobante adjunto en solicitudes (+ bucket privado "comprobantes")
--  * RPC para que un admin restablezca la contraseña de un usuario

-- ---------- Comprobante ----------
alter table public.solicitudes add column if not exists comprobante_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- El dueño sube/lee su comprobante; los jefes (admin/editor) también leen.
drop policy if exists "comprobantes_read" on storage.objects;
create policy "comprobantes_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.current_role_name() in ('admin', 'editor'))
  );

drop policy if exists "comprobantes_insert" on storage.objects;
create policy "comprobantes_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "comprobantes_delete" on storage.objects;
create policy "comprobantes_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Reset de contraseña por admin ----------
create or replace function public.admin_reset_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if public.current_role_name() <> 'admin' then
    raise exception 'Solo un administrador puede restablecer contraseñas';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf')),
         updated_at = now()
   where id = p_user;
end; $$;

revoke all on function public.admin_reset_password(uuid, text) from public;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;
