-- Tipo de trabajador: agregar Obrero Fijo (OF) y Empleado Fijo (EF).
update public.trabajadores
   set tipo_trabajador = null
 where tipo_trabajador is not null
   and tipo_trabajador not in ('EC', 'OC', 'OF', 'EF');

alter table public.trabajadores drop constraint if exists trabajadores_tipo_trabajador_chk;
alter table public.trabajadores add constraint trabajadores_tipo_trabajador_chk
  check (tipo_trabajador in ('EC', 'OC', 'OF', 'EF'));
