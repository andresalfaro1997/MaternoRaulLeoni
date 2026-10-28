-- Campos de la planilla de personal en el perfil del trabajador.
-- Años de servicio, meses y edad NO se guardan: se calculan en la app
-- a partir de fecha_ingreso y fecha_nacimiento.
alter table public.trabajadores
  add column if not exists nro_personal              text,
  add column if not exists cargo                     text,  -- descripción de cargos
  add column if not exists funcion                   text,  -- función que ejerce
  add column if not exists fecha_ingreso             date,
  add column if not exists fecha_ingreso_eez_mpps    date,  -- doble contratación EEZ / MPPS
  add column if not exists dependencia               text,
  add column if not exists condicion                 text,
  add column if not exists status                    text,
  add column if not exists departamento              text,
  add column if not exists observacion_incapacidad   text,  -- observación y/o fecha de incapac. (cláus. 63, art. 11 u otro)
  add column if not exists nivel_grado_cargo         text,
  add column if not exists grado_instruccion         text,
  add column if not exists activo_no_laborando       text,
  add column if not exists proceso_jubilacion        text,
  add column if not exists status_2                  text,  -- segundo "STATUS" de la planilla
  add column if not exists sexo                      text,
  add column if not exists tipo_trabajador           text,
  add column if not exists codigo_rac                text,  -- código y/o RAC
  add column if not exists ficha                     text,
  add column if not exists fecha_nacimiento          date,
  add column if not exists horas_laborables          numeric(5,2);
