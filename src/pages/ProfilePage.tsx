import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { perfilService } from '../services/perfilService'
import { trabajadoresService } from '../services/trabajadoresService'
import { SECTIONS, calcServicio } from '../lib/workerFields'
import { StatusBadge } from '../components/WorkerProfile'
import { SolicitudesPersonal } from '../components/SolicitudesPersonal'
import { CameraIcon, UserIcon } from '../components/Icons'
import { initialsFromName } from '../lib/initials'
import type { TrabajadorConGrupo } from '../types/database'

const fmtDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—')

function DataItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}

export default function ProfilePage() {
  const { session, perfil, rol, refreshPerfil } = useAuth()
  const [worker, setWorker] = useState<TrabajadorConGrupo | null>(null)
  const [loadingWorker, setLoadingWorker] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [fotoError, setFotoError] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passError, setPassError] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!perfil?.cedula) { setLoadingWorker(false); return }
    let active = true
    setLoadingWorker(true)
    trabajadoresService.findByCedula(perfil.cedula)
      .then((w) => { if (active) setWorker(w) })
      .catch(() => { if (active) setWorker(null) })
      .finally(() => { if (active) setLoadingWorker(false) })
    return () => { active = false }
  }, [perfil?.cedula])

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !session) return
    setFotoError('')
    setUploading(true)
    try {
      await perfilService.uploadFoto(session.user.id, file)
      await refreshPerfil()
    } catch (err) {
      setFotoError(err instanceof Error ? err.message : 'No se pudo subir la imagen')
    } finally { setUploading(false) }
  }

  async function onChangePass(e: FormEvent) {
    e.preventDefault()
    setPassError(''); setPassMsg('')
    if (pass.length < 6) { setPassError('La contraseña debe tener al menos 6 caracteres'); return }
    if (pass !== pass2) { setPassError('Las contraseñas no coinciden'); return }
    setSavingPass(true)
    try {
      await perfilService.updatePassword(pass)
      setPass(''); setPass2('')
      setPassMsg('Contraseña actualizada correctamente')
    } catch (err) {
      setPassError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    } finally { setSavingPass(false) }
  }

  const initials = initialsFromName(perfil?.nombre, perfil?.cedula)
  const serv = worker ? calcServicio(worker.fecha_ingreso) : null

  const display = (key: string): string => {
    const v = (worker as unknown as Record<string, unknown> | null)?.[key]
    if (v === null || v === undefined || v === '') return '—'
    if (key.startsWith('fecha_')) return fmtDate(String(v))
    return String(v)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Mi perfil</h2>

      <article className="card space-y-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            {perfil?.foto_url ? (
              <img src={perfil.foto_url} alt="Foto de perfil" className="h-24 w-24 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-900/60" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-900 dark:bg-brand-900/40 dark:text-brand-200">{initials || <UserIcon className="h-10 w-10" />}</div>
            )}
            <button
              type="button"
              id="foto-upload"
              className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-white shadow-sm outline-none ring-2 ring-white transition hover:bg-brand-800 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:ring-slate-900 sm:h-10 sm:w-10"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto"
            >
              {uploading ? <span aria-hidden="true">…</span> : <CameraIcon />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickFile} />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold">{perfil?.nombre || 'Sin nombre'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">C.I. <span className="tabular-nums">{perfil?.cedula ?? '—'}</span> · <span className="capitalize">{rol}</span></p>
            {worker && <div className="mt-1"><StatusBadge active={worker.estado} /></div>}
          </div>
        </div>
        {fotoError && <p role="alert" className="alert-danger">{fotoError}</p>}
      </article>

      {loadingWorker ? (
        <p className="card text-center text-slate-500 dark:text-slate-400">Cargando datos…</p>
      ) : !worker ? (
        <p className="card text-center text-slate-500 dark:text-slate-400">No hay una ficha de trabajador vinculada a su cédula.</p>
      ) : (
        <>
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-2">
              <h3 className="section-title">{s.title}</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <DataItem
                    key={f.key}
                    label={f.label}
                    value={f.compute ? f.compute(worker) : display(f.key)}
                    wide={f.wide}
                  />
                ))}
              </dl>
            </section>
          ))}
          <section className="space-y-2">
            <h3 className="section-title">Calculados</h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <DataItem label="Años de servicio" value={serv ? `${serv.anios} años` : '—'} />
              <DataItem label="Meses (adicionales)" value={serv ? `${serv.meses} meses` : '—'} />
            </dl>
          </section>
          <SolicitudesPersonal self={worker} />
        </>
      )}

      <section className="card space-y-3">
        <h3 className="section-title">Cambiar contraseña</h3>
        <form onSubmit={onChangePass} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="field-label">Nueva contraseña</span>
            <input id="pass-new" className="input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} required />
          </label>
          <label className="block space-y-1">
            <span className="field-label">Repetir contraseña</span>
            <input id="pass-repeat" className="input" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} required />
          </label>
          {passError && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-300 sm:col-span-2">{passError}</p>}
          {passMsg && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300 sm:col-span-2">{passMsg}</p>}
          <div className="sm:col-span-2">
            <button id="pass-submit" className="btn-primary" disabled={savingPass}>{savingPass ? 'Guardando…' : 'Actualizar contraseña'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
