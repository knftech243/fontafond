/** Historique du Studio : les changements rapprochés d'un même réglage forment une seule étape d'annulation. */
import type { StudioDoc } from './types'

export const COALESCE_MS = 600

/** Signature des réglages modifiés entre deux états (ex. « char.size », « text »). */
export function changedKeys(a: StudioDoc, b: StudioDoc): string {
  const keys: string[] = []
  for (const k of Object.keys(b) as (keyof StudioDoc)[]) {
    if (k === 'updatedAt' || a[k] === b[k]) continue
    const va = a[k]
    const vb = b[k]
    if (va && vb && typeof va === 'object' && typeof vb === 'object') {
      for (const sub of Object.keys(vb)) {
        if ((va as Record<string, unknown>)[sub] !== (vb as Record<string, unknown>)[sub]) keys.push(`${k}.${sub}`)
      }
    } else keys.push(k)
  }
  return keys.sort().join(',')
}

export interface StudioHistory {
  past: StudioDoc[]
  future: StudioDoc[]
  at: number
  sig: string
}

export const EMPTY_HISTORY: StudioHistory = { past: [], future: [], at: 0, sig: '' }

/** Ajoute un changement : nouvelle étape, sauf si c'est le même réglage modifié il y a moins de 600 ms. */
export function pushChange(h: StudioHistory, before: StudioDoc, after: StudioDoc, now: number, limit = 100): StudioHistory {
  const sig = changedKeys(before, after)
  const merge = now - h.at <= COALESCE_MS && sig === h.sig && h.past.length > 0
  return { past: merge ? h.past : [...h.past, before].slice(-limit), future: [], at: now, sig }
}
