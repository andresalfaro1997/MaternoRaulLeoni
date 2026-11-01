-- Turno de 24 horas.
alter table public.guardias drop constraint if exists guardias_turno_check;
alter table public.guardias add constraint guardias_turno_check
  check (turno in ('MANANA', 'TARDE', 'NOCHE', '24H'));
