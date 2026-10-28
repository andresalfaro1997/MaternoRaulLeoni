import { useCallback, useEffect, useMemo, useState } from 'react'
import { trabajadoresService } from '../services/trabajadoresService'
import { gruposService } from '../services/gruposService'
import { useAuth } from '../context/AuthContext'
import { ResponsiveTable } from '../components/ResponsiveTable'
import { StatusBadge, WorkerProfile } from '../components/WorkerProfile'
import { WorkerForm } from '../components/WorkerForm'
import { GruposManager } from '../components/GruposManager'
import { useDialogs } from '../components/Dialogs'
import { Select } from '../components/Select'
import { ChevronLeftIcon, DownloadIcon, PlusIcon, UsersIcon } from '../components/Icons'
import { EMPTY_WORKER, DEPARTAMENTOS } from '../lib/workerFields'
import { downloadCsv } from '../lib/csv'
import type { GrupoTrabajo, TrabajadorConGrupo, TrabajadorInput } from '../types/database'

type View = 'list' | 'profile' | 'new'

export default function PersonalPage() {
  const { canWrite, isAdmin } = useAuth()
  const dialogs = useDialogs()
  const [rows, setRows] = useState<TrabajadorConGrupo[]>([])
  const [grupos, setGrupos] = useState<GrupoTrabajo[]>([])
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<TrabajadorConGrupo | null>(null)
  const [error, setError] = useState('')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [deptoFilter, setDeptoFilter] = useState<string>('all')
  const [q, setQ] = useState('')
  const [showGroups, setShowGroups] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of rows) c[t.grupo_trabajo_id] = (c[t.grupo_trabajo_id] ?? 0) + 1
    return c
  }, [rows])
  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((t) => {
      if (groupFilter !== 'all' && t.grupo_trabajo_id !== groupFilter) return false
      if (deptoFilter !== 'all' && t.departamento !== deptoFilter) return false
      if (needle) {
        const heno = `${t.nombres} ${t.apellidos} ${t.cedula}`.toLowerCase()
        if (!heno.includes(needle)) return false
      }
      return true
    })
  }, [rows, groupFilter, deptoFilter, q])

  function exportar() {
    downloadCsv(
      'personal.csv',
      ['cedula', 'nombres', 'apellidos', 'sexo', 'departamento', 'cargo', 'grupo', 'estado', 'telefono'],
      filteredRows.map((t) => [
        t.cedula, t.nombres, t.apellidos, t.sexo, t.departamento, t.cargo,
        grupos.find((g) => g.id === t.grupo_trabajo_id)?.nombre ?? '', t.estado ? 'Activo' : 'Inactivo', t.telefono,
      ]),
    )
  }

  const load = useCallback(async () => {
    try {
      const [t, g] = await Promise.all([trabajadoresService.list(), gruposService.list()])
      setRows(t); setGrupos(g)
    } catch { setError('No se pudo cargar el personal') }
  }, [])
  useEffect(() => { void load() }, [load])
  // Si el grupo filtrado fue eliminado, volver a "Todos"
  useEffect(() => {
    if (groupFilter !== 'all' && grupos.length > 0 && !grupos.some((g) => g.id === groupFilter)) setGroupFilter('all')
  }, [grupos, groupFilter])

  /** Abre el perfil de un trabajador por cédula (consulta indexada). */
  async function openByCedula(value: string): Promise<void> {
    setError('')
    try {
      const w = await trabajadoresService.findByCedula(value)
      if (w) { setSelected(w); setView('profile') }
    } catch { setError('Error al consultar. Intente de nuevo.') }
  }

  function backToList() { setView('list'); setSelected(null) }

  async function onCreate(value: TrabajadorInput) {
    setError('')
    try {
      await trabajadoresService.create(value)
      await load()
      await openByCedula(value.cedula)
    } catch { setError('Error al guardar (¿cédula duplicada o sin permisos?)') }
  }

  async function onSaved(newCedula: string) {
    await load()
    await openByCedula(newCedula)
  }

  async function onDelete(t: TrabajadorConGrupo) {
    const ok = await dialogs.confirmar({ title: 'Eliminar trabajador', message: `¿Eliminar a ${t.nombres} ${t.apellidos}?`, confirmLabel: 'Eliminar', danger: true })
    if (!ok) return
    try { await trabajadoresService.remove(t.id); await load() } catch { setError('No tiene permisos') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Personal</h2>
        {view === 'list' && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {canWrite && (
              <button id="worker-add" className="btn-primary col-span-2 sm:col-span-1" onClick={() => setView('new')}><PlusIcon /> Agregar trabajador</button>
            )}
            <button id="worker-export" className="btn-ghost" onClick={exportar}><DownloadIcon /> CSV</button>
            <button id="groups-toggle" className="btn-ghost" onClick={() => setShowGroups((s) => !s)}><UsersIcon /> Grupos</button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="alert-danger">{error}</p>}

      {view !== 'list' && (
        <button id="back-to-list" className="btn-ghost" onClick={backToList}><ChevronLeftIcon /> Volver al listado</button>
      )}

      {view === 'new' && canWrite && (
        <div className="card t-reveal">
          <h3 className="mb-3 text-lg font-bold">Nuevo trabajador</h3>
          <WorkerForm initial={EMPTY_WORKER} grupos={grupos} submitLabel="Agregar trabajador" onSubmit={onCreate} onCancel={backToList} />
        </div>
      )}

      {view === 'profile' && selected && (
        <WorkerProfile key={selected.id} worker={selected} grupos={grupos} onSaved={onSaved} />
      )}

      {view === 'list' && showGroups && (
        <div className="t-reveal">
          <GruposManager
            grupos={grupos}
            counts={counts}
            onChanged={load}
            onClose={() => setShowGroups(false)}
          />
        </div>
      )}

      {view === 'list' && (
        <div id="group-filter" className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por grupo">
          {[{ id: 'all', nombre: 'Todos', total: rows.length }, ...grupos.map((g) => ({ id: g.id, nombre: g.nombre, total: counts[g.id] ?? 0 }))].map((g) => (
            <button
              key={g.id}
              aria-pressed={groupFilter === g.id}
              onClick={() => setGroupFilter(g.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${groupFilter === g.id ? 'bg-brand-700 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'}`}
            >
              {g.nombre} <span className={groupFilter === g.id ? 'text-white tabular-nums' : 'text-slate-500 tabular-nums dark:text-slate-400'}>{g.total}</span>
            </button>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Filtrar por nombre, apellido o cédula"
            className="input"
            placeholder="Filtrar por nombre, apellido o cédula…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            ariaLabel="Filtrar por departamento"
            className="sm:w-64"
            value={deptoFilter}
            onChange={setDeptoFilter}
            options={[{ value: 'all', label: 'Todos los departamentos' }, ...DEPARTAMENTOS.map((d) => ({ value: d, label: d }))]}
          />
        </div>
      )}

      {view === 'list' && (
        <ResponsiveTable
          rows={filteredRows}
          rowKey={(t) => t.id}
          cardTitle={(t) => `${t.apellidos}, ${t.nombres}`}
          empty="No hay trabajadores que coincidan con el filtro"
          columns={[
            { header: 'Cédula', render: (t) => <span className="tabular-nums">{t.cedula}</span> },
            { header: 'Nombre', render: (t) => `${t.apellidos}, ${t.nombres}` },
            { header: 'Departamento', render: (t) => t.departamento ?? '—' },
            { header: 'Cargo', render: (t) => t.cargo ?? '—' },
            { header: 'Grupo', render: (t) => t.grupos_trabajo?.nombre ?? '—' },
            { header: 'Estado', render: (t) => <StatusBadge active={t.estado} /> },
          ]}
          actions={(t) => (
            <>
              <button className="btn-ghost !py-1.5" onClick={() => { setSelected(t); setView('profile'); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }) }}>Ver perfil</button>
              {isAdmin && <button className="btn-danger !py-1.5" onClick={() => onDelete(t)}>Eliminar</button>}
            </>
          )}
        />
      )}
    </div>
  )
}
