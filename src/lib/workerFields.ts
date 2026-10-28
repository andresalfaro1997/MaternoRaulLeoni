import type { TrabajadorInput } from '../types/database'

export type FieldKind = 'text' | 'date' | 'number' | 'textarea' | 'select' | 'computed'

export interface FieldDef {
  key: keyof TrabajadorInput | 'edad'
  label: string
  kind: FieldKind
  options?: string[]
  wide?: boolean
  /** Valor calculado (solo lectura); no se envía a la base de datos. */
  compute?: (w: TrabajadorInput) => string
}

export interface FieldSection {
  title: string
  fields: FieldDef[]
}

export const DEPARTAMENTOS = [
  'ADMINISTRACION',
  'ADULTO',
  'ANESTESIOLOGIA',
  'BANCO DE SANGRE',
  'BIENES Y MATERIA',
  'CIRUGIA',
  'CONSULTA EXTERNA',
  'CONTABILIDAD',
  'DEPOSITO',
  'DIRECCION',
  'ELECTROMEDICINA',
  'ENFERMERIA',
  'EPIDEMIOLOGIA',
  'FARMACIA',
  'HISTORIAS MEDICAS',
  'LABORATORIO',
  'LAVANDERIA',
  'MANTENIMIENTO',
  'MEDICINA INTERNA',
  'MORGUE',
  'NUTRICION Y DIETETICA',
  'OBSTETRICIA',
  'ODONTOLOGIA',
  'OFICINA DE ASESORIA LEGAL',
  'PEDIATRIA',
  'RAYOS X',
  'RECURSOS HUMANOS',
  'SALUD INDIGENA',
  'SANEAMIENTO AMBIENTAL',
  'SERVICIOS GENERALES (PCP)',
  'SINDICATO',
  'SUMINISTRO',
  'TRABAJO SOCIAL',
]

export const FUNCIONES = [
  'ABOGADA / ASESORA LEGAL',
  'ADMINISTRADOR PROFESIONAL I',
  'ASISTENTE ADMINISTRATIVO',
  'ASISTENTE DE ELECTROMEDICINA',
  'ASISTENTE EN INFORMACIÓN Y ESTADÍSTICA DE SALUD',
  'AUXILIAR DE ENFERMERÍA',
  'AUXILIAR DE FARMACIA',
  'AUXILIAR DE LABORATORIO',
  'AUXILIAR DE NUTRICIÓN Y DIETÉTICA',
  'AYUDANTE DE SERVICIOS DE COCINA',
  'AYUDANTE DE SERVICIOS GENERALES',
  'BIOANALISTA (PROFESIONAL I / II)',
  'CAMARERA(O) / ASEADOR',
  'CAMILLERO',
  'CHOFER / CONDUCTOR DE AMBULANCIA',
  'COCINERA(O)',
  'CONTADOR',
  'COORDINADOR(A)',
  'COSTURERA',
  'DEFENSOR DE SALUD INDÍGENA / OPERADOR ADMINISTRATIVO',
  'ELECTROMECÁNICO',
  'ENFERMERA(O) I',
  'ENFERMERA(O) II',
  'ENFERMERA(O) ESPECIALISTA',
  'ENFERMERA(O) PROFESIONAL I',
  'ENFERMERA(O) TÉCNICO I',
  'FARMACÉUTICO(A)',
  'FISIOTERAPEUTA',
  'JEFE DE DEPARTAMENTO / SERVICIO (RRHH, Historias Médicas, Enfermería, etc.)',
  'LAVANDERA(O) / OPERADOR DE LAVANDERÍA',
  'MÉDICO ADJUNTO',
  'MÉDICO CIRUJANO',
  'MÉDICO ESPECIALISTA I',
  'MÉDICO ESPECIALISTA II',
  'MÉDICO GENERAL',
  'MÉDICO I',
  'MÉDICO INTEGRAL COMUNITARIO (MIC)',
  'MÉDICO INTERNO',
  'MÉDICO RESIDENTE ASISTENCIAL',
  'MÉDICO RESIDENTE DE POSTGRADO',
  'NUTRICIONISTA - DIETISTA',
  'ODONTÓLOGO(A)',
  'OPERADOR DE MANTENIMIENTO',
  'PLOMERO',
  'PSICÓLOGO PROFESIONAL I',
  'RECEPTOR INFORMADOR',
  'SECRETARIA / OFICINISTA',
  'SOPORTE TÉCNICO',
  'SUPERVISOR DE SERVICIOS ESPECIALIZADOS',
  'SUPERVISOR DE SERVICIOS INTERNOS',
  'TÉCNICO DE REGISTRO Y ESTADÍSTICA DE SALUD',
  'TÉCNICO EN HEMOTERAPIA (BANCO DE SANGRE)',
  'TÉCNICO RADIÓLOGO (RAYOS X)',
  'TRABAJADOR SOCIAL',
  'VIGILANTE',
]

