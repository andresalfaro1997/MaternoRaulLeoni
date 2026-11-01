-- El turno 24H no puede solaparse con Mañana/Tarde/Noche el mismo día.
create or replace function public.guardias_check_24h()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conflicto boolean;
begin
  if new.turno = '24H' then
    select exists (
      select 1 from public.guardias
       where trabajador_id = new.trabajador_id
         and fecha = new.fecha
         and turno in ('MANANA', 'TARDE', 'NOCHE')
         and id <> new.id
    ) into v_conflicto;
    if v_conflicto then
      raise exception 'El turno 24H no puede solaparse con otro turno el mismo día';
    end if;
  else
    select exists (
      select 1 from public.guardias
       where trabajador_id = new.trabajador_id
         and fecha = new.fecha
         and turno = '24H'
         and id <> new.id
    ) into v_conflicto;
    if v_conflicto then
      raise exception 'El trabajador ya tiene 24H ese día';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists guardias_check_24h on public.guardias;
create trigger guardias_check_24h
  before insert or update on public.guardias
  for each row execute function public.guardias_check_24h();
