import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Guardia, TrabajadorPublico } from '../types/database'
import type { Ausencia } from '../lib/horario'
import { guardiasService } from '../services/guardiasService'
import { errorMessage } from '../lib/errors'
import { downloadTemplate, parseMatrix, readSpreadsheet, type ImportPreview } from '../lib/guardiasImport'
import { DownloadIcon, XIcon } from './Icons'

interface Props {
  onClose: () => void
  onDone: () => Promise<void> | void
  trabajadores: TrabajadorPublico[]
  guardias: Guardia[]
  ausencias: Ausencia[]
}

const mesActual = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function CargaMasivaGuardias({ onClose, onDone, trabajadores, guardias, ausencias }: Props) {
  const [month, setMonth] = useState(mesActual)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const monthDate = new Date(`${month}-01T00:00:00`)

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    monthRef.current?.focus()

    const focusables = () => {
      const panel = panelRef.current
      if (!panel) return [] as HTMLElement[]
      return Array.from(panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute('disabled'))
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
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
      document.body.style.overflow = overflow
      previo?.focus()
    }
  }, [])

  function cambiarMes(v: string) {
    setMonth(v)
    setPreview(null)
    setError('')
  }

  async function descargar(format: 'xlsx' | 'csv') {
    setError('')
    try {
      await downloadTemplate(monthDate, trabajadores, format)
    } catch (e) {
      setError(errorMessage(e, 'No se pudo generar la plantilla'))
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(''); setPreview(null)
    setParsing(true)
    try {
      const data = await readSpreadsheet(file)
      setPreview(parseMatrix(data, monthDate, trabajadores, guardias, ausencias))
    } catch (err) {
      setError(errorMessage(err, 'No se pudo leer el archivo'))
    } finally {
      setParsing(false)
    }
  }

  async function confirmar() {
    if (!preview || preview.rows.length === 0) return
    setSaving(true); setError('')
    try {
      await guardiasService.upsertMany(preview.rows)
      await onDone()
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar las guardias'))
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="carga-masiva-title"
      onClick={onClose}
    >
      <div ref={panelRef} className="card t-reveal mt-4 w-full max-w-3xl space-y-4 sm:mt-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 id="carga-masiva-title" className="text-lg font-bold">Carga masiva de guardias</h3>
          <button type="button" className="btn-ghost min-w-11 !px-2 !py-1 sm:min-w-10" onClick={onClose} aria-label="Cerrar"><XIcon /></button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Descarga la plantilla, complétala y súbela. Solo se agregan o actualizan las celdas con turno; el resto del mes no se modifica.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block space-y-1 sm:w-56">
            <span className="field-label">Mes</span>
            <input ref={monthRef} type="month" className="input" value={month} onChange={(e) => cambiarMes(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => descargar('xlsx')}><DownloadIcon /> Plantilla Excel</button>
            <button type="button" className="btn-ghost" onClick={() => descargar('csv')}><DownloadIcon /> Plantilla CSV</button>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="field-label">Archivo completado (.xlsx o .csv)</span>
          <input type="file" accept=".xlsx,.csv" className="input !py-2" onChange={onFile} disabled={parsing || saving} />
        </label>

        {error && <p role="alert" className="alert-danger">{error}</p>}
        {parsing && <p className="text-sm text-slate-500 dark:text-slate-400">Leyendo archivo…</p>}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Celdas con turno: <b>{preview.celdas}</b></span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Válidas: <b>{preview.rows.length}</b></span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Advertencias: <b>{preview.advertencias.length}</b></span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-950/50 dark:text-red-300">Errores: <b>{preview.errores.length}</b></span>
            </div>

            {preview.advertencias.length > 0 && (
              <div className="alert-warning">
                <p className="font-semibold">Advertencias (no bloquean)</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {preview.advertencias.slice(0, 8).map((w) => <li key={w}>{w}</li>)}
                </ul>
                {preview.advertencias.length > 8 && <p className="mt-1">y {preview.advertencias.length - 8} más…</p>}
              </div>
            )}

            {preview.errores.length > 0 && (
              <div className="alert-danger">
                <p className="font-semibold">Errores (se omiten)</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {preview.errores.slice(0, 8).map((w) => <li key={w}>{w}</li>)}
                </ul>
                {preview.errores.length > 8 && <p className="mt-1">y {preview.errores.length - 8} más…</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={confirmar} disabled={saving || !preview || preview.rows.length === 0}>
            {saving ? 'Cargando…' : `Cargar ${preview?.rows.length ?? 0} guardias`}
          </button>
        </div>
      </div>
    </div>
  )
}
