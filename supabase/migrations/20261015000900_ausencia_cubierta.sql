-- Nueva modalidad: AUSENCIA_CUBIERTA.
-- El solicitante se ausenta de una guardia y un compañero la cubre (se le suma
-- esa guardia sin modificar sus otras guardias).

alter table public.solicitudes drop constraint if exists solicitudes_tipo_check;
alter table public.solicitudes add constraint solicitudes_tipo_check
  check (tipo in ('CAMBIO_GUARDIA', 'PERMISO', 'SUSPENSION_MEDICA', 'AUSENCIA_CUBIERTA'));

-- En una ausencia cubierta la fecha se toma de la guardia; no exige rango.
alter table public.solicitudes drop constraint if exists solicitudes_fechas_chk;
alter table public.solicitudes add constraint solicitudes_fechas_chk
  check (tipo in ('CAMBIO_GUARDIA', 'AUSENCIA_CUBIERTA') or fecha_inicio is not null);

-- Debe indicar compañero y guardia a cubrir.
alter table public.solicitudes drop constraint if exists solicitudes_ausencia_chk;
alter table public.solicitudes add constraint solicitudes_ausencia_chk
  check (tipo <> 'AUSENCIA_CUBIERTA' or (companero_id is not null and guardia_id is not null));
