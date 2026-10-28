import type { ReactNode } from 'react'
import type { Guardia, Solicitud } from '../types/database'
import { ESTADO_META, describeSolicitud, tipoLabel } from '../lib/horario'
import { solicitudesService } from '../services/solicitudesService'
import { useDialogs } from './Dialogs'
import { PaperclipIcon } from './Icons'

interface Props {
  solicitud: Solicitud
  names: Record<string, string>
  guardias: Record<string, Guardia>
  /** Muestra "Solicitante: ..." (útil en la bandeja del jefe). */
  showSolicitante?: boolean
  actions?: ReactNode
}

export function SolicitudItem({ solicitud: s, names, guardias, showSolicitante, actions }: Props) {
  const meta = ESTADO_META[s.estado]
  const { avisar } = useDialogs()

  async function abrirComprobante(path: string) {
    try {
      const url = await solicitudesService.urlComprobante(path)
      window.open(url, '_blank', 'noopener')
    } catch {
      await avisar({ title: 'Comprobante', message: 'No se pudo abrir el comprobante.' })
    }
  }

  return (
    <li className="space-y-1.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:ring-slate-700/50">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-900 dark:bg-brand-900/40 dark:text-brand-200">{tipoLabel(s.tipo)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
        {showSolicitante && <span className="text-xs text-slate-500 dark:text-slate-400">Solicitante: {names[s.solicitante_id] ?? '—'}</span>}
      </div>
      <p className="text-sm">{describeSolicitud(s, names, guardias)}</p>
      {s.motivo && <p className="text-xs text-slate-500 dark:text-slate-400">Motivo: {s.motivo}</p>}
      {s.comprobante_path && (
        <button className="btn-ghost !py-1.5 text-xs" onClick={() => abrirComprobante(s.comprobante_path as string)}><PaperclipIcon className="h-3.5 w-3.5" /> Ver comprobante</button>
      )}
      {s.comentario_jefe && <p className="text-xs text-slate-500 dark:text-slate-400">Respuesta del jefe: {s.comentario_jefe}</p>}
      {actions && <div className="flex flex-wrap justify-end gap-2 pt-1">{actions}</div>}
    </li>
  )
}
