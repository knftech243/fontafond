/** Sauvegarde des documents texte sur l'appareil (IndexedDB, magasin « studios »). */
import { createStore, del, get, set, values, type UseStore } from 'idb-keyval'
import { isStudioDoc, normalizeStudio, type StudioDoc } from './types'

let store: UseStore | null = null
function studios(): UseStore {
  store ??= createStore('fontafond-studios', 'studios')
  return store
}

export interface StudioSummary {
  id: string
  name: string
  text: string
  updatedAt: number
}

export async function listStudios(): Promise<StudioSummary[]> {
  const all = (await values(studios())) as unknown[]
  return all
    .filter(isStudioDoc)
    .map((d) => ({ id: d.id, name: d.name, text: d.text, updatedAt: d.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getStudio(id: string): Promise<StudioDoc | undefined> {
  const d: unknown = await get(id, studios())
  return isStudioDoc(d) ? normalizeStudio(d) : undefined
}

export async function saveStudio(doc: StudioDoc): Promise<StudioDoc> {
  const saved = { ...doc, updatedAt: Date.now() }
  await set(saved.id, saved, studios())
  return saved
}

export async function deleteStudio(id: string): Promise<void> {
  await del(id, studios())
}
