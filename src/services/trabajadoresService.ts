import { supabase } from './supabaseClient'
import type { TrabajadorConGrupo, TrabajadorInput, TrabajadorPublico } from '../types/database'

const SELECT = '*, grupos_trabajo(id, nombre)'

export const trabajadoresService = {
  async list(): Promise<TrabajadorConGrupo[]> {
    const { data, error } = await supabase
      .from('trabajadores')
      .select(SELECT)
      .order('apellidos')
    if (error) throw error
    return data as unknown as TrabajadorConGrupo[]
  },

  /** Búsqueda exacta por cédula (usa el índice único trabajadores_cedula_uidx). */
  async findByCedula(cedula: string): Promise<TrabajadorConGrupo | null> {
    const { data, error } = await supabase
      .from('trabajadores')
      .select(SELECT)
      .eq('cedula', cedula.trim())
      .maybeSingle()
    if (error) throw error
    return data as unknown as TrabajadorConGrupo | null
  },

  async create(input: TrabajadorInput): Promise<void> {
    const { error } = await supabase.from('trabajadores').insert(input)
    if (error) throw error
  },
  async update(id: string, input: TrabajadorInput): Promise<void> {
    const { error } = await supabase.from('trabajadores').update(input).eq('id', id)
    if (error) throw error
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('trabajadores').delete().eq('id', id)
    if (error) throw error
  },
}

/**
 * Datos mínimos (nombre, cédula, grupo, departamento) visibles para todo el
 * personal autenticado. Se usa en el horario y en el selector de compañeros,
 * para no exponer fichas completas a los lectores.
 */
export const trabajadoresPublicoService = {
  async list(): Promise<TrabajadorPublico[]> {
    const { data, error } = await supabase
      .from('trabajadores_publico')
      .select('*')
      .order('apellidos')
    if (error) throw error
    return data as TrabajadorPublico[]
  },
}
