import { useState, type FormEvent } from 'react'
import { gruposService } from '../services/gruposService'
import { useAuth } from '../context/AuthContext'
import { useDialogs } from './Dialogs'
import { XIcon } from './Icons'
import type { GrupoTrabajo } from '../types/database'

interface Props {
  grupos: GrupoTrabajo[]
  counts: Record<string, number>
  onChanged: () => Promise<void> | void
  onClose: () => void
}

/** Panel de gestión (CRUD) de grupos de trabajo, embebido en Personal. */
export function GruposManager({ grupos, counts, onChanged, onClose }: Props) {
  const { canWrite, isAdmin } = useAuth()
  const dialogs = useDialogs()
  const [editing, setEditing] = useState<GrupoTrabajo | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')

  function reset() { setEditing(null); setNombre(''); setDescripcion('') }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const input = { nombre, descripcion: descripcion || null }
      if (editing) await gruposService.update(editing.id, input)
      else await gruposService.create(input)
      reset(); await onChanged()
    } catch { setError('Error al guardar (¿nombre duplicado o sin permisos?)') }
  }

  async function onDelete(g: GrupoTrabajo) {
    const ok = await dialogs.confirmar({ title: 'Eliminar grupo', message: `¿Eliminar el grupo "${g.nombre}"?`, confirmLabel: 'Eliminar', danger: true })
    if (!ok) return
    setError('')
    try { await gruposService.remove(g.id); await onChanged() }
    catch { setError('No se puede eliminar: el grupo tiene trabajadores o no tiene permisos') }
  }

  return (
    <section className="card space-y-3" aria-label="Gestión de grupos de trabajo">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Grupos de trabajo</h3>
        <button className="btn-ghost !py-1.5" onClick={onClose}>Cerrar</button>
      </div>
      {error && <p role="alert" className="alert-danger">{error}</p>}

      {canWrite && (
        <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input aria-label="Nombre del grupo" className="input" placeholder="Nombre del grupo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <input aria-label="Descripción del grupo" className="input" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary flex-1">{editing ? 'Actualizar' : 'Agregar'}</button>
            {editing && <button type="button" className="btn-ghost !px-3" onClick={reset} aria-label="Cancelar edición"><XIcon /></button>}
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {grupos.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="font-semibold">{g.nombre} <span className="text-xs font-normal text-slate-500 tabular-nums dark:text-slate-400">· {counts[g.id] ?? 0} trabajadores</span></p>
              {g.descripcion && <p className="text-sm text-slate-500 dark:text-slate-400">{g.descripcion}</p>}
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <button className="btn-ghost !py-1.5" onClick={() => { setEditing(g); setNombre(g.nombre); setDescripcion(g.descripcion ?? '') }}>Editar</button>
                {isAdmin && <button className="btn-danger !py-1.5" onClick={() => onDelete(g)}>Eliminar</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
