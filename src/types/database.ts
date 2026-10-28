export type RolNombre = 'admin' | 'editor' | 'lector'

export interface UsuarioPerfil {
  id: string
  rol_id: number
  nombre: string
  email: string | null
  cedula: string | null
  foto_url: string | null
}

export interface GrupoTrabajo {
  id: string
  nombre: string
  descripcion: string | null
  created_at: string
}
export type GrupoTrabajoInput = Pick<GrupoTrabajo, 'nombre' | 'descripcion'>

export interface Trabajador {
  id: string
  cedula: string
  nombres: string
  apellidos: string
  telefono: string | null
  grupo_trabajo_id: string
  estado: boolean
  created_at: string
  // Planilla de personal
  nro_personal: string | null
  cargo: string | null
  fecha_ingreso: string | null
  fecha_egreso: string | null
  fecha_ingreso_eez_mpps: string | null
  dependencia: string | null
  condicion: string | null
  status: string | null
  departamento: string | null
  observacion_incapacidad: string | null
  nivel_grado_cargo: string | null
  grado_instruccion: string | null
  activo_no_laborando: string | null
  proceso_jubilacion: string | null
  sexo: string | null
  tipo_trabajador: string | null
  codigo_rac: string | null
  ficha: string | null
  fecha_nacimiento: string | null
  horas_laborables: number | null
}
export type TrabajadorInput = Omit<Trabajador, 'id' | 'created_at'>

/** Trabajador con su grupo (join) */
export interface TrabajadorConGrupo extends Trabajador {
  grupos_trabajo: Pick<GrupoTrabajo, 'id' | 'nombre'> | null
}

/** Datos mínimos visibles para todo el personal (vista trabajadores_publico). */
export interface TrabajadorPublico {
  id: string
  nombres: string
  apellidos: string
  cedula: string
  grupo_trabajo_id: string
  grupo_nombre: string | null
  departamento: string | null
  estado: boolean
}

// ---------------- Horario / guardias ----------------

export type Turno = 'MANANA' | 'TARDE' | 'NOCHE'

export interface Guardia {
  id: string
  trabajador_id: string
  fecha: string
  turno: Turno
  departamento: string | null
  observacion: string | null
  created_at: string
}
export type GuardiaInput = Omit<Guardia, 'id' | 'created_at'>

export type SolicitudTipo = 'CAMBIO_GUARDIA' | 'PERMISO' | 'SUSPENSION_MEDICA' | 'AUSENCIA_CUBIERTA'
export type SolicitudEstado =
  | 'PENDIENTE_COMPANERO'
  | 'PENDIENTE_JEFE'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA'

export interface Solicitud {
  id: string
  tipo: SolicitudTipo
  estado: SolicitudEstado
  solicitante_id: string
  companero_id: string | null
  guardia_id: string | null
  guardia_companero_id: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  motivo: string | null
  comentario_jefe: string | null
  comprobante_path: string | null
  revisado_por: string | null
  revisado_en: string | null
  created_at: string
}

export interface SolicitudInput {
  tipo: SolicitudTipo
  estado: SolicitudEstado
  solicitante_id: string
  companero_id?: string | null
  guardia_id?: string | null
  guardia_companero_id?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  motivo?: string | null
  comprobante_path?: string | null
}
