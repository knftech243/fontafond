import { useId, useRef } from 'react'

interface Props {
  label: string
  /** Abréviation affichée devant l'étiquette (ex. « VA » pour l'approche). */
  abbr?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  /** Valeur remise par un double-clic sur l'étiquette. */
  defaultValue: number
  unit?: string
  disabled?: boolean
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Champ numérique façon logiciel de création : glisser sur l'étiquette vers la droite ou la gauche
 * pour changer la valeur (Maj = ×10), double-clic sur l'étiquette pour la valeur par défaut.
 */
export function NumberField({ label, abbr, value, onChange, min, max, step = 1, defaultValue, unit, disabled }: Props) {
  const id = useId()
  const drag = useRef<{ x: number; v: number } | null>(null)
  const round = (n: number) => Math.round(n / step) * step
  return (
    <div className={`fd-num${disabled ? ' fd-num-disabled' : ''}`}>
      <label
        htmlFor={id}
        className="fd-num-label"
        title="Glisser pour changer · double-clic : valeur par défaut"
        onPointerDown={(e) => {
          if (disabled || e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, v: value }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const delta = (e.clientX - d.x) * step * (e.shiftKey ? 10 : 1)
          onChange(clamp(round(d.v + delta / 2), min, max))
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => !disabled && onChange(defaultValue)}
      >
        {abbr && (
          <span className="fd-num-abbr" aria-hidden="true">
            {abbr}
          </span>
        )}
        {label}
      </label>
      <span className="fd-num-input">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : ''}
          disabled={disabled}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(v)) onChange(clamp(v, min, max))
          }}
        />
        {unit && <span className="fd-num-unit">{unit}</span>}
      </span>
    </div>
  )
}
