import { supabase, createEphemeralClient } from './supabaseClient'
import { cedulaToEmail } from '../lib/cedulaAuth'
import type { UsuarioPerfil } from '../types/database'

export interface NuevoUsuario {
  cedula: string
  nombre: string
  password: string
  rol_id: number
}

export const usuariosService = {
  async list(): Promise<UsuarioPerfil[]> {
    const { data, error } = await supabase.from('usuarios_perfil').select('*').order('email')
    if (error) throw error
    return data as UsuarioPerfil[]
  },

  /**
   * Crea un usuario nuevo (cédula + contraseña) y le asigna el rol.
   * Usa un cliente aislado para el `signUp` para no cerrar la sesión del admin;
   * el rol se fija después con el cliente principal (RLS: solo admin).
   */
  async create(input: NuevoUsuario): Promise<void> {
    const cedula = input.cedula.replace(/\D/g, '')
    if (!cedula) throw new Error('Cédula inválida')

    const tmp = createEphemeralClient()
    const { data, error } = await tmp.auth.signUp({
      email: cedulaToEmail(cedula),
      password: input.password,
      options: { data: { nombre: input.nombre.trim(), cedula } },
    })
    if (error) throw error
    const id = data.user?.id
    if (!id) throw new Error('No se pudo crear el usuario')

    await this.update(id, { rol_id: input.rol_id, nombre: input.nombre.trim() })

    // Limpia el posible evento de sesión del cliente temporal (no toca la sesión principal).
    await tmp.auth.signOut().catch(() => undefined)
  },

  async update(id: string, changes: Partial<Pick<UsuarioPerfil, 'rol_id' | 'nombre'>>): Promise<void> {
    const { data, error } = await supabase.from('usuarios_perfil').update(changes).eq('id', id).select('id')
    if (error) throw error
    // RLS filtra silenciosamente: 0 filas = sin permiso
    if (!data || data.length === 0) throw new Error('Sin permisos para modificar este usuario')
  },

  /** (Admin) Restablece la contraseña de otro usuario. */
  async resetPassword(id: string, password: string): Promise<void> {
    const { error } = await supabase.rpc('admin_reset_password', { p_user: id, p_password: password })
    if (error) throw error
  },
}
