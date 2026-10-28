-- Privacidad de fichas:
--   * Los lectores solo pueden leer su propia ficha completa.
--   * El resto del personal usa la vista "trabajadores_publico" (nombre, cédula,
--     grupo y departamento) para el horario y el selector de compañeros.
create or replace view public.trabajadores_publico as
select
  t.id,
  t.nombres,
  t.apellidos,
  t.cedula,
  t.grupo_trabajo_id,
  g.nombre as grupo_nombre,
  t.departamento,
  t.estado
from public.trabajadores t
left join public.grupos_trabajo g on g.id = t.grupo_trabajo_id;

grant select on public.trabajadores_publico to authenticated;

drop policy if exists "trab_select" on public.trabajadores;
create policy "trab_select" on public.trabajadores
  for select to authenticated
  using (
    public.current_role_name() in ('admin', 'editor')
    or id = public.current_trabajador_id()
  );
