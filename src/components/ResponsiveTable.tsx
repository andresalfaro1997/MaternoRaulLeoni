import type { ReactNode } from 'react'
import { UsersIcon } from './Icons'

export interface Column<T> {
  header: string
  render: (row: T) => ReactNode
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  /** Título de la tarjeta en móvil */
  cardTitle: (row: T) => ReactNode
  actions?: (row: T) => ReactNode
  empty?: string
}

/** Tabla en md+ ; tarjetas apiladas en móvil. */
export function ResponsiveTable<T>({ rows, columns, rowKey, cardTitle, actions, empty = 'Sin registros' }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-10 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <UsersIcon className="h-4 w-4" />
        </span>
        <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      </div>
    )
  }
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              {columns.map((c) => <th key={c.header} scope="col" className="px-4 py-3 font-semibold">{c.header}</th>)}
              {actions && <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={rowKey(r)} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {columns.map((c) => <td key={c.header} className="px-4 py-3">{c.render(r)}</td>)}
                {actions && <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2">{actions(r)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="card space-y-2">
            <div className="font-semibold">{cardTitle(r)}</div>
            {columns.map((c) => (
              <div key={c.header} className="flex justify-between gap-3 text-sm">
                <span className="shrink-0 text-slate-500 dark:text-slate-400">{c.header}</span>
                <span className="min-w-0 break-words text-right">{c.render(r)}</span>
              </div>
            ))}
            {actions && <div className="flex flex-wrap justify-end gap-2 pt-1">{actions(r)}</div>}
          </li>
        ))}
      </ul>
    </>
  )
}
