import { supabase } from './supabaseClient'
import type { GrupoTrabajo, GrupoTrabajoInput } from '../types/database'

export const gruposService = {
  async list(): Promise<GrupoTrabajo[]> {
    const { data, error } = await supabase.from('grupos_trabajo').select('*').order('nombre')
    if (error) throw error
    return data as GrupoTrabajo[]
  },
  async create(input: GrupoTrabajoInput): Promise<void> {
    const { error } = await supabase.from('grupos_trabajo').insert(input)
    if (error) throw error
  },
  async update(id: string, input: GrupoTrabajoInput): Promise<void> {
    const { error } = await supabase.from('grupos_trabajo').update(input).eq('id', id)
    if (error) throw error
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('grupos_trabajo').delete().eq('id', id)
    if (error) throw error
  },
}
