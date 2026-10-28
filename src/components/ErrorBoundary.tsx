import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Evita la pantalla en blanco: si algo falla al renderizar, muestra un aviso y permite recargar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de render:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4 dark:bg-slate-950">
        <div className="card w-full max-w-md space-y-3 text-center">
          <h1 className="text-xl font-bold text-brand-900 dark:text-brand-200">Algo salió mal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ocurrió un error inesperado en la aplicación.</p>
          <p className="rounded-xl bg-slate-50 p-3 text-left text-xs text-slate-500 break-words dark:bg-slate-800/60 dark:text-slate-400">{this.state.error.message}</p>
          <div className="flex justify-center gap-2">
            <button className="btn-primary" onClick={() => window.location.reload()}>Recargar</button>
            <button className="btn-ghost" onClick={() => this.setState({ error: null })}>Reintentar</button>
          </div>
        </div>
      </div>
    )
  }
}