export const SECTIONS: FieldSection[] = [
  {
    title: 'Datos personales',
    fields: [
      { key: 'cedula', label: 'Cédula', kind: 'text' },
      { key: 'apellidos', label: 'Apellidos', kind: 'text' },
      { key: 'nombres', label: 'Nombres', kind: 'text' },
      { key: 'sexo', label: 'Sexo', kind: 'select', options: ['F', 'M'] },
      { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', kind: 'date' },
      {
        key: 'edad',
        label: 'Edad',
        kind: 'computed',
        compute: (w) => {
          const e = calcEdad(w.fecha_nacimiento)
          return e === null ? '—' : `${e} años`
        },
      },
      { key: 'telefono', label: 'Número de teléfono', kind: 'text' },
      { key: 'grado_instruccion', label: 'Grado de instrucción', kind: 'text' },
    ],
  },
  {
    title: 'Datos laborales',
    fields: [
      { key: 'nro_personal', label: 'N° de personal', kind: 'text' },
      { key: 'ficha', label: 'Ficha', kind: 'text' },
      { key: 'codigo_rac', label: 'Código y/o RAC', kind: 'text' },
      { key: 'cargo', label: 'Función que ejerce', kind: 'select', options: FUNCIONES, wide: true },
      { key: 'nivel_grado_cargo', label: 'Nivel y/o grado del cargo', kind: 'text' },
      { key: 'tipo_trabajador', label: 'Tipo de trabajador', kind: 'select', options: ['EC', 'OC'] },
      { key: 'dependencia', label: 'Dependencia', kind: 'select', options: ['MPPS', 'EEZ'] },
      { key: 'departamento', label: 'Departamento', kind: 'select', options: DEPARTAMENTOS },
      { key: 'condicion', label: 'Condición', kind: 'text' },
      { key: 'horas_laborables', label: 'Horas laborables', kind: 'number' },
      { key: 'fecha_ingreso', label: 'Fecha de ingreso', kind: 'date' },
      { key: 'fecha_egreso', label: 'Fecha de egreso', kind: 'date' },
      { key: 'fecha_ingreso_eez_mpps', label: 'Fecha ingreso EEZ / MPPS (doble contratación)', kind: 'date' },
    ],
  },
  {
    title: 'Situación',
    fields: [
      { key: 'status', label: 'Status', kind: 'text' },
      { key: 'activo_no_laborando', label: 'Activo no laborando', kind: 'text' },
      { key: 'proceso_jubilacion', label: 'Proceso de jubilación', kind: 'text' },
      { key: 'observacion_incapacidad', label: 'Observación y/o fecha de incapacidad (Cláus. 63, Art. 11 u otro)', kind: 'textarea', wide: true },
    ],
  },
]

export const EMPTY_WORKER: TrabajadorInput = {
  cedula: '', nombres: '', apellidos: '', telefono: null, grupo_trabajo_id: '', estado: true,
  nro_personal: null, cargo: null, fecha_ingreso: null, fecha_egreso: null, fecha_ingreso_eez_mpps: null,
  dependencia: null, condicion: null, status: null, departamento: null, observacion_incapacidad: null,
  nivel_grado_cargo: null, grado_instruccion: null, activo_no_laborando: null, proceso_jubilacion: null,
  sexo: null, tipo_trabajador: null, codigo_rac: null, ficha: null,
  fecha_nacimiento: null, horas_laborables: null,
}

/** Convierte strings vacíos en null antes de enviar a la base de datos. */
export function normalizeWorker(w: TrabajadorInput): TrabajadorInput {
  const out: Record<string, unknown> = { ...w }
  for (const k of Object.keys(out)) {
    if (out[k] === '') out[k] = null
  }
  return out as unknown as TrabajadorInput
}

/** Extrae solo los campos editables de un trabajador (sin id/created_at/join). */
export function toInput(w: TrabajadorInput): TrabajadorInput {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(EMPTY_WORKER)) out[k] = (w as unknown as Record<string, unknown>)[k] ?? null
  return out as unknown as TrabajadorInput
}

const parse = (iso: string | null) => (iso ? new Date(iso + 'T00:00:00') : null)

/** Edad en años cumplidos. */
export function calcEdad(nacimiento: string | null, hoy = new Date()): number | null {
  const n = parse(nacimiento)
  if (!n) return null
  let edad = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--
  return edad
}

/** Antigüedad en años y meses completos desde la fecha de ingreso. */
export function calcServicio(ingreso: string | null, hoy = new Date()): { anios: number; meses: number } | null {
  const i = parse(ingreso)
  if (!i) return null
  let meses = (hoy.getFullYear() - i.getFullYear()) * 12 + (hoy.getMonth() - i.getMonth())
  if (hoy.getDate() < i.getDate()) meses--
  if (meses < 0) return { anios: 0, meses: 0 }
  return { anios: Math.floor(meses / 12), meses: meses % 12 }
}
