import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Guardia, Solicitud, SolicitudTipo, TrabajadorConGrupo, TrabajadorPublico } from '../types/database'
import { guardiasService } from '../services/guardiasService'
import { solicitudesService } from '../services/solicitudesService'
import { trabajadoresPublicoService } from '../services/trabajadoresService'
import { useAuth } from '../context/AuthContext'
import { useDialogs } from './Dialogs'
import { FileIcon, PulseIcon, ShieldIcon, SwapIcon } from './Icons'
import { Select } from './Select'
import { isoDate, turnoLabel, fmtFecha } from '../lib/horario'
import { errorMessage } from '../lib/errors'
import { SolicitudItem } from './SolicitudItem'

interface Props {
  self: TrabajadorConGrupo
}

const nombreCompleto = (t: { apellidos: string; nombres: string }) => `${t.apellidos}, ${t.nombres}`

export function SolicitudesPersonal({ self }: Props) {
  const { session } = useAuth()
  const dialogs = useDialogs()
  const [trabajadores, setTrabajadores] = useState<TrabajadorPublico[]>([])
  const [guardias, setGuardias] = useState<Guardia[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [mode, setMode] = useState<SolicitudTipo | null>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [motivo, setMotivo] = useState('')
  const [companeroId, setCompaneroId] = useState('')
  const [miGuardia, setMiGuardia] = useState('')
  const [suGuardia, setSuGuardia] = useState('')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, g, s] = await Promise.all([
        trabajadoresPublicoService.list(),
        guardiasService.list(),
        solicitudesService.list(),
      ])
      setTrabajadores(t); setGuardias(g); setSolicitudes(s)
    } catch (err) { setError(errorMessage(err, 'No se pudieron cargar los datos')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const names = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of trabajadores) m[t.id] = nombreCompleto(t)
    return m
  }, [trabajadores])

  const guardiasMap = useMemo(() => {
    const m: Record<string, Guardia> = {}
    for (const g of guardias) m[g.id] = g
    return m
  }, [guardias])

  const hoy = isoDate(new Date())
  const misGuardias = useMemo(
    () => guardias.filter((g) => g.trabajador_id === self.id && g.fecha >= hoy),
    [guardias, self.id, hoy],
  )
  const companeroGuardias = useMemo(() => {
    const mia = guardiasMap[miGuardia]
    return guardias.filter((g) =>
      g.trabajador_id === companeroId && g.fecha >= hoy
      // Evita intercambiar dos guardias del mismo día/turno (rompería la unicidad).
      && !(mia && g.fecha === mia.fecha && g.turno === mia.turno),
    )
  }, [guardias, companeroId, hoy, guardiasMap, miGuardia])
  const companeros = useMemo(
    () => trabajadores.filter((t) => t.id !== self.id && t.estado),
    [trabajadores, self.id],
  )
  // Para "ausencia cubierta": el compañero no puede ya tener guardia en ese día/turno.
  const coberturaConflicto = useMemo(() => {
    const mia = guardiasMap[miGuardia]
    if (!mia || !companeroId) return false
    return guardias.some((g) => g.trabajador_id === companeroId && g.fecha === mia.fecha && g.turno === mia.turno)
  }, [guardias, guardiasMap, miGuardia, companeroId])
  const misSolicitudes = useMemo(
    () => solicitudes.filter((s) => s.solicitante_id === self.id),
    [solicitudes, self.id],
  )
  const porResponder = useMemo(
    () => solicitudes.filter((s) => s.companero_id === self.id && s.estado === 'PENDIENTE_COMPANERO'),
    [solicitudes, self.id],
  )

  function resetForm() {
    setMode(null); setFechaInicio(''); setFechaFin(''); setMotivo('')
    setCompaneroId(''); setMiGuardia(''); setSuGuardia(''); setComprobante(null); setError('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setOk(''); setSaving(true)
    try {
      let comprobante_path: string | null = null
      if (comprobante) {
        if (!session) throw new Error('Sesión no válida')
        comprobante_path = await solicitudesService.subirComprobante(session.user.id, comprobante)
      }
      if (mode === 'CAMBIO_GUARDIA') {
        if (!miGuardia || !companeroId || !suGuardia) throw new Error('Seleccione su guardia, el compañero y la guardia a tomar')
        await solicitudesService.create({
          tipo: 'CAMBIO_GUARDIA', estado: 'PENDIENTE_COMPANERO', solicitante_id: self.id,
          companero_id: companeroId, guardia_id: miGuardia, guardia_companero_id: suGuardia,
          motivo: motivo || null, comprobante_path,
        })
      } else if (mode === 'AUSENCIA_CUBIERTA') {
        if (!miGuardia || !companeroId) throw new Error('Seleccione su guardia y el compañero que la cubrirá')
        const mia = guardiasMap[miGuardia]
        if (!mia) throw new Error('Guardia inválida')
        if (coberturaConflicto) throw new Error('El compañero ya tiene una guardia en ese día y turno')
        await solicitudesService.create({
          tipo: 'AUSENCIA_CUBIERTA', estado: 'PENDIENTE_COMPANERO', solicitante_id: self.id,
          companero_id: companeroId, guardia_id: miGuardia,
          fecha_inicio: mia.fecha, fecha_fin: mia.fecha,
          motivo: motivo || null, comprobante_path,
        })
      } else if (mode === 'PERMISO' || mode === 'SUSPENSION_MEDICA') {
        if (!fechaInicio) throw new Error('Indique la fecha de inicio')
        await solicitudesService.create({
          tipo: mode, estado: 'PENDIENTE_JEFE', solicitante_id: self.id,
          fecha_inicio: fechaInicio, fecha_fin: fechaFin || fechaInicio, motivo: motivo || null, comprobante_path,
        })
      }
      setOk('Solicitud enviada')
      resetForm(); await load()
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar la solicitud'))
    } finally { setSaving(false) }
  }

  async function responder(s: Solicitud, aceptar: boolean) {
    setError(''); setOk('')
    try {
      await solicitudesService.responderCompanero(s.id, aceptar)
      setOk(aceptar ? 'Solicitud aceptada; queda pendiente de aprobación' : 'Solicitud rechazada')
      await load()
    } catch (err) { setError(errorMessage(err, 'No se pudo responder la solicitud')) }
  }

  async function cancelar(s: Solicitud) {
    const ok = await dialogs.confirmar({ title: 'Cancelar solicitud', message: '¿Cancelar esta solicitud?', confirmLabel: 'Cancelar solicitud', danger: true })
    if (!ok) return
    setError(''); setOk('')
    try { await solicitudesService.cancelar(s.id); await load() }
    catch (err) { setError(errorMessage(err, 'No se pudo cancelar')) }
  }

  const cancelable = (s: Solicitud) => s.estado === 'PENDIENTE_COMPANERO' || s.estado === 'PENDIENTE_JEFE'

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-title">Mis solicitudes</h3>
        <div className="flex flex-wrap gap-2">
          {([
            ['CAMBIO_GUARDIA', 'Cambio de guardia', SwapIcon],
            ['AUSENCIA_CUBIERTA', 'Ausencia cubierta', ShieldIcon],
            ['PERMISO', 'Permiso', FileIcon],
            ['SUSPENSION_MEDICA', 'Suspensión médica', PulseIcon],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              aria-pressed={mode === id}
              className={`!py-1.5 ${mode === id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode(mode === id ? null : id)}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="alert-danger">{error}</p>}
      {ok && <p role="status" className="alert-success">{ok}</p>}

      {mode && (
        <form onSubmit={submit} className="t-reveal space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
          {mode === 'CAMBIO_GUARDIA' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1">
                <span className="field-label">Mi guardia</span>
                <Select
                  value={miGuardia}
                  onChange={(v) => { setMiGuardia(v); setSuGuardia('') }}
                  options={misGuardias.map((g) => ({ value: g.id, label: `${fmtFecha(g.fecha)} · ${turnoLabel(g.turno)}` }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="field-label">Compañero</span>
                <Select
                  value={companeroId}
                  onChange={(v) => { setCompaneroId(v); setSuGuardia('') }}
                  options={companeros.map((c) => ({ value: c.id, label: `${nombreCompleto(c)}${c.grupo_nombre ? ` · ${c.grupo_nombre}` : ''}` }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="field-label">Guardia a tomar</span>
                <Select
                  value={suGuardia}
                  onChange={setSuGuardia}
                  disabled={!companeroId}
                  placeholder={companeroId ? 'Seleccione…' : 'Elija un compañero'}
                  options={companeroGuardias.map((g) => ({ value: g.id, label: `${fmtFecha(g.fecha)} · ${turnoLabel(g.turno)}` }))}
                />
              </label>
            </div>
          ) : mode === 'AUSENCIA_CUBIERTA' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="field-label">Mi guardia a ceder</span>
                <Select
                  value={miGuardia}
                  onChange={setMiGuardia}
                  options={misGuardias.map((g) => ({ value: g.id, label: `${fmtFecha(g.fecha)} · ${turnoLabel(g.turno)}` }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="field-label">Compañero que la cubre</span>
                <Select
                  value={companeroId}
                  onChange={setCompaneroId}
                  options={companeros.map((c) => ({ value: c.id, label: `${nombreCompleto(c)}${c.grupo_nombre ? ` · ${c.grupo_nombre}` : ''}` }))}
                />
              </label>
              {coberturaConflicto && (
                <p className="text-xs text-red-600 dark:text-red-300 sm:col-span-2">El compañero ya tiene una guardia ese día y turno; elige otro compañero u otra guardia.</p>
              )}
              {misGuardias.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">No tiene guardias futuras asignadas.</p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="field-label">Desde</span>
                <input type="date" className="input" value={fechaInicio} required onChange={(e) => setFechaInicio(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="field-label">Hasta (opcional)</span>
                <input type="date" className="input" value={fechaFin} min={fechaInicio || undefined} onChange={(e) => setFechaFin(e.target.value)} />
              </label>
            </div>
          )}
          <label className="block space-y-1">
            <span className="field-label">Motivo (opcional)</span>
            <textarea className="input" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="field-label">Comprobante (opcional, PDF o imagen · máx. 5 MB)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="input !py-2"
              onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={saving || (mode === 'AUSENCIA_CUBIERTA' && coberturaConflicto)}>{saving ? 'Enviando…' : 'Enviar solicitud'}</button>
            <button type="button" className="btn-ghost" onClick={resetForm}>Cancelar</button>
          </div>
          {mode === 'CAMBIO_GUARDIA' && misGuardias.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">No tiene guardias futuras asignadas.</p>
          )}
        </form>
      )}

      {porResponder.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.04em] text-amber-700 dark:text-amber-300">Cambios pendientes de tu respuesta</h4>
          <ul className="space-y-2">
            {porResponder.map((s) => (
              <SolicitudItem
                key={s.id}
                solicitud={s}
                names={names}
                guardias={guardiasMap}
                showSolicitante
                actions={
                  <>
                    <button className="btn-primary !py-1.5" onClick={() => responder(s, true)}>Aceptar</button>
                    <button className="btn-danger !py-1.5" onClick={() => responder(s, false)}>Rechazar</button>
                  </>
                }
              />
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">Historial</h4>
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : misSolicitudes.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aún no ha realizado solicitudes.</p>
        ) : (
          <ul className="space-y-2">
            {misSolicitudes.map((s) => (
              <SolicitudItem
                key={s.id}
                solicitud={s}
                names={names}
                guardias={guardiasMap}
                actions={cancelable(s) ? <button className="btn-ghost !py-1.5" onClick={() => cancelar(s)}>Cancelar</button> : undefined}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
