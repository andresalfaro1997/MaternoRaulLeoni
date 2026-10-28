import type { Guardia, Solicitud, SolicitudEstado, SolicitudTipo, Turno } from '../types/database'

export interface TurnoDef {
  id: Turno
  label: string
  horaInicio: string
  horaFin: string
}

/** Turnos predefinidos de guardia. */
export const TURNOS: TurnoDef[] = [
  { id: 'MANANA', label: 'Mañana', horaInicio: '07:00', horaFin: '13:00' },
  { id: 'TARDE', label: 'Tarde', horaInicio: '13:00', horaFin: '19:00' },
  { id: 'NOCHE', label: 'Noche', horaInicio: '19:00', horaFin: '07:00' },
]

export const turnoLabel = (t: Turno): string => TURNOS.find((x) => x.id === t)?.label ?? t
export const turnoHorario = (t: Turno): string => {
  const d = TURNOS.find((x) => x.id === t)
  return d ? `${d.horaInicio}–${d.horaFin}` : ''
}

export const SOLICITUD_TIPOS: { id: SolicitudTipo; label: string }[] = [
  { id: 'CAMBIO_GUARDIA', label: 'Cambio de guardia' },
  { id: 'AUSENCIA_CUBIERTA', label: 'Ausencia cubierta' },
  { id: 'PERMISO', label: 'Permiso' },
  { id: 'SUSPENSION_MEDICA', label: 'Suspensión médica' },
]

export const tipoLabel = (t: SolicitudTipo): string =>
  SOLICITUD_TIPOS.find((x) => x.id === t)?.label ?? t

export const ESTADO_META: Record<SolicitudEstado, { label: string; className: string }> = {
  PENDIENTE_COMPANERO: { label: 'Pendiente del compañero', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  PENDIENTE_JEFE: { label: 'Pendiente de aprobación', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  APROBADA: { label: 'Aprobada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  CANCELADA: { label: 'Cancelada', className: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
}

/** Fecha local en formato YYYY-MM-DD (sin desfase por zona horaria). */
export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** "2026-10-15" -> "15/10/2026". */
export const fmtFecha = (iso: string | null): string =>
  iso ? iso.split('-').reverse().join('/') : '—'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const fmtDia = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return `${DIAS[d.getDay()]} ${d.getDate()}`
}
/** Resumen legible de una solicitud para listados. */
export function describeSolicitud(
  s: Solicitud,
  names: Record<string, string>,
  guardias: Record<string, Guardia>,
): string {
  const nom = (id: string | null) => (id ? names[id] ?? '—' : '—')
  const g = (id: string | null) => {
    const gu = id ? guardias[id] : undefined
    return gu ? `${fmtFecha(gu.fecha)} (${turnoLabel(gu.turno)})` : '—'
  }
  if (s.tipo === 'CAMBIO_GUARDIA') {
    return `Cede su guardia del ${g(s.guardia_id)} a ${nom(s.companero_id)} y toma la del ${g(s.guardia_companero_id)}.`
  }
  if (s.tipo === 'AUSENCIA_CUBIERTA') {
    return `Se ausenta de su guardia del ${g(s.guardia_id)}; ${nom(s.companero_id)} la cubre (se le suma a sus guardias, sin afectar las demás).`
  }
  const rango = s.fecha_fin && s.fecha_fin !== s.fecha_inicio
    ? `del ${fmtFecha(s.fecha_inicio)} al ${fmtFecha(s.fecha_fin)}`
    : `el ${fmtFecha(s.fecha_inicio)}`
  return `Solicita ${s.tipo === 'PERMISO' ? 'permiso' : 'suspensión médica'} ${rango}.`
}

export interface Ausencia {
  solicitud_id: string
  trabajador_id: string
  inicio: string
  fin: string
  tipo: SolicitudTipo
}

/** Permisos/suspensiones APROBADAS => trabajador no disponible en el rango. */
export function ausenciasAprobadas(solicitudes: Solicitud[]): Ausencia[] {
  return solicitudes
    .filter((s) => s.estado === 'APROBADA' && s.tipo !== 'CAMBIO_GUARDIA' && s.fecha_inicio)
    .map((s) => ({
      solicitud_id: s.id,
      trabajador_id: s.solicitante_id,
      inicio: s.fecha_inicio as string,
      fin: s.fecha_fin || (s.fecha_inicio as string),
      tipo: s.tipo,
    }))
}

/** Ausencia que cubre una fecha, para un trabajador (o undefined). */
export function ausenciaEn(ausencias: Ausencia[], trabajadorId: string, fecha: string): Ausencia | undefined {
  return ausencias.find((a) => a.trabajador_id === trabajadorId && fecha >= a.inicio && fecha <= a.fin)
}

