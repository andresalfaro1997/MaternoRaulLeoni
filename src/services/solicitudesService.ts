import { supabase } from './supabaseClient'
import type { Solicitud, SolicitudInput } from '../types/database'

const BUCKET = 'comprobantes'
const MAX_BYTES = 5 * 1024 * 1024

export const solicitudesService = {
  async list(): Promise<Solicitud[]> {
    const { data, error } = await supabase
      .from('solicitudes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as Solicitud[]
  },

  async create(input: SolicitudInput): Promise<void> {
    const { error } = await supabase.from('solicitudes').insert(input)
    if (error) throw error
  },

  /** El compañero acepta (pasa a pendiente del jefe) o rechaza el cambio. */
  async responderCompanero(id: string, aceptar: boolean): Promise<void> {
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: aceptar ? 'PENDIENTE_JEFE' : 'RECHAZADA' })
      .eq('id', id)
    if (error) throw error
  },

  /** El jefe aprueba o rechaza (permiso, suspensión o cambio ya aceptado). */
  async resolver(id: string, aprobar: boolean, revisadoPor: string, comentario: string): Promise<void> {
    const { error } = await supabase
      .from('solicitudes')
      .update({
        estado: aprobar ? 'APROBADA' : 'RECHAZADA',
        comentario_jefe: comentario || null,
        revisado_por: revisadoPor,
        revisado_en: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
  },

  async cancelar(id: string): Promise<void> {
    const { error } = await supabase.from('solicitudes').update({ estado: 'CANCELADA' }).eq('id', id)
    if (error) throw error
  },

  /** Sube un comprobante a "<uid>/<timestamp>.<ext>" y devuelve el path guardado. */
  async subirComprobante(userId: string, file: File): Promise<string> {
    if (file.size > MAX_BYTES) throw new Error('El archivo no debe superar 5 MB')
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: '3600' })
    if (error) throw error
    return path
  },

  /** URL firmada temporal (5 min) para ver un comprobante. */
  async urlComprobante(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
    if (error) throw error
    return data.signedUrl
  },
}
