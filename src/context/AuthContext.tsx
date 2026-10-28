import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import { cedulaToEmail } from '../lib/cedulaAuth'
import type { RolNombre, UsuarioPerfil } from '../types/database'

interface AuthState {
  session: Session | null
  perfil: UsuarioPerfil | null
  rol: RolNombre | null
  loading: boolean
  canWrite: boolean
  isAdmin: boolean
  signIn: (cedula: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Recarga el perfil del usuario (p. ej. tras cambiar su foto). */
  refreshPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)
const ROL_BY_ID: Record<number, RolNombre> = { 1: 'admin', 2: 'editor', 3: 'lector' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setPerfil(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const refreshPerfil = useCallback(async () => {
    if (!userId) { setPerfil(null); return }
    const { data } = await supabase.from('usuarios_perfil').select('*').eq('id', userId).maybeSingle()
    setPerfil(data as UsuarioPerfil | null)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    void refreshPerfil().finally(() => setLoading(false))
  }, [userId, refreshPerfil])

  const rol = perfil ? ROL_BY_ID[perfil.rol_id] ?? 'lector' : null

  const value: AuthState = {
    session, perfil, rol, loading,
    canWrite: rol === 'admin' || rol === 'editor',
    isAdmin: rol === 'admin',
    signIn: async (cedula, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: cedulaToEmail(cedula), password })
      if (error) throw error
    },
    signOut: async () => { await supabase.auth.signOut() },
    refreshPerfil,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
