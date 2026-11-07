import { useState } from 'react'
import { WordPreview } from '../editor/WordPreview'
import { resolveGlyph } from '../font/composites'
import type { ParsedFont } from '../font/fromOpentype'
import { adjustGlyph, type GlobalAdjust } from '../font/globalAdjust'
import type { FontProject } from '../model/types'
import { Dialog } from '../ui/Dialog'

interface ImportProps {
  parsed: ParsedFont | null
  fileName: string
  onCancel: () => void
  onImport: (versionName: string) => void
}

/** Avant d'importer une police : informations, licence trouvée dans le fichier, nom de la version. */
export function ImportFontDialog({ parsed, fileName, onCancel, onImport }: ImportProps) {
  const info = parsed?.info
  const [name, setName] = useState(() => (info ? `${info.family} (modifiée)` : ''))
  return (
    <Dialog open={!!parsed} title="Modifier une police existante" onClose={onCancel} wide>
      {info && (
        <form
          className="fd-form"
          onSubmit={(e) => {
            e.preventDefault()
            onImport(name.trim() || `${info.family} (modifiée)`)
          }}
        >
          <dl className="fd-dl">
            <dt>Fichier</dt>
            <dd>{fileName}</dd>
            <dt>Famille</dt>
            <dd>
              {info.family} · {info.style}
            </dd>
            <dt>Format</dt>
            <dd>{info.format}</dd>
            <dt>Glyphes</dt>
            <dd>
              {info.glyphCount} (dont {info.unicodeCount} avec un caractère)
            </dd>
          </dl>
          <div className="fd-card-warning fd-notice">
            <strong>Licence de la police.</strong> Ne modifiez que des polices dont la licence le permet (par exemple la licence
            libre OFL). Si la licence l'exige, donnez un nouveau nom à votre version.
          </div>
          <div className="fd-field">
            <span>Licence trouvée dans le fichier</span>
            <p className="fd-license">
              {info.license || info.copyright || 'Aucune licence indiquée dans le fichier : renseignez-vous auprès de son auteur avant de la modifier.'}
              {info.licenseUrl ? `\n${info.licenseUrl}` : ''}
            </p>
          </div>
          <label className="fd-field">
            <span>Nom de votre version</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />
          </label>
          <div className="fd-form-actions">
            <button type="button" className="fd-btn" onClick={onCancel}>
              Annuler
            </button>
            <button type="submit" className="fd-btn fd-btn-primary">
              Importer et ouvrir
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

interface AdjustProps {
  project: FontProject | null
  open: boolean
  onClose: () => void
  onApply: (a: GlobalAdjust) => void
}

/** Édition › Ajuster toute la police : inclinaison et approche globale, avec aperçu. */
export function AdjustFontDialog({ project, open, onClose, onApply }: AdjustProps) {
  const [slant, setSlant] = useState(0)
  const [tracking, setTracking] = useState(0)
  const [text, setText] = useState('Bonjour')
  const adjust = { slant, tracking }
  return (
    <Dialog open={open && !!project} title="Ajuster toute la police" onClose={onClose} wide>
      {project && (
        <form
          className="fd-form"
          onSubmit={(e) => {
            e.preventDefault()
            onApply(adjust)
            setSlant(0)
            setTracking(0)
          }}
        >
          <WordPreview
            text={text}
            size={64}
            metrics={project.metrics}
            glyphOf={(c) => {
              const r = resolveGlyph(project, c)
              return r ? adjustGlyph(r.glyph, adjust) : null
            }}
          />
          <div className="fd-fields-2">
            <label className="fd-field">
              <span>Inclinaison · {slant}°</span>
              <input type="range" min={-20} max={20} step={1} value={slant} onChange={(e) => setSlant(Number(e.target.value))} />
            </label>
            <label className="fd-field">
              <span>Approche globale · {tracking > 0 ? '+' : ''}{tracking} unités</span>
              <input type="range" min={-200} max={400} step={5} value={tracking} onChange={(e) => setTracking(Number(e.target.value))} />
            </label>
            <label className="fd-field">
              <span>Mot test</span>
              <input value={text} maxLength={40} onChange={(e) => setText(e.target.value)} />
            </label>
          </div>
          <p className="fd-muted fd-small">
            S'applique à toutes les lettres de la police. Une seule annulation (Ctrl+Z) revient en arrière.
          </p>
          <div className="fd-form-actions">
            <button type="button" className="fd-btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="fd-btn fd-btn-primary" disabled={!slant && !tracking}>
              Appliquer à toute la police
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
