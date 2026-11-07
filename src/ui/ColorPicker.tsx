import { useState } from 'react'
import { RgbaColorPicker } from 'react-colorful'
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv } from './color'
import { NumberField } from './NumberField'

interface Props {
  /** Couleur #rrggbb. */
  color: string
  /** Opacité 0 à 1 ; absente = pas de réglage d'opacité. */
  alpha?: number
  onChange: (hex: string, alpha?: number) => void
}

/**
 * Sélecteur de couleur standard des logiciels de création : carré saturation / luminosité,
 * barre de teinte, barre d'opacité, champs HEX, R V B, T S V et opacité, synchronisés.
 */
export function ColorPicker({ color, alpha, onChange }: Props) {
  const rgb = hexToRgb(color) ?? { r: 0, g: 0, b: 0 }
  const hsv = rgbToHsv(rgb)
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const a = alpha ?? 1
  const set = (hex: string, al: number | undefined = alpha) => onChange(hex, al)

  return (
    <div className={`fd-picker${alpha === undefined ? ' fd-picker-noalpha' : ''}`}>
      <RgbaColorPicker
        color={{ ...rgb, a }}
        onChange={(c) => set(rgbToHex(c), alpha === undefined ? undefined : Math.round(c.a * 100) / 100)}
      />
      <label className="fd-hex">
        <span>HEX</span>
        <input
          value={hexDraft ?? color.replace('#', '').toUpperCase()}
          maxLength={7}
          spellCheck={false}
          aria-label="Couleur hexadécimale"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value
            setHexDraft(v)
            const n = /^#?[0-9a-f]{6}$/i.test(v.trim()) ? normalizeHex(v) : null
            if (n) set(n)
          }}
          onBlur={() => {
            const n = hexDraft ? normalizeHex(hexDraft) : null
            if (n) set(n)
            setHexDraft(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
      <div className="fd-picker-fields">
        <NumberField label="R" value={rgb.r} min={0} max={255} defaultValue={0} onChange={(r) => set(rgbToHex({ ...rgb, r }))} />
        <NumberField label="V" value={rgb.g} min={0} max={255} defaultValue={0} onChange={(g) => set(rgbToHex({ ...rgb, g }))} />
        <NumberField label="B" value={rgb.b} min={0} max={255} defaultValue={0} onChange={(b) => set(rgbToHex({ ...rgb, b }))} />
        <NumberField label="T" value={hsv.h} min={0} max={359} unit="°" defaultValue={0} onChange={(h) => set(rgbToHex(hsvToRgb({ ...hsv, h })))} />
        <NumberField label="S" value={hsv.s} min={0} max={100} unit="%" defaultValue={0} onChange={(s) => set(rgbToHex(hsvToRgb({ ...hsv, s })))} />
        <NumberField label="L" value={hsv.v} min={0} max={100} unit="%" defaultValue={0} onChange={(v) => set(rgbToHex(hsvToRgb({ ...hsv, v })))} />
      </div>
      {alpha !== undefined && (
        <NumberField
          label="Opacité"
          value={Math.round(a * 100)}
          min={0}
          max={100}
          unit="%"
          defaultValue={100}
          onChange={(o) => set(color, o / 100)}
        />
      )}
    </div>
  )
}
