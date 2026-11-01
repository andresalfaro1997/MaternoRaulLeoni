-- Ajustes de datos del trabajador:
--   * Separar "Código y/o RAC" en dos campos: codigo y rac.
--   * Permitir la dependencia "CENTRAL".
alter table public.trabajadores add column if not exists codigo text;
alter table public.trabajadores add column if not exists rac text;

-- Conserva el valor histórico en "codigo" antes de eliminar la columna combinada.
update public.trabajadores
   set codigo = codigo_rac
 where codigo_rac is not null and codigo is null;

alter table public.trabajadores drop column if exists codigo_rac;

alter table public.trabajadores drop constraint if exists trabajadores_dependencia_chk;
alter table public.trabajadores add constraint trabajadores_dependencia_chk
  check (dependencia in ('MPPS', 'EEZ', 'CENTRAL'));
