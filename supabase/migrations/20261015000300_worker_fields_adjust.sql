-- 1) "Función" es el grupo de trabajo: se elimina el campo duplicado de texto libre.
alter table public.trabajadores drop column if exists funcion;

-- 2) Fecha de egreso.
alter table public.trabajadores add column if not exists fecha_egreso date;

-- 3) Dependencia: solo MPPS o EEZ.
update public.trabajadores set dependencia = null where dependencia not in ('MPPS', 'EEZ');
alter table public.trabajadores drop constraint if exists trabajadores_dependencia_chk;
alter table public.trabajadores
  add constraint trabajadores_dependencia_chk check (dependencia in ('MPPS', 'EEZ'));
