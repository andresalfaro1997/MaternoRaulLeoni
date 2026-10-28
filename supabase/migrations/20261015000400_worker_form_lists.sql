-- Ajustes del formulario de trabajador:
-- 1) Se elimina el segundo "STATUS" (status_2); ya no se usa en la app.
alter table public.trabajadores drop column if exists status_2;

-- 2) Tipo de trabajador pasa a lista cerrada EC / OC.
update public.trabajadores set tipo_trabajador = null where tipo_trabajador not in ('EC', 'OC');
alter table public.trabajadores drop constraint if exists trabajadores_tipo_trabajador_chk;
alter table public.trabajadores
  add constraint trabajadores_tipo_trabajador_chk check (tipo_trabajador in ('EC', 'OC'));

-- 3) Sexo: solo F o M.
update public.trabajadores set sexo = null where sexo not in ('F', 'M');
alter table public.trabajadores drop constraint if exists trabajadores_sexo_chk;
alter table public.trabajadores
  add constraint trabajadores_sexo_chk check (sexo in ('F', 'M'));
