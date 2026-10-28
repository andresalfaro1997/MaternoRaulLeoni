import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon, ChevronDownIcon } from './Icons'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  id?: string
  disabled?: boolean
  className?: string
  /** `true` (por defecto) ocupa todo el ancho; `false` se ajusta al contenido. */
  fullWidth?: boolean
}

/** Select propio con menú animado (translate + fade), accesible por teclado. */
export function Select({ value, onChange, options, placeholder = 'Seleccione…', ariaLabel, id, disabled, className = '', fullWidth = true }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const updatePos = useCallback(() => {
    const b = buttonRef.current
    if (!b) return
    const r = b.getBoundingClientRect()
    const est = Math.min(options.length * 38 + 10, 266)
    const below = r.bottom + 4
    const top = below + est > window.innerHeight ? Math.max(4, r.top - 4 - est) : below
    setPos({ top, left: r.left, width: Math.max(r.width, 180) })
  }, [options.length])

  useLayoutEffect(() => {
    if (!open) return
    updatePos()
    const onMove = () => updatePos()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, updatePos])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const start = selectedIndex >= 0 ? selectedIndex : 0
    setActive(start)
    const t = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLElement>(`[data-index="${start}"]`)?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, selectedIndex])

  function choose(i: number) {
    onChange(options[i].value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function focusOption(i: number) {
    const idx = Math.max(0, Math.min(options.length - 1, i))
    setActive(idx)
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${idx}"]`)?.focus()
  }

  function onOptionKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusOption(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusOption(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusOption(0) }
    else if (e.key === 'End') { e.preventDefault(); focusOption(options.length - 1) }
    else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setOpen(false); buttonRef.current?.focus() }
    else if (e.key === 'Tab') { e.stopPropagation(); e.preventDefault(); setOpen(false); buttonRef.current?.focus() }
  }

  const menu = open && pos ? createPortal(
    <div
      ref={menuRef}
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      className="t-menu fixed z-[70] max-h-64 overflow-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {options.map((o, i) => {
        const isSel = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={isSel}
            data-index={i}
            onClick={() => choose(i)}
            onFocus={() => setActive(i)}
            onKeyDown={(e) => onOptionKeyDown(e, i)}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/40 dark:text-brand-200' : 'text-slate-700 dark:text-slate-200'} hover:bg-slate-100 dark:hover:bg-slate-700`}
          >
            <span className="truncate">{o.label}</span>
            {isSel && <CheckIcon className="h-4 w-4 shrink-0" />}
          </button>
        )
      })}
    </div>,
    document.body,
  ) : null

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) }
          else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
        }}
        className={`input flex items-center justify-between gap-2 text-left ${fullWidth ? 'w-full' : '!w-auto'}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-500 dark:text-slate-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </div>
  )
}
