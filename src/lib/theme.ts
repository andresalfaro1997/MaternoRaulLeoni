import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'rrhh-theme'

/** Estado del tema sincronizado con la clase `dark` del <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}
