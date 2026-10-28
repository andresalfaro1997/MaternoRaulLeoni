-- Privilegios de tabla para la API (RLS sigue controlando el acceso por fila)
grant usage on schema public to authenticated;

grant select                         on public.roles           to authenticated;
grant select, update, delete         on public.usuarios_perfil to authenticated;
grant select, insert, update, delete on public.grupos_trabajo  to authenticated;
grant select, insert, update, delete on public.trabajadores    to authenticated;

grant execute on function public.current_role_name() to authenticated;
