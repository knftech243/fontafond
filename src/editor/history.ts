/**
 * Historique annuler / rétablir d'une police : chaque entrée est l'état, avant un geste,
 * d'un ou de plusieurs glyphes (réglages globaux = toute la police en une étape).
 */
import type { Glyph } from '../model/types'

export interface HistoryEntry {
  /** Glyphe à afficher après annulation (le premier modifié). */
  char: string
  glyphs: Record<string, Glyph>
}

/** Entrée pour un seul glyphe. */
export const single = (char: string, glyph: Glyph): HistoryEntry => ({ char, glyphs: { [char]: glyph } })

const snapshot = (entry: HistoryEntry, current: (char: string) => Glyph): HistoryEntry => ({
  char: entry.char,
  glyphs: Object.fromEntries(Object.keys(entry.glyphs).map((c) => [c, current(c)])),
})

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
    history: { past: h.past.slice(0, -1), future: [...h.future, snapshot(last, current)] },
    restore: last,
  }
}

export function redo(h: History, current: (char: string) => Glyph): { history: History; restore: HistoryEntry } | null {
  const next = h.future[h.future.length - 1]
  if (!next) return null
  return {
    history: { past: [...h.past, snapshot(next, current)], future: h.future.slice(0, -1) },
    restore: next,
  }
}
