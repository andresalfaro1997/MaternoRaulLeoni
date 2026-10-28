-- Módulo de perfil: foto de perfil en usuarios_perfil + bucket de almacenamiento.

-- 1) Foto de perfil (URL pública en el bucket "avatares").
alter table public.usuarios_perfil add column if not exists foto_url text;

-- 2) Bucket público de avatares (máx 2 MB, solo imágenes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Políticas del bucket: lectura pública; cada usuario escribe solo en su carpeta (<uid>/...).
drop policy if exists "avatares_read" on storage.objects;
create policy "avatares_read" on storage.objects
  for select using (bucket_id = 'avatares');

drop policy if exists "avatares_insert" on storage.objects;
create policy "avatares_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_update" on storage.objects;
create policy "avatares_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_delete" on storage.objects;
create policy "avatares_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) El usuario solo puede actualizar SU foto (no rol ni otros campos).
--    Se hace con una función SECURITY DEFINER para no abrir un UPDATE libre.
create or replace function public.set_mi_foto(p_url text)
returns void language sql security definer set search_path = public as $$
  update public.usuarios_perfil set foto_url = p_url where id = auth.uid();
$$;

revoke all on function public.set_mi_foto(text) from public;
grant execute on function public.set_mi_foto(text) to authenticated;
