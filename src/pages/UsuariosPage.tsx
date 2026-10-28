import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { usuariosService } from '../services/usuariosService'
import { useAuth } from '../context/AuthContext'
import { ResponsiveTable } from '../components/ResponsiveTable'
import { useDialogs } from '../components/Dialogs'
import { Select } from '../components/Select'
import { KeyIcon } from '../components/Icons'
import { errorMessage } from '../lib/errors'
import type { UsuarioPerfil } from '../types/database'

const ROLES = [
  { id: 1, nombre: 'Administrador' },
  { id: 2, nombre: 'Editor' },
  { id: 3, nombre: 'Lector' },
]

export default function UsuariosPage() {
  const { isAdmin, loading, session } = useAuth()
  const dialogs = useDialogs()
  const [users, setUsers] = useState<UsuarioPerfil[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [cedula, setCedula] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState(3)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try { setUsers(await usuariosService.list()) } catch (e) { setError(errorMessage(e, 'No se pudo cargar')) }
  }, [])
  useEffect(() => { if (isAdmin) void load() }, [isAdmin, load])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/" replace />

  async function changeRole(u: UsuarioPerfil, rol_id: number) {
    const nombre = ROLES.find((r) => r.id === rol_id)?.nombre ?? rol_id
    const confirmado = await dialogs.confirmar({ title: 'Cambiar rol', message: `¿Cambiar el rol de ${u.cedula ?? u.nombre} a ${nombre}?`, confirmLabel: 'Cambiar' })
    if (!confirmado) return
    setError(''); setOk('')
    try {
      await usuariosService.update(u.id, { rol_id })
      setOk(`Rol de ${u.cedula ?? u.nombre} actualizado`)
      await load()
    } catch (e) { setError(errorMessage(e, 'Error al actualizar')) }
  }

  async function resetPassword(u: UsuarioPerfil) {
    const pass = await dialogs.pedirTexto({
      title: 'Restablecer contraseña',
      message: `Nueva contraseña para ${u.cedula ?? u.nombre} (mínimo 6 caracteres).`,
      label: 'Nueva contraseña',
      type: 'password',
      confirmLabel: 'Restablecer',
    })
    if (pass === null) return
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError(''); setOk('')
    try {
      await usuariosService.resetPassword(u.id, pass)
      setOk(`Contraseña de ${u.cedula ?? u.nombre} restablecida`)
    } catch (e) { setError(errorMessage(e, 'No se pudo restablecer la contraseña')) }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(''); setOk('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setCreating(true)
    try {
      await usuariosService.create({ cedula, nombre, password, rol_id: rolId })
      setOk(`Usuario ${cedula} creado`)
      setCedula(''); setNombre(''); setPassword(''); setRolId(3)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear el usuario (¿cédula ya registrada?)'))
    } finally { setCreating(false) }
  }

  const me = session?.user.id

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Usuarios y roles</h2>

      <section className="card space-y-3">
        <h3 className="section-title">Crear usuario</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">El usuario inicia sesión con su <b>cédula</b> y la contraseña que definas aquí.</p>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-4">
          <label className="block space-y-1">
            <span className="field-label">Cédula</span>
            <input id="new-user-cedula" className="input" inputMode="numeric" value={cedula} required onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="block space-y-1">
            <span className="field-label">Nombre</span>
            <input id="new-user-nombre" className="input" value={nombre} required onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="field-label">Contraseña</span>
            <input id="new-user-password" className="input" type="password" autoComplete="new-password" value={password} required onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="field-label">Rol</span>
            <Select
              id="new-user-rol"
              value={String(rolId)}
              onChange={(v) => setRolId(Number(v))}
              options={ROLES.map((r) => ({ value: String(r.id), label: r.nombre }))}
            />
          </label>
          <div className="sm:col-span-4">
            <button id="new-user-submit" className="btn-primary" disabled={creating}>{creating ? 'Creando…' : 'Crear usuario'}</button>
          </div>
        </form>
      </section>

      {error && <p role="alert" className="alert-danger">{error}</p>}
      {ok && <p role="status" className="alert-success">{ok}</p>}

      <p className="text-sm text-slate-500 dark:text-slate-400">Cambia el rol de cada usuario. No puedes modificar tu propio rol.</p>
      <ResponsiveTable
        rows={users}
        rowKey={(u) => u.id}
        cardTitle={(u) => u.nombre || u.cedula || '—'}
        columns={[
          { header: 'Cédula', render: (u) => <span className="tabular-nums">{u.cedula ?? '—'}</span> },
          { header: 'Nombre', render: (u) => u.nombre || '—' },
          {
            header: 'Rol',
            render: (u) => (
              <Select
                ariaLabel={`Rol de ${u.cedula ?? u.nombre}`}
                value={String(u.rol_id)}
                disabled={u.id === me}
                onChange={(v) => changeRole(u, Number(v))}
                fullWidth={false}
                options={ROLES.map((r) => ({ value: String(r.id), label: r.nombre }))}
              />
            ),
          },
        ]}
        actions={(u) => (
          <button className="btn-ghost !py-1.5" onClick={() => resetPassword(u)} title="Restablecer contraseña"><KeyIcon /> Clave</button>
        )}
      />
    </div>
  )
}
