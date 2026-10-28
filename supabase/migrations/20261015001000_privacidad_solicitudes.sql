-- Privacidad de solicitudes: un lector solo ve las suyas y aquellas donde es el
-- compañero que cubre/acepta. Admin y editor (jefes) ven todas.
drop policy if exists "solicitudes_select" on public.solicitudes;
create policy "solicitudes_select" on public.solicitudes
  for select to authenticated
  using (
    public.current_role_name() in ('admin', 'editor')
    or solicitante_id = public.current_trabajador_id()
    or companero_id = public.current_trabajador_id()
  );
