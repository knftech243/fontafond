/** Nuancier mémorisé sur l'appareil : couleurs enregistrées et 10 couleurs récentes. */
import { normalizeHex } from './color'

export interface Swatches {
  saved: string[]
  recent: string[]
}

const KEY = 'fontafond.swatches.v1'
const MAX_RECENT = 10
const MAX_SAVED = 40

function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const clean = (list: unknown, max: number): string[] =>
  Array.isArray(list) ? [...new Set(list.map((c) => (typeof c === 'string' ? normalizeHex(c) : null)).filter((c): c is string => !!c))].slice(0, max) : []

export function loadSwatches(s: Storage | null = store()): Swatches {
  try {
    const raw = s?.getItem(KEY)
    const v = raw ? (JSON.parse(raw) as Partial<Swatches>) : {}
    return { saved: clean(v.saved, MAX_SAVED), recent: clean(v.recent, MAX_RECENT) }
  } catch {
    return { saved: [], recent: [] }
  }
}

function save(v: Swatches, s: Storage | null): Swatches {
  try {
    s?.setItem(KEY, JSON.stringify(v))
  } catch {
    // Stockage indisponible (navigation privée) : le nuancier reste en mémoire.
  }
  return v
}

export function addRecent(v: Swatches, hex: string, s: Storage | null = store()): Swatches {
  const c = normalizeHex(hex)
  if (!c || v.recent[0] === c) return v
  return save({ ...v, recent: [c, ...v.recent.filter((x) => x !== c)].slice(0, MAX_RECENT) }, s)
}

export function addSaved(v: Swatches, hex: string, s: Storage | null = store()): Swatches {
  const c = normalizeHex(hex)
  if (!c || v.saved.includes(c)) return v
  return save({ ...v, saved: [...v.saved, c].slice(-MAX_SAVED) }, s)
}

export function removeSaved(v: Swatches, hex: string, s: Storage | null = store()): Swatches {
  return save({ ...v, saved: v.saved.filter((x) => x !== hex) }, s)
}
