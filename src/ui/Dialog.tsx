import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Boîte de dialogue modale (élément <dialog> natif : focus et touche Échap gérés par le navigateur). */
export function Dialog({ open, title, onClose, children, footer, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`fd-dialog${wide ? ' fd-dialog-wide' : ''}`}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <header className="fd-dialog-head">
            <h2>{title}</h2>
            <button type="button" className="fd-icon-btn" aria-label="Fermer" onClick={onClose}>
              ×
            </button>
          </header>
          <div className="fd-dialog-body">{children}</div>
          {footer && <footer className="fd-dialog-foot">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}
