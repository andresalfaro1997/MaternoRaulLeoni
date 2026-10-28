import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../lib/theme'
import { HospitalIcon, MoonIcon, SunIcon, UserIcon } from './Icons'
import { supabase } from '../services/supabaseClient'
import { solicitudesService } from '../services/solicitudesService'
import { initialsFromName } from '../lib/initials'
import type { Solicitud } from '../types/database'

const link = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900 sm:px-3 ${isActive ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-white/10'}`

export function Layout() {
  const { session, loading, perfil, rol, isAdmin, canWrite, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const [notif, setNotif] = useState(0)

  // Solicitudes pendientes: del jefe (por aprobar) + del usuario como compañero.
  useEffect(() => {
    if (!session) { setNotif(0); return }
    let active = true
    async function cargar() {
      try {
        const [sols, mine] = await Promise.all([
          solicitudesService.list(),
          supabase.rpc('current_trabajador_id'),
        ])
        const myId = (mine.data as string | null) ?? null
        const count = (sols as Solicitud[]).filter((s) =>
          (canWrite && s.estado === 'PENDIENTE_JEFE') ||
          (!!myId && s.companero_id === myId && s.estado === 'PENDIENTE_COMPANERO'),
        ).length
        if (active) setNotif(count)
      } catch { /* silencioso: no bloquear la navegación */ }
    }
    void cargar()
    const t = setInterval(cargar, 60000)
    return () => { active = false; clearInterval(t) }
  }, [session, location.pathname, canWrite])

  if (loading) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-900 to-brand-800 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <h1 className="order-1 flex items-center gap-2 text-lg font-bold text-white">
            <HospitalIcon className="h-5 w-5" /> RRHH Hospital
          </h1>
          <nav className="order-3 flex w-full items-center justify-start gap-1 overflow-x-auto pb-1 sm:order-2 sm:w-auto sm:justify-center sm:pb-0">
            <NavLink to="/" end className={link}>Personal</NavLink>
            <NavLink
              to={notif > 0 ? '/horario?tab=solicitudes' : '/horario'}
              aria-label={notif > 0 ? `Horario, ${notif} solicitudes pendientes` : 'Horario'}
              className={link}
            >
              <span>Horario</span>
              {notif > 0 && (
                <span key={notif} className="t-badge-pop ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-700 px-1.5 text-xs font-bold text-white">{notif}</span>
              )}
            </NavLink>
            {isAdmin && <NavLink to="/usuarios" className={link}>Usuarios</NavLink>}
            <NavLink to="/perfil" className={link}>Mi perfil</NavLink>
          </nav>
          <div className="order-2 flex min-w-0 items-center gap-2 text-xs text-brand-100 sm:order-3">
            <NavLink
              to="/perfil"
              className="flex min-w-0 items-center gap-2 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
              aria-label={perfil ? `Mi perfil: ${perfil.nombre || perfil.cedula}` : 'Mi perfil'}
            >
              {perfil?.foto_url ? (
                <img src={perfil.foto_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/40" />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                  {initialsFromName(perfil?.nombre, perfil?.cedula) || <UserIcon className="h-3 w-3" />}
                </span>
              )}
              <span className="hidden max-w-[36vw] truncate lg:inline">{perfil?.nombre || perfil?.cedula} · <span className="capitalize">{rol}</span></span>
            </NavLink>
            <button
              onClick={toggle}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/10 px-2 py-1 hover:bg-white/20 sm:min-h-10 sm:min-w-10"
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={signOut}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-3 sm:p-4"><Outlet /></main>
    </div>
  )
}
