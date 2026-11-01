-- Status y Condición como listas cerradas.
update public.trabajadores
   set status = null
 where status is not null
   and status not in ('Empleado fijo', 'Empleado Contratado', 'Obrero Contratado', 'Obrero Fijo');

update public.trabajadores
   set condicion = null
 where condicion is not null
   and condicion not in (
     'NORMAL', 'MODALIDAD DE CAMBIO', 'JUBILADO (A)', 'TRASLADO', 'RENUNCIA',
     'FALLECIDO', 'TRASLADO / INACTIVO', 'CULMINACION DE CONTRATO', 'INCAPACITADO(A)',
     'INCAPACITADO(A) / INACTIVO', 'ACTIVO JUBILABLE ART.11', 'REPOSO MEDICO',
     'ARTICULO. 11 / INACTIVO', 'COMISION DE SERVICIO', 'DISPOSICION AL SISTEMA',
     'DESTITUCION DEL CARGO', 'PERMISO SINDICAL / INACTIVO', 'CLAUSULA. 63',
     'CLAUSULA. 63 / INACTIVO', 'PERMISO SINDICAL'
   );

alter table public.trabajadores drop constraint if exists trabajadores_status_chk;
alter table public.trabajadores add constraint trabajadores_status_chk
  check (status in ('Empleado fijo', 'Empleado Contratado', 'Obrero Contratado', 'Obrero Fijo'));

alter table public.trabajadores drop constraint if exists trabajadores_condicion_chk;
alter table public.trabajadores add constraint trabajadores_condicion_chk
  check (condicion in (
    'NORMAL', 'MODALIDAD DE CAMBIO', 'JUBILADO (A)', 'TRASLADO', 'RENUNCIA',
    'FALLECIDO', 'TRASLADO / INACTIVO', 'CULMINACION DE CONTRATO', 'INCAPACITADO(A)',
    'INCAPACITADO(A) / INACTIVO', 'ACTIVO JUBILABLE ART.11', 'REPOSO MEDICO',
    'ARTICULO. 11 / INACTIVO', 'COMISION DE SERVICIO', 'DISPOSICION AL SISTEMA',
    'DESTITUCION DEL CARGO', 'PERMISO SINDICAL / INACTIVO', 'CLAUSULA. 63',
    'CLAUSULA. 63 / INACTIVO', 'PERMISO SINDICAL'
  ));
