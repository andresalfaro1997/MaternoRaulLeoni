import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ConfirmOpts = { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
type PromptOpts = { title?: string; message?: string; label?: string; type?: 'text' | 'password'; confirmLabel?: string; cancelLabel?: string }
type InfoOpts = { title?: string; message: string; confirmLabel?: string }

interface DialogApi {
  /** Confirmación con Cancelar/Confirmar. */
  confirmar: (o: ConfirmOpts) => Promise<boolean>
  /** Pide un texto (p. ej. contraseña). Devuelve null si se cancela. */
  pedirTexto: (o: PromptOpts) => Promise<string | null>
  /** Aviso informativo con un solo botón. */
  avisar: (o: InfoOpts) => Promise<void>
}

type State =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOpts; resolve: (v: string | null) => void }
  | { kind: 'info'; opts: InfoOpts; resolve: () => void }

const Ctx = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDialogs debe usarse dentro de DialogProvider')
  return ctx
}

const focusables = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => !el.hasAttribute('disabled'))
}

/** Reemplaza confirm/prompt/alert nativos por modales accesibles dentro de la app. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null)
  const [text, setText] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const confirmar = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })),
    [],
  )
  const pedirTexto = useCallback(
    (opts: PromptOpts) => new Promise<string | null>((resolve) => { setText(''); setState({ kind: 'prompt', opts, resolve }) }),
    [],
  )
  const avisar = useCallback(
    (opts: InfoOpts) => new Promise<void>((resolve) => setState({ kind: 'info', opts, resolve })),
    [],
  )

  const close = useCallback((result: boolean | string | null) => {
    setState((s) => {
      if (!s) return null
      if (s.kind === 'confirm') s.resolve(result as boolean)
      else if (s.kind === 'prompt') s.resolve(result as string | null)
      else s.resolve()
      return null
    })
  }, [])

  useEffect(() => {
    if (!state) return
    const previo = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      if (state.kind === 'prompt') inputRef.current?.focus()
      else focusables(panelRef.current)[0]?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(state.kind === 'confirm' ? false : null); return }
      if (e.key === 'Enter' && state.kind !== 'prompt') { close(state.kind === 'confirm' ? true : null); return }
      if (e.key !== 'Tab') return
      const els = focusables(panelRef.current)
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previo?.focus()
    }
  }, [state, close])

  const api: DialogApi = { confirmar, pedirTexto, avisar }
  const promptOpts = state?.kind === 'prompt' ? state.opts : null
  const danger = state?.kind === 'confirm' ? !!state.opts.danger : false
  const title = state?.opts.title ?? (state?.kind === 'confirm' ? 'Confirmar' : state?.kind === 'prompt' ? 'Ingrese un valor' : 'Aviso')
  const confirmLabel = state?.opts.confirmLabel ?? (state?.kind === 'confirm' ? 'Confirmar' : 'Aceptar')

  const accept = () => close(state?.kind === 'confirm' ? true : state?.kind === 'prompt' ? (text.trim() || null) : null)
  const cancel = () => close(state?.kind === 'confirm' ? false : null)

  return (
    <Ctx.Provider value={api}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={cancel}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-title"
            className="card w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="dlg-title" className="text-lg font-bold">{title}</h3>
            {state.opts.message && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{state.opts.message}</p>
            )}
            {state.kind === 'prompt' && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (text.trim()) accept() }}
                className="space-y-2"
              >
                <label className="block space-y-1">
                  <span className="field-label">{promptOpts?.label ?? 'Valor'}</span>
                  <input
                    ref={inputRef}
                    className="input"
                    type={promptOpts?.type ?? 'text'}
                    autoComplete={promptOpts?.type === 'password' ? 'new-password' : 'off'}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
              </form>
            )}
            <div className="flex justify-end gap-2">
              {state.kind !== 'info' && (
                <button type="button" className="btn-ghost" onClick={cancel}>{state.opts.cancelLabel ?? 'Cancelar'}</button>
              )}
              <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={accept} disabled={state.kind === 'prompt' && !text.trim()}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
