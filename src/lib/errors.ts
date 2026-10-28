/**
 * Extrae un mensaje legible de un error, incluidos los de Supabase/PostgREST
 * (que NO son instancias de Error sino objetos { message, code, details, hint }).
 */
export function errorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
    const msg = typeof e.message === 'string' ? e.message : ''
    const code = typeof e.code === 'string' ? e.code : ''
    const details = typeof e.details === 'string' ? e.details : ''
    if (code === '42P01') return 'Falta aplicar las migraciones en Supabase (tabla inexistente).'
    if (code === '23505') return `Registro duplicado. ${details || msg}`.trim()
    if (code === '23503') return `Referencia inválida. ${details || msg}`.trim()
    if (code === '42501') return 'Sin permisos para esta acción.'
    if (code === 'PGRST301') return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    return [msg, code && `(${code})`, details].filter(Boolean).join(' ') || fallback
  }
  return err ? String(err) : fallback
}
