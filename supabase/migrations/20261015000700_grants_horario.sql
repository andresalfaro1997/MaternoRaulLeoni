-- Privilegios de tabla/funciones para el módulo de horario.
-- La nueva versión del CLI ya NO expone las tablas nuevas automáticamente,
-- por eso hay que otorgar los permisos explícitamente (RLS sigue filtrando filas).
grant select, insert, update, delete on public.guardias    to authenticated;
grant select, insert, update, delete on public.solicitudes to authenticated;

grant execute on function public.current_trabajador_id() to authenticated;
grant execute on function public.current_user_cedula()   to authenticated;
