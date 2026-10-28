import { useState } from 'react'
import type { GrupoTrabajo, TrabajadorConGrupo, TrabajadorInput } from '../types/database'
import { useAuth } from '../context/AuthContext'
import { trabajadoresService } from '../services/trabajadoresService'
import { SECTIONS, calcServicio, toInput } from '../lib/workerFields'
import { WorkerForm } from './WorkerForm'
import { PencilIcon } from './Icons'

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

const fmtDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—')

function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}

interface Props {
  worker: TrabajadorConGrupo
  grupos: GrupoTrabajo[]
  onSaved: (cedula: string) => Promise<void> | void
}

export function WorkerProfile({ worker, grupos, onSaved }: Props) {
  const { canWrite } = useAuth()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  async function save(value: TrabajadorInput) {
    setError('')
    try {
      await trabajadoresService.update(worker.id, value)
      setEditing(false)
      await onSaved(value.cedula)
    } catch {
      setError('No se pudo guardar (¿cédula duplicada o sin permisos?)')
    }
  }

  const serv = calcServicio(worker.fecha_ingreso)

  const display = (key: string): string => {
    const v = (worker as unknown as Record<string, unknown>)[key]
    if (v === null || v === undefined || v === '') return '—'
    if (key.startsWith('fecha_')) return fmtDate(String(v))
    return String(v)
  }

  return (
    <article className="card space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-xl font-bold text-brand-900 dark:text-brand-200">
          {worker.nombres[0]}{worker.apellidos[0]}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-bold leading-snug">{worker.apellidos}, {worker.nombres}</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <StatusBadge active={worker.estado} />
            <span className="whitespace-nowrap tabular-nums">C.I. {worker.cedula}</span>
            <span className="break-words">{worker.grupos_trabajo?.nombre ?? 'Sin grupo'}</span>
          </div>
        </div>
        {canWrite && !editing && (
          <button id="worker-edit" className="btn-ghost" onClick={() => setEditing(true)}><PencilIcon /> Editar</button>
        )}
      </header>

      {error && <p role="alert" className="alert-danger">{error}</p>}

      {editing ? (
        <div className="t-reveal">
          <WorkerForm
            initial={toInput(worker)}
            grupos={grupos}
            submitLabel="Guardar cambios"
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-2">
              <h3 className="section-title">{s.title}</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <Item key={f.key} label={f.label} value={f.compute ? f.compute(worker) : display(f.key)} wide={f.wide} />
                ))}
              </dl>
            </section>
          ))}
          <section className="space-y-2">
            <h3 className="section-title">Calculados</h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Item label="Años de servicio" value={serv ? `${serv.anios} años` : '—'} />
              <Item label="Meses (adicionales)" value={serv ? `${serv.meses} meses` : '—'} />
            </dl>
          </section>
        </>
      )}
    </article>
  )
}
