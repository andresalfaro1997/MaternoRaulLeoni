import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!rawUrl || !anonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env')
}

/**
 * Si Supabase está en localhost, usa el mismo host desde el que se abrió la app.
 * Así, desde otro equipo de la LAN, el navegador apunta al Supabase del servidor
 * (p. ej. http://192.168.100.35:54321) en vez de a su propio localhost.
 */
function resolveUrl(raw: string): string {
  try {
    const u = new URL(raw)
    if ((u.hostname === '127.0.0.1' || u.hostname === 'localhost') && typeof window !== 'undefined') {
      u.hostname = window.location.hostname
    }
    return u.toString().replace(/\/$/, '')
  } catch { return raw }
}

export const supabase = createClient(resolveUrl(rawUrl as string), anonKey as string, {
  auth: { persistSession: true, autoRefreshToken: true },
})

/**
 * Cliente aislado que NO guarda sesión. Se usa para `signUp` (crear usuarios)
 * sin pisar la sesión del administrador que está en la sesión principal.
 */
export function createEphemeralClient() {
  return createClient(resolveUrl(rawUrl as string), anonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
