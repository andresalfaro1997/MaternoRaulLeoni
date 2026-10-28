import { supabase } from './supabaseClient'

const BUCKET = 'avatares'
const MAX_BYTES = 2 * 1024 * 1024

export const perfilService = {
  /** Cambia la contraseña del usuario autenticado. */
  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  /**
   * Sube la foto a "<uid>/avatar.<ext>", guarda la URL pública en el perfil
   * (vía RPC set_mi_foto) y devuelve la URL con cache-buster.
   */
  async uploadFoto(userId: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen')
    if (file.size > MAX_BYTES) throw new Error('La imagen no debe superar 2 MB')

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const path = `${userId}/avatar.${ext}`

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) throw upErr

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const url = `${data.publicUrl}?v=${Date.now()}`

    const { error: rpcErr } = await supabase.rpc('set_mi_foto', { p_url: url })
    if (rpcErr) throw rpcErr

    return url
  },
}
