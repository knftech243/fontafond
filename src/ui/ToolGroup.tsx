import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon, type IconName } from './Icon'

export interface GroupTool<T extends string> {
  id: T
  icon: IconName
  label: string
  key?: string
}

interface Props<T extends string> {
  label: string
  tools: GroupTool<T>[]
  /** Outil actif de l'application (peut être hors du groupe). */
  active: T | string
  /** Dernier outil du groupe utilisé : affiché sur le bouton. */
  current: T
  onSelect: (id: T) => void
}

const LONG_PRESS_MS = 400

/**
 * Bouton de groupe d'outils, comme dans les logiciels de création : un clic choisit l'outil affiché,
 * un clic long ou un clic droit ouvre le menu volant du groupe.
 */
export function ToolGroup<T extends string>({ label, tools, active, current, onSelect }: Props<T>) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const shown = tools.find((t) => t.id === current) ?? tools[0]
  const inGroup = tools.some((t) => t.id === active)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    wrapRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"], [role="menuitemradio"]')?.focus()
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = (id: T) => {
    setOpen(false)
    onSelect(id)
    buttonRef.current?.focus()
  }

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Escape' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div className="fd-toolgroup" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="fd-tool fd-tool-group"
        aria-pressed={inGroup}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${shown.label}${shown.key ? ` (${shown.key})` : ''} – clic long ou clic droit : autres outils ${label}`}
        title={`${shown.label}${shown.key ? ` (${shown.key})` : ''} · clic long : autres outils`}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          longPressed.current = false
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => {
            longPressed.current = true
            setOpen(true)
          }, LONG_PRESS_MS)
        }}
        onPointerUp={() => window.clearTimeout(timer.current)}
        onPointerLeave={() => window.clearTimeout(timer.current)}
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false
            return
          }
          onSelect(shown.id)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <Icon name={shown.icon} size={20} />
      </button>
      {open && (
        <div className="fd-flyout" role="menu" aria-label={`Outils ${label}`} onKeyDown={onMenuKey}>
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={active === t.id}
              className="fd-flyout-item"
              onClick={() => choose(t.id)}
            >
              <span className="fd-flyout-check" aria-hidden="true">
                {active === t.id ? '●' : ''}
              </span>
              <Icon name={t.icon} size={18} />
              <span className="fd-flyout-label">{t.label}</span>
              {t.key && <kbd className="fd-menu-kbd">{t.key}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
