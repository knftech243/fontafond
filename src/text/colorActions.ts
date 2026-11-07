/** Couleurs de premier plan (texte) et d'arrière-plan (fond du plan de travail), comme dans Photoshop. */
import type { StudioDoc } from './types'

/** X : inverse premier plan et arrière-plan (un fond transparent devient blanc). */
export function swapColors(d: StudioDoc): StudioDoc {
  return { ...d, char: { ...d.char, color: d.artboard.background ?? '#ffffff' }, artboard: { ...d.artboard, background: d.char.color } }
}

/** D : premier plan noir, arrière-plan blanc. */
export function resetColors(d: StudioDoc): StudioDoc {
  return { ...d, char: { ...d.char, color: '#000000' }, artboard: { ...d.artboard, background: '#ffffff' } }
}
