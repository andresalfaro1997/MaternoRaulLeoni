import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../lib/theme'
import { HospitalIcon, MoonIcon, SunIcon } from '../components/Icons'

export default function LoginPage() {
  const { signIn, session } = useAuth()
  const { theme, toggle } = useTheme()
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!cedula.replace(/\D/g, '')) { setError('Ingrese su cédula'); return }
    try { await signIn(cedula, password) } catch { setError('Cédula o contraseña inválidas') }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4 dark:from-slate-950 dark:to-brand-900">
      <button
        onClick={toggle}
        className="absolute right-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm text-white outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white sm:min-h-10 sm:min-w-10"
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        aria-pressed={theme === 'dark'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 !p-6">
        <h1 className="flex items-center justify-center gap-2 text-center text-2xl font-bold text-brand-800 dark:text-brand-200">
          <HospitalIcon className="h-6 w-6" /> RRHH Hospital
        </h1>
        <label className="block space-y-1">
          <span className="field-label">Cédula de identidad</span>
          <input
            id="login-cedula"
            className="input"
            inputMode="numeric"
            placeholder="Ej. 10000001"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            required
            autoFocus
          />
        </label>
        <label className="block space-y-1">
          <span className="field-label">Contraseña</span>
          <input
            id="login-password"
            className="input"
            type="password"
            placeholder="Su contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </label>
        {error && <p id="login-error" role="alert" className="alert-danger">{error}</p>}
        <button id="login-submit" className="btn-primary w-full">Ingresar</button>
      </form>
    </div>
  )
}
