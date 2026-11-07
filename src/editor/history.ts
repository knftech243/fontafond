/** Historique annuler / rétablir d'une police : chaque entrée est l'état d'un glyphe avant un geste. */
import type { Glyph } from '../model/types'

export interface HistoryEntry {
  char: string
  glyph: Glyph
}

export interface History {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

export const HISTORY_LIMIT = 100

export const emptyHistory = (): History => ({ past: [], future: [] })

/** Mémorise l'état d'avant un geste ; tout ce qui pouvait être rétabli est oublié. */
export function record(h: History, before: HistoryEntry, limit = HISTORY_LIMIT): History {
  return { past: [...h.past, before].slice(-limit), future: [] }
}

/** Annule : renvoie l'état à restaurer, et garde l'état courant pour « Rétablir ». */
export function undo(h: History, current: (char: string) => Glyph): { history: History; restore: HistoryEntry } | null {
  const last = h.past[h.past.length - 1]
  if (!last) return null
  return {
    history: { past: h.past.slice(0, -1), future: [...h.future, { char: last.char, glyph: current(last.char) }] },
    restore: last,
  }
}

export function redo(h: History, current: (char: string) => Glyph): { history: History; restore: HistoryEntry } | null {
  const next = h.future[h.future.length - 1]
  if (!next) return null
  return {
    history: { past: [...h.past, { char: next.char, glyph: current(next.char) }], future: h.future.slice(0, -1) },
    restore: next,
  }
}
