import { supabase } from './supabaseClient'
import type { Guardia, GuardiaInput } from '../types/database'

export const guardiasService = {
  async list(): Promise<Guardia[]> {
    const { data, error } = await supabase.from('guardias').select('*').order('fecha').order('turno')
    if (error) throw error
    return data as Guardia[]
  },

  async create(input: GuardiaInput): Promise<void> {
    const { error } = await supabase.from('guardias').insert(input)
    if (error) throw error
  },

  async update(id: string, input: Partial<GuardiaInput>): Promise<void> {
    const { error } = await supabase.from('guardias').update(input).eq('id', id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('guardias').delete().eq('id', id)
    if (error) throw error
  },

  /** Intercambia el titular de dos guardias (usado al aprobar un cambio). */
  async swap(a: Guardia, b: Guardia): Promise<void> {
    const { error: e1 } = await supabase.from('guardias').update({ trabajador_id: b.trabajador_id }).eq('id', a.id)
    if (e1) throw e1
    const { error: e2 } = await supabase.from('guardias').update({ trabajador_id: a.trabajador_id }).eq('id', b.id)
    if (e2) throw e2
  },
}
