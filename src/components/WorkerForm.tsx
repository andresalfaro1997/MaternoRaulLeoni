import { useState, type FormEvent } from 'react'
import type { GrupoTrabajo, TrabajadorInput } from '../types/database'
import { SECTIONS, normalizeWorker, type FieldDef } from '../lib/workerFields'
import { Select } from './Select'

interface Props {
  initial: TrabajadorInput
  grupos: GrupoTrabajo[]
  submitLabel: string
  onSubmit: (value: TrabajadorInput) => Promise<void>
  onCancel?: () => void
}

export function WorkerForm({ initial, grupos, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<TrabajadorInput>(initial)
  const [saving, setSaving] = useState(false)

  const set = (k: keyof TrabajadorInput, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }) as TrabajadorInput)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.grupo_trabajo_id) return
    setSaving(true)
    try { await onSubmit(normalizeWorker(form)) } finally { setSaving(false) }
  }

  function renderField(f: FieldDef) {
    if (f.kind === 'computed') return null
    const key = f.key as keyof TrabajadorInput
    const raw = form[key]
    const value = raw === null || raw === undefined ? '' : String(raw)
    const common = { id: `w-${f.key}`, value, className: 'input' }
    let control
    if (f.kind === 'textarea') {
      control = <textarea {...common} rows={2} onChange={(e) => set(key, e.target.value)} />
    } else if (f.kind === 'select') {
      control = (
        <Select
          id={`w-${f.key}`}
          value={value}
          onChange={(v) => set(key, v)}
          ariaLabel={f.label}
          options={[{ value: '', label: '—' }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]}
        />
      )
    } else {
      control = (
        <input
          {...common}
          type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}
          step={f.kind === 'number' ? '0.5' : undefined}
          inputMode={f.key === 'cedula' ? 'numeric' : undefined}
          required={f.key === 'cedula' || f.key === 'nombres' || f.key === 'apellidos'}
          onChange={(e) => set(key, f.key === 'cedula' ? e.target.value.replace(/\D/g, '') : e.target.value)}
        />
      )
    }
    return (
      <label key={f.key} className={`block space-y-1 ${f.wide ? 'sm:col-span-2' : ''}`}>
        <span className="field-label">{f.label}</span>
        {control}
      </label>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="space-y-3">
        <h3 className="section-title">Asignación</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="field-label">Función (grupo de trabajo)</span>
            <Select
              id="w-grupo"
              value={form.grupo_trabajo_id}
              onChange={(v) => set('grupo_trabajo_id', v)}
              placeholder="Seleccione…"
              options={grupos.map((g) => ({ value: g.id, label: g.nombre }))}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.estado} onChange={(e) => set('estado', e.target.checked)} /> Trabajador activo
          </label>
        </div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title} className="space-y-3">
          <h3 className="section-title">{s.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2">{s.fields.map(renderField)}</div>
        </section>
      ))}

      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={saving || !form.grupo_trabajo_id}>{saving ? 'Guardando…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}
