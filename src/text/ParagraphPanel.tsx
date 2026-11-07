import { PanelBody } from '../ui/AppShell'
import { Icon, type IconName } from '../ui/Icon'
import { NumberField } from '../ui/NumberField'
import { NoStudio } from './CharacterPanel'
import type { Align, ParagraphStyle, TextMode } from './types'
import { useActiveStudio } from './useActiveStudio'

const ALIGNS: { id: Align; icon: IconName; label: string }[] = [
  { id: 'left', icon: 'alignLeft', label: 'Aligné à gauche' },
  { id: 'center', icon: 'alignCenter', label: 'Centré' },
  { id: 'right', icon: 'alignRight', label: 'Aligné à droite' },
  { id: 'justify-left', icon: 'justifyLeft', label: 'Justifié, dernière ligne à gauche' },
  { id: 'justify-center', icon: 'justifyCenter', label: 'Justifié, dernière ligne centrée' },
  { id: 'justify-right', icon: 'justifyRight', label: 'Justifié, dernière ligne à droite' },
  { id: 'justify-all', icon: 'justifyAll', label: 'Tout justifié' },
]

const MODES: { id: TextMode; label: string }[] = [
  { id: 'point', label: 'Texte de point' },
  { id: 'paragraph', label: 'Texte de paragraphe' },
]

/** Panneau Paragraphe : alignement, justification, retraits et espacements. */
export function ParagraphPanel() {
  const { doc, update } = useActiveStudio()
  if (!doc) return <NoStudio what="ses paragraphes" />
  const p = doc.para
  const set = (patch: Partial<ParagraphStyle>) => update((d) => ({ ...d, para: { ...d.para, ...patch } }))

  return (
    <PanelBody>
      <div className="fd-panel-pad fd-type-panel">
        <div className="fd-segmented" role="radiogroup" aria-label="Type de texte">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={doc.mode === m.id}
              onClick={() => update((d) => ({ ...d, mode: m.id }))}
            >
              {m.label}
            </button>
          ))}
        </div>
        {doc.mode === 'paragraph' && (
          <NumberField
            label="Largeur du cadre"
            value={doc.frameWidth}
            min={40}
            max={20000}
            unit="px"
            defaultValue={800}
            onChange={(frameWidth) => update((d) => ({ ...d, frameWidth }))}
          />
        )}

        <div className="fd-toggle-row" role="radiogroup" aria-label="Alignement">
          {ALIGNS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              className="fd-toggle"
              aria-checked={p.align === a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => set({ align: a.id })}
            >
              <Icon name={a.icon} />
            </button>
          ))}
        </div>
        {doc.mode === 'point' && p.align.startsWith('justify') && (
          <p className="fd-muted fd-small" role="status">
            La justification s'applique au texte de paragraphe : tracez un cadre avec l'outil Texte, ou choisissez « Texte de paragraphe ».
          </p>
        )}

        <div className="fd-num-grid">
          <NumberField label="Retrait gauche" abbr="→|" value={p.indentLeft} min={-2000} max={2000} unit="px" defaultValue={0} onChange={(indentLeft) => set({ indentLeft })} />
          <NumberField label="Retrait droit" abbr="|←" value={p.indentRight} min={-2000} max={2000} unit="px" defaultValue={0} onChange={(indentRight) => set({ indentRight })} />
          <NumberField label="Retrait 1re ligne" abbr="↦" value={p.indentFirst} min={-2000} max={2000} unit="px" defaultValue={0} onChange={(indentFirst) => set({ indentFirst })} />
          <NumberField label="Espace avant" abbr="↥" value={p.spaceBefore} min={0} max={2000} unit="px" defaultValue={0} onChange={(spaceBefore) => set({ spaceBefore })} />
          <NumberField label="Espace après" abbr="↧" value={p.spaceAfter} min={0} max={2000} unit="px" defaultValue={0} onChange={(spaceAfter) => set({ spaceAfter })} />
        </div>
        <p className="fd-muted fd-small">Pas de césure (coupure des mots par un tiret) dans cette version.</p>
      </div>
    </PanelBody>
  )
}
