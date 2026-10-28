import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { guardiasService } from '../services/guardiasService'
import { solicitudesService } from '../services/solicitudesService'
import { trabajadoresPublicoService } from '../services/trabajadoresService'
import { gruposService } from '../services/gruposService'
import { SolicitudItem } from '../components/SolicitudItem'
import { useDialogs } from '../components/Dialogs'
import { Select } from '../components/Select'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PrinterIcon, WarningIcon, XIcon } from '../components/Icons'
import { DEPARTAMENTOS } from '../lib/workerFields'
import { errorMessage } from '../lib/errors'
import {
  TURNOS, ausenciaEn, ausenciasAprobadas, fmtDia, fmtFecha, isoDate, tipoLabel, turnoLabel, turnoHorario,
} from '../lib/horario'
import type { Guardia, GrupoTrabajo, Solicitud, TrabajadorPublico, Turno } from '../types/database'

type Tab = 'guardias' | 'solicitudes' | 'reportes'
const TURNO_ORDER: Turno[] = ['MANANA', 'TARDE', 'NOCHE']
const nombreCompleto = (t: { apellidos: string; nombres: string }) => `${t.apellidos}, ${t.nombres}`

export default function HorarioPage() {
  const { perfil, canWrite } = useAuth()
  const dialogs = useDialogs()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => (params.get('tab') === 'solicitudes' ? 'solicitudes' : 'guardias'))
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [trabajadores, setTrabajadores] = useState<TrabajadorPublico[]>([])
  const [grupos, setGrupos] = useState<GrupoTrabajo[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [month, setMonth] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState<string>(() => isoDate(new Date()))
  const [grupoFilter, setGrupoFilter] = useState('all')
  const [deptoFilter, setDeptoFilter] = useState('all')
  const [turnoFilter, setTurnoFilter] = useState<'all' | Turno>('all')

  // alta manual
  const [nTrabajador, setNTrabajador] = useState('')
  const [nFecha, setNFecha] = useState(isoDate(new Date()))
  const [nTurno, setNTurno] = useState<Turno>('MANANA')
  const [nDepto, setNDepto] = useState('')
  const [nObs, setNObs] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [modalState, setModalState] = useState<'closed' | 'open' | 'closing'>('closed')
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLDivElement>(null)
  const tabsPillRef = useRef<HTMLSpanElement>(null)
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ guardias: null, solicitudes: null, reportes: null })
  const pillInit = useRef(false)

  const abrirModal = useCallback(() => {
    setShowForm(true)
    setModalState('closed')
    // Dos frames para que el estado base pinte antes de animar a is-open.
    requestAnimationFrame(() => requestAnimationFrame(() => setModalState('open')))
  }, [])
  const cerrarModal = useCallback(() => {
    setModalState('closing')
    window.setTimeout(() => { setShowForm(false); setModalState('closed') }, 150)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Personal y grupos se cargan aparte: si fallan las tablas de horario,
      // el selector de trabajadores debe seguir funcionando.
      const [t, gr] = await Promise.allSettled([trabajadoresPublicoService.list(), gruposService.list()])
      if (t.status === 'fulfilled') setTrabajadores(t.value)
      if (gr.status === 'fulfilled') setGrupos(gr.value)

      const [g, s] = await Promise.allSettled([guardiasService.list(), solicitudesService.list()])
      if (g.status === 'fulfilled') setGuardias(g.value)
      if (s.status === 'fulfilled') setSolicitudes(s.value)

      const fallos: string[] = []
      if (t.status === 'rejected') fallos.push('personal')
      if (gr.status === 'rejected') fallos.push('grupos')
      if (g.status === 'rejected') fallos.push('guardias')
      if (s.status === 'rejected') fallos.push('solicitudes')
      setError(fallos.length ? `No se pudo cargar: ${fallos.join(', ')}` : '')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  // Modal "Agregar guardia": foco inicial, trampa de Tab, Escape, scroll lock y restauración de foco.
  useEffect(() => {
    if (!showForm) return
    const previo = document.activeElement as HTMLElement | null
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = () => {
      const panel = dialogRef.current
      if (!panel) return [] as HTMLElement[]
      return Array.from(
        panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'))
    }
    focusables()[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { cerrarModal(); return }
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowPrevio
      previo?.focus()
    }
  }, [showForm, cerrarModal])

  const names = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of trabajadores) m[t.id] = nombreCompleto(t)
    return m
  }, [trabajadores])
  const trabMap = useMemo(() => {
    const m: Record<string, TrabajadorPublico> = {}
    for (const t of trabajadores) m[t.id] = t
    return m
  }, [trabajadores])
  const guardiasMap = useMemo(() => {
    const m: Record<string, Guardia> = {}
    for (const g of guardias) m[g.id] = g
    return m
  }, [guardias])

  const hoy = isoDate(new Date())
  const rawMonthLabel = month.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)
  const cal = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth()
    const offset = (new Date(y, m, 1).getDay() + 6) % 7
    const total = new Date(y, m + 1, 0).getDate()
    const cells: (string | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= total; d++) cells.push(isoDate(new Date(y, m, d)))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [month])

  // Departamento de una guardia: el propio de la guardia o, si no tiene, el del trabajador.
  const deptoDe = useCallback(
    (g: Guardia) => g.departamento || trabMap[g.trabajador_id]?.departamento || '',
    [trabMap],
  )

  const departamentos = useMemo(() => {
    const set = new Set<string>(DEPARTAMENTOS)
    for (const g of guardias) {
      if (g.departamento) set.add(g.departamento)
      const d = trabMap[g.trabajador_id]?.departamento
      if (d) set.add(d)
    }
    return Array.from(set).sort()
  }, [guardias, trabMap])

  // Empleados del formulario: si se elige un departamento, solo los de ese departamento.
  const empleados = useMemo(
    () => (nDepto ? trabajadores.filter((t) => t.departamento === nDepto) : trabajadores),
    [trabajadores, nDepto],
  )

  const filtradas = useMemo(
    () => guardias.filter((g) => {
      if (turnoFilter !== 'all' && g.turno !== turnoFilter) return false
      if (grupoFilter !== 'all' && trabMap[g.trabajador_id]?.grupo_trabajo_id !== grupoFilter) return false
      if (deptoFilter !== 'all' && deptoDe(g) !== deptoFilter) return false
      return true
    }),
    [guardias, turnoFilter, grupoFilter, deptoFilter, trabMap, deptoDe],
  )

  const porDia = useMemo(() => {
    const m: Record<string, Guardia[]> = {}
    for (const g of filtradas) (m[g.fecha] ??= []).push(g)
    return m
  }, [filtradas])

  const delDia = useMemo(
    () => (porDia[selectedDay] ?? []).slice().sort((a, b) => TURNO_ORDER.indexOf(a.turno) - TURNO_ORDER.indexOf(b.turno)),
    [porDia, selectedDay],
  )

  const ausencias = useMemo(() => ausenciasAprobadas(solicitudes), [solicitudes])

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const delMes = useMemo(() => filtradas.filter((g) => g.fecha.startsWith(monthKey)), [filtradas, monthKey])
  const resumen = useMemo(() => {
    const porTrabajador: Record<string, number> = {}
    const porDepto: Record<string, number> = {}
    const porTurno: Record<string, number> = {}
    for (const g of delMes) {
      porTrabajador[g.trabajador_id] = (porTrabajador[g.trabajador_id] ?? 0) + 1
      const d = deptoDe(g) || 'Sin departamento'
      porDepto[d] = (porDepto[d] ?? 0) + 1
      porTurno[g.turno] = (porTurno[g.turno] ?? 0) + 1
    }
    return { porTrabajador, porDepto, porTurno }
  }, [delMes, deptoDe])

  const porResolver = useMemo(
    () => solicitudes.filter((s) => s.estado === 'PENDIENTE_JEFE'),
    [solicitudes],
  )

  // Tabs deslizantes: la píldora sigue a la pestaña activa.
  const movePill = useCallback((animate: boolean) => {
    const pill = tabsPillRef.current
    const active = tabRefs.current[tab]
    if (!pill || !active) return
    if (animate) {
      pill.style.transform = `translateX(${active.offsetLeft}px)`
      pill.style.width = `${active.offsetWidth}px`
    } else {
      const prev = pill.style.transition
      pill.style.transition = 'none'
      pill.style.transform = `translateX(${active.offsetLeft}px)`
      pill.style.width = `${active.offsetWidth}px`
      void pill.offsetWidth
      pill.style.transition = prev
    }
  }, [tab])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      movePill(pillInit.current)
      pillInit.current = true
    })
    return () => cancelAnimationFrame(id)
  }, [movePill, porResolver.length])

  useEffect(() => {
    const onResize = () => movePill(false)
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(() => movePill(false)).catch(() => undefined)
    return () => window.removeEventListener('resize', onResize)
  }, [movePill])

  function onTabsKeyDown(e: ReactKeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const order: Tab[] = ['guardias', 'solicitudes', 'reportes']
    const i = order.indexOf(tab)
    const next = order[(i + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length]
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  async function crearGuardia(e: FormEvent) {
    e.preventDefault()
    setError(''); setOk('')
    const aus = ausenciaEn(ausencias, nTrabajador, nFecha)
    if (aus) {
      const ok = await dialogs.confirmar({
        title: 'Trabajador con ausencia',
        message: `El trabajador tiene una ${tipoLabel(aus.tipo).toLowerCase()} aprobada que cubre ese día. ¿Guardar la guardia de todos modos?`,
        confirmLabel: 'Guardar',
      })
      if (!ok) return
    }
    try {
      await guardiasService.create({
        trabajador_id: nTrabajador, fecha: nFecha, turno: nTurno,
        departamento: nDepto || null, observacion: nObs || null,
      })
      setOk('Guardia agregada'); setNObs(''); cerrarModal(); await load()
    } catch (err) { setError(errorMessage(err, 'No se pudo agregar la guardia')) }
  }

  async function eliminar(g: Guardia) {
    const ok = await dialogs.confirmar({ title: 'Eliminar guardia', message: '¿Eliminar esta guardia?', confirmLabel: 'Eliminar', danger: true })
    if (!ok) return
    setError(''); setOk('')
    try { await guardiasService.remove(g.id); await load() } catch (err) { setError(errorMessage(err, 'No se pudo eliminar')) }
  }

  async function resolver(s: Solicitud, aprobar: boolean) {
    setError(''); setOk('')
    try {
      if (!perfil) return
      if (aprobar && (s.tipo === 'PERMISO' || s.tipo === 'SUSPENSION_MEDICA') && s.fecha_inicio) {
        const fin = s.fecha_fin || s.fecha_inicio
        const choca = guardias.filter((g) => g.trabajador_id === s.solicitante_id && g.fecha >= s.fecha_inicio! && g.fecha <= fin)
        if (choca.length) {
          const ok = await dialogs.confirmar({
            title: 'Ausencia con guardias',
            message: `El trabajador tiene ${choca.length} guardia(s) en ese rango. La ausencia no las elimina automáticamente. ¿Aprobar de todos modos?`,
            confirmLabel: 'Aprobar',
          })
          if (!ok) return
        }
      }

      // Ausencia cubierta: validar antes de aprobar que se pueda traspasar la guardia.
      let guardiaACubrir: Guardia | undefined
      if (aprobar && s.tipo === 'AUSENCIA_CUBIERTA') {
        if (!s.guardia_id || !s.companero_id) throw new Error('Solicitud incompleta')
        guardiaACubrir = guardiasMap[s.guardia_id]
        if (!guardiaACubrir || guardiaACubrir.trabajador_id !== s.solicitante_id) {
          throw new Error('La guardia ya no pertenece al solicitante')
        }
        const choque = guardias.find((g) => g.trabajador_id === s.companero_id && g.fecha === guardiaACubrir!.fecha && g.turno === guardiaACubrir!.turno)
        if (choque) throw new Error('El compañero ya tiene una guardia en ese día y turno; no se puede cubrir')
      }

      await solicitudesService.resolver(s.id, aprobar, perfil.id, comentarios[s.id] ?? '')

      if (aprobar && s.tipo === 'CAMBIO_GUARDIA' && s.guardia_id && s.guardia_companero_id) {
        const a = guardiasMap[s.guardia_id]
        const b = guardiasMap[s.guardia_companero_id]
        if (a && b) await guardiasService.swap(a, b)
      }
      if (aprobar && s.tipo === 'AUSENCIA_CUBIERTA' && guardiaACubrir && s.companero_id) {
        // Se reasigna la guardia al compañero; sus demás guardias no se tocan.
        await guardiasService.update(guardiaACubrir.id, { trabajador_id: s.companero_id })
      }
      setOk(aprobar ? 'Solicitud aprobada' : 'Solicitud rechazada')
      await load()
    } catch (err) { setError(errorMessage(err, 'No se pudo resolver la solicitud')) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Horario y guardias</h2>
        <div className="t-tabs max-w-full overflow-x-auto" role="tablist" aria-label="Secciones del horario" onKeyDown={onTabsKeyDown}>
          <span ref={tabsPillRef} className="t-tabs-pill" aria-hidden="true" />
          {(['guardias', 'solicitudes', 'reportes'] as Tab[]).map((t) => (
            <button
              key={t}
              ref={(el) => { tabRefs.current[t] = el }}
              role="tab"
              aria-selected={tab === t}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              className="t-tab"
            >
              {t === 'guardias' ? 'Guardias' : t === 'reportes' ? 'Reportes' : `Solicitudes${porResolver.length ? ` (${porResolver.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="alert-danger">{error}</p>}
      {ok && <p role="status" className="alert-success">{ok}</p>}

      {tab === 'guardias' && (
        <>
          <div className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="btn-ghost !px-2.5 !py-1.5"
                aria-label="Mes anterior"
                onClick={() => { const d = new Date(month.getFullYear(), month.getMonth() - 1, 1); setMonth(d); setSelectedDay(isoDate(d)) }}
              ><ChevronLeftIcon /></button>
              <span className="px-1 text-sm font-semibold tabular-nums sm:min-w-32 sm:text-center">{monthLabel}</span>
              <button
                className="btn-ghost !px-2.5 !py-1.5"
                aria-label="Mes siguiente"
                onClick={() => { const d = new Date(month.getFullYear(), month.getMonth() + 1, 1); setMonth(d); setSelectedDay(isoDate(d)) }}
              ><ChevronRightIcon /></button>
              <button className="btn-ghost !py-1.5" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(isoDate(d)) }}>Hoy</button>
              {canWrite && (
                <button className="btn-primary w-full !py-1.5 sm:ml-auto sm:w-auto" onClick={abrirModal}><PlusIcon /> Agregar guardia</button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Select
                ariaLabel="Filtrar por grupo"
                value={grupoFilter}
                onChange={setGrupoFilter}
                options={[{ value: 'all', label: 'Todos los grupos' }, ...grupos.map((g) => ({ value: g.id, label: g.nombre }))]}
              />
              <Select
                ariaLabel="Filtrar por departamento"
                value={deptoFilter}
                onChange={setDeptoFilter}
                options={[{ value: 'all', label: 'Todos los departamentos' }, ...departamentos.map((d) => ({ value: d, label: d }))]}
              />
              <Select
                ariaLabel="Filtrar por turno"
                value={turnoFilter}
                onChange={(v) => setTurnoFilter(v as 'all' | Turno)}
                options={[{ value: 'all', label: 'Todos los turnos' }, ...TURNOS.map((t) => ({ value: t.id, label: t.label }))]}
              />
            </div>
          </div>

          {canWrite && showForm && (
            <div
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guardia-modal-title"
              onClick={cerrarModal}
            >
              <div ref={dialogRef} className={`t-modal ${modalState === 'open' ? 'is-open' : ''} ${modalState === 'closing' ? 'is-closing' : ''} card mt-4 w-full max-w-2xl sm:mt-10`} onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 id="guardia-modal-title" className="text-lg font-bold">Agregar guardia</h3>
                  <button type="button" className="btn-ghost min-w-11 !px-2 !py-1 sm:min-w-10" onClick={cerrarModal} aria-label="Cerrar"><XIcon /></button>
                </div>
                <form onSubmit={crearGuardia} className="grid gap-3 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="field-label">Departamento (opcional)</span>
                    <Select
                      value={nDepto}
                      onChange={(v) => { setNDepto(v); setNTrabajador('') }}
                      options={[{ value: '', label: 'Todos / sin filtro' }, ...DEPARTAMENTOS.map((d) => ({ value: d, label: d }))]}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="field-label">Fecha</span>
                    <input type="date" className="input" value={nFecha} required onChange={(e) => setNFecha(e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="field-label">Turno</span>
                    <Select
                      value={nTurno}
                      onChange={(v) => setNTurno(v as Turno)}
                      options={TURNOS.map((t) => ({ value: t.id, label: `${t.label} (${t.horaInicio}–${t.horaFin})` }))}
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="field-label">Trabajador{nDepto ? ` (${nDepto})` : ''}</span>
                    <Select
                      value={nTrabajador}
                      onChange={setNTrabajador}
                      placeholder={empleados.length ? 'Seleccione…' : 'Sin trabajadores'}
                      options={empleados.map((t) => ({
                        value: t.id,
                        label: `${nombreCompleto(t)}${!nDepto && t.departamento ? ` · ${t.departamento}` : ''}`,
                      }))}
                    />
                    {nDepto && empleados.length === 0 && (
                      <span className="text-xs text-amber-700 dark:text-amber-300">No hay trabajadores con el departamento {nDepto}. Asígnalo en el perfil del trabajador.</span>
                    )}
                  </label>
                  <label className="block space-y-1">
                    <span className="field-label">Observación (opcional)</span>
                    <input className="input" value={nObs} onChange={(e) => setNObs(e.target.value)} />
                  </label>
                  <div className="flex gap-2 sm:col-span-3">
                    <button className="btn-primary" disabled={!nTrabajador}>Guardar guardia</button>
                    <button type="button" className="btn-ghost" onClick={cerrarModal}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {loading ? (
            <p className="card text-center text-slate-500 dark:text-slate-400">Cargando…</p>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <div className="card space-y-2">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cal.map((iso, i) => iso === null ? (
                    <div key={`b-${i}`} className="aspect-square" />
                  ) : (
                    <button
                      key={iso}
                      onClick={() => setSelectedDay(iso)}
                      aria-pressed={iso === selectedDay}
                      aria-current={iso === hoy ? 'date' : undefined}
                      className={`relative aspect-square rounded-lg text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                        iso === selectedDay ? 'bg-brand-700 text-white shadow-sm'
                          : iso === hoy ? 'bg-brand-50 ring-2 ring-brand-400 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="absolute left-2 top-1.5 leading-none tabular-nums">{Number(iso.slice(8))}</span>
                      {porDia[iso]?.length ? (
                        <span className={`absolute bottom-1.5 right-1.5 rounded-full px-1.5 text-xs font-semibold leading-4 tabular-nums ${iso === selectedDay ? 'bg-white text-brand-900' : 'bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-200'}`}>
                          {porDia[iso].length}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <section className="card space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-brand-900 dark:text-brand-200">{fmtDia(selectedDay)} · <span className="tabular-nums">{fmtFecha(selectedDay)}</span></h3>
                  {canWrite && (
                    <button className="btn-ghost !py-1.5" onClick={() => { setNFecha(selectedDay); abrirModal() }}><PlusIcon /> Agregar guardia</button>
                  )}
                </div>
                {delDia.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">Nadie de guardia este día.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {delDia.map((g) => (
                      <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-900 dark:bg-brand-900/40 dark:text-brand-200">{turnoLabel(g.turno)}</span>
                          <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">{turnoHorario(g.turno)}</span>
                          <span className="font-medium">{names[g.trabajador_id] ?? '—'}</span>
                          {trabMap[g.trabajador_id]?.grupo_nombre && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">{trabMap[g.trabajador_id].grupo_nombre}</span>
                          )}
                          {deptoDe(g) && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">{deptoDe(g)}</span>}
                          {ausenciaEn(ausencias, g.trabajador_id, g.fecha) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300" title="El trabajador tiene una ausencia aprobada ese día"><WarningIcon className="h-3 w-3" /> Ausencia</span>
                          )}
                        </span>
                        {canWrite && <button className="btn-danger !py-1" onClick={() => eliminar(g)}>Eliminar</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {tab === 'reportes' && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-2">
            <button
              className="btn-ghost !px-2.5 !py-1.5"
              aria-label="Mes anterior"
              onClick={() => { const d = new Date(month.getFullYear(), month.getMonth() - 1, 1); setMonth(d); setSelectedDay(isoDate(d)) }}
            ><ChevronLeftIcon /></button>
            <span className="px-1 text-sm font-semibold tabular-nums sm:min-w-32 sm:text-center">{monthLabel}</span>
            <button
              className="btn-ghost !px-2.5 !py-1.5"
              aria-label="Mes siguiente"
              onClick={() => { const d = new Date(month.getFullYear(), month.getMonth() + 1, 1); setMonth(d); setSelectedDay(isoDate(d)) }}
            ><ChevronRightIcon /></button>
            <button className="btn-ghost !py-1.5 sm:ml-auto" onClick={() => window.print()}><PrinterIcon /> Imprimir</button>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">{delMes.length} guardia(s) en el mes (según filtros de grupo/departamento/turno).</p>

          <section className="card space-y-2">
            <h3 className="section-title">Por trabajador</h3>
            {Object.keys(resumen.porTrabajador).length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos.</p> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400"><tr><th scope="col" className="py-1">Trabajador</th><th scope="col" className="py-1 text-right font-semibold">Guardias</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(resumen.porTrabajador).sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                    <tr key={id}><td className="py-1">{names[id] ?? '—'}</td><td className="py-1 text-right font-medium tabular-nums">{n}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card space-y-2">
            <h3 className="section-title">Por departamento</h3>
            {Object.keys(resumen.porDepto).length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos.</p> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400"><tr><th scope="col" className="py-1">Departamento</th><th scope="col" className="py-1 text-right font-semibold">Guardias</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(resumen.porDepto).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
                    <tr key={d}><td className="py-1">{d}</td><td className="py-1 text-right font-medium tabular-nums">{n}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card space-y-2">
            <h3 className="section-title">Por turno</h3>
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400"><tr><th scope="col" className="py-1">Turno</th><th scope="col" className="py-1 text-right font-semibold">Guardias</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {TURNOS.map((t) => (
                  <tr key={t.id}><td className="py-1">{t.label}</td><td className="py-1 text-right font-medium tabular-nums">{resumen.porTurno[t.id] ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'solicitudes' && (
        <div className="space-y-4">
          {canWrite && (
            <section className="space-y-2">
              <h3 className="section-title">Por resolver</h3>
              {porResolver.length === 0 ? (
                <p className="card text-center text-slate-500 dark:text-slate-400">No hay solicitudes pendientes.</p>
              ) : (
                <ul className="space-y-2">
                  {porResolver.map((s) => (
                    <SolicitudItem
                      key={s.id}
                      solicitud={s}
                      names={names}
                      guardias={guardiasMap}
                      showSolicitante
                      actions={
                        <div className="flex w-full flex-wrap items-center justify-end gap-2">
                          <input
                            className="input w-full !py-1.5 sm:!w-56"
                            placeholder="Comentario (opcional)"
                            aria-label="Comentario para la solicitud"
                            value={comentarios[s.id] ?? ''}
                            onChange={(e) => setComentarios((c) => ({ ...c, [s.id]: e.target.value }))}
                          />
                          <button className="btn-primary !py-1.5" onClick={() => resolver(s, true)}>Aprobar</button>
                          <button className="btn-danger !py-1.5" onClick={() => resolver(s, false)}>Rechazar</button>
                        </div>
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="section-title">Historial de solicitudes</h3>
            {loading ? (
              <p className="card text-center text-slate-500 dark:text-slate-400">Cargando…</p>
            ) : solicitudes.length === 0 ? (
              <p className="card text-center text-slate-500 dark:text-slate-400">No hay solicitudes.</p>
            ) : (
              <ul className="space-y-2">
                {solicitudes.map((s) => (
                  <SolicitudItem key={s.id} solicitud={s} names={names} guardias={guardiasMap} showSolicitante />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
