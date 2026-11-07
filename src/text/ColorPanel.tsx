import { useEffect, useState } from 'react'
import { PanelBody } from '../ui/AppShell'
import { BRAND_SWATCHES, normalizeHex } from '../ui/color'
import { ColorPicker } from '../ui/ColorPicker'
import { Icon } from '../ui/Icon'
import { addRecent, addSaved, loadSwatches, removeSaved } from '../ui/swatches'
import { NoStudio } from './CharacterPanel'
import { resetColors, swapColors } from './colorActions'
import { useActiveStudio } from './useActiveStudio'

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>
}
type EyeDropperCtor = new () => EyeDropperLike

/** Panneau Couleur : premier plan (texte) et arrière-plan (fond du plan de travail). */
export function ColorPanel() {
  const { doc, update } = useActiveStudio()
  const [target, setTarget] = useState<'fg' | 'bg'>('fg')
  const [swatches, setSwatches] = useState(loadSwatches)
  const [hint, setHint] = useState<string | null>(null)

  const fg = doc?.char.color
  const bg = doc?.artboard.background
  // Couleurs récentes : mémorisées une seconde après le dernier changement (pas à chaque mouvement).
  useEffect(() => {
    const c = target === 'fg' ? fg : bg
    if (!c) return
    const t = window.setTimeout(() => setSwatches((s) => addRecent(s, c)), 1000)
    return () => window.clearTimeout(t)
  }, [fg, bg, target])

  if (!doc) return <NoStudio what="ses couleurs" />
  const current = target === 'fg' ? doc.char.color : (doc.artboard.background ?? '#ffffff')
  const apply = (hex: string, alpha?: number) =>
    update((d) =>
      target === 'fg'
        ? { ...d, char: { ...d.char, color: hex, opacity: alpha ?? d.char.opacity } }
        : { ...d, artboard: { ...d.artboard, background: hex } },
    )

  const pick = async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
    if (!Ctor) {
      setHint('La pipette n’est disponible que dans Chrome et Edge sur ordinateur. Saisissez la couleur en HEX ou choisissez-la dans le nuancier.')
      return
    }
    try {
      const { sRGBHex } = await new Ctor().open()
      const hex = normalizeHex(sRGBHex)
      if (hex) apply(hex)
      setHint(null)
    } catch {
      // Prélèvement annulé (Échap) : rien à faire.
    }
  }

  const swatch = (c: string, removable = false) => (
    <button
      key={c}
      type="button"
      className="fd-swatch"
      style={{ background: c }}
      title={removable ? `${c.toUpperCase()} · clic droit : retirer du nuancier` : c.toUpperCase()}
      aria-label={`Couleur ${c.toUpperCase()}`}
      onClick={() => apply(c)}
      onContextMenu={(e) => {
        if (!removable) return
        e.preventDefault()
        setSwatches((s) => removeSaved(s, c))
      }}
    />
  )

  return (
    <PanelBody>
      <div className="fd-panel-pad fd-type-panel">
        <div className="fd-fgbg-row">
          <div className="fd-fgbg" role="radiogroup" aria-label="Couleur à modifier">
            <button
              type="button"
              role="radio"
              aria-checked={target === 'bg'}
              className={`fd-fgbg-bg${doc.artboard.background ? '' : ' fd-transparent'}`}
              style={doc.artboard.background ? { background: doc.artboard.background } : undefined}
              aria-label="Arrière-plan (fond du plan de travail)"
              title="Arrière-plan : fond du plan de travail"
              onClick={() => setTarget('bg')}
            />
            <button
              type="button"
              role="radio"
              aria-checked={target === 'fg'}
              className="fd-fgbg-fg"
              style={{ background: doc.char.color }}
              aria-label="Premier plan (couleur du texte)"
              title="Premier plan : couleur du texte"
              onClick={() => setTarget('fg')}
            />
          </div>
          <div className="fd-fgbg-actions">
            <button type="button" className="fd-icon-btn" title="Inverser les couleurs (X)" aria-label="Inverser premier plan et arrière-plan (X)" onClick={() => update(swapColors)}>
              <Icon name="swap" />
            </button>
            <button type="button" className="fd-btn fd-btn-sm" title="Noir et blanc (D)" onClick={() => update(resetColors)}>
              Noir / blanc
            </button>
            <button type="button" className="fd-icon-btn" title="Pipette : prélever une couleur à l'écran" aria-label="Pipette" onClick={pick}>
              <Icon name="eyedropper" />
            </button>
          </div>
        </div>
        <p className="fd-small fd-strong">{target === 'fg' ? 'Premier plan · texte' : 'Arrière-plan · fond du plan de travail'}</p>
        {target === 'bg' && (
          <label className="fd-opt fd-small">
            <input
              type="checkbox"
              checked={doc.artboard.background === null}
              onChange={(e) => update((d) => ({ ...d, artboard: { ...d.artboard, background: e.target.checked ? null : '#ffffff' } }))}
            />
            Fond transparent
          </label>
        )}

        <ColorPicker color={current} alpha={target === 'fg' ? doc.char.opacity : undefined} onChange={apply} />
        {hint && (
          <p className="fd-muted fd-small" role="status">
            {hint}
          </p>
        )}

        <div className="fd-swatch-block">
          <span className="fd-small fd-muted">Charte</span>
          <div className="fd-swatches">{BRAND_SWATCHES.map((c) => swatch(c))}</div>
          <span className="fd-small fd-muted">Nuancier</span>
          <div className="fd-swatches">
            {swatches.saved.map((c) => swatch(c, true))}
            <button
              type="button"
              className="fd-swatch fd-swatch-add"
              aria-label="Ajouter la couleur actuelle au nuancier"
              title="Ajouter la couleur actuelle au nuancier"
              onClick={() => setSwatches((s) => addSaved(s, current))}
            >
              +
            </button>
          </div>
          {swatches.recent.length > 0 && (
            <>
              <span className="fd-small fd-muted">Récentes</span>
              <div className="fd-swatches">{swatches.recent.map((c) => swatch(c))}</div>
            </>
          )}
        </div>
      </div>
    </PanelBody>
  )
}
