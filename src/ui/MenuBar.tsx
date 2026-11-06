import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export type MenuItem =
  | { type: 'item'; label: string; onSelect: () => void; shortcut?: string; disabled?: boolean }
  | { type: 'check'; label: string; checked: boolean; onSelect: () => void; disabled?: boolean }
  | { type: 'radio'; label: string; checked: boolean; onSelect: () => void }
  | { type: 'separator' }
  | { type: 'label'; label: string }

export interface Menu {
  id: string
  label: string
  items: MenuItem[]
}

/** Barre de menus façon logiciel de bureau : clic pour ouvrir, survol pour passer d'un menu à l'autre, clavier. */
export function MenuBar({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  // Donne le focus au premier élément du menu ouvert
  useEffect(() => {
    if (!open) return
    const first = barRef.current?.querySelector<HTMLElement>(`[data-menu="${open}"] [role^="menuitem"]:not([aria-disabled="true"])`)
    first?.focus()
  }, [open])

  function focusButton(id: string) {
    barRef.current?.querySelector<HTMLElement>(`[data-menu-button="${id}"]`)?.focus()
  }

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>, index: number) {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])'))
    const pos = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(pos + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(pos - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = menus[(index + (e.key === 'ArrowRight' ? 1 : -1) + menus.length) % menus.length]
      setOpen(next.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      const id = open
      setOpen(null)
      if (id) focusButton(id)
    }
  }

  return (
    <div className="fd-menus" ref={barRef} role="menubar" aria-label="Menus">
      {menus.map((m, i) => (
        <div key={m.id} className="fd-menu" data-menu={m.id}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === m.id}
            data-menu-button={m.id}
            className="fd-menu-button"
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onPointerEnter={() => open && open !== m.id && setOpen(m.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setOpen(m.id)
              }
            }}
          >
            {m.label}
          </button>
          {open === m.id && (
            <div className="fd-menu-list" role="menu" aria-label={m.label} onKeyDown={(e) => onMenuKey(e, i)}>
              {m.items.map((item, j) => {
                if (item.type === 'separator') return <div key={j} role="separator" className="fd-menu-sep" />
                if (item.type === 'label')
                  return (
                    <div key={j} className="fd-menu-label" role="presentation">
                      {item.label}
                    </div>
                  )
                const disabled = item.type !== 'radio' && !!item.disabled
                const role = item.type === 'check' ? 'menuitemcheckbox' : item.type === 'radio' ? 'menuitemradio' : 'menuitem'
                const checked = item.type === 'check' || item.type === 'radio' ? item.checked : undefined
                return (
                  <button
                    key={j}
                    type="button"
                    role={role}
                    aria-checked={checked}
                    aria-disabled={disabled || undefined}
                    tabIndex={-1}
                    className="fd-menu-item"
                    onClick={() => {
                      if (disabled) return
                      setOpen(null)
                      item.onSelect()
                    }}
                  >
                    <span className="fd-menu-check" aria-hidden="true">
                      {checked ? (item.type === 'radio' ? '●' : '✓') : ''}
                    </span>
                    <span className="fd-menu-text">{item.label}</span>
                    {item.type === 'item' && item.shortcut && <kbd className="fd-menu-kbd">{item.shortcut}</kbd>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
