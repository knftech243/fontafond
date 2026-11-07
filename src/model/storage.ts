/**
 * Sauvegarde des projets sur l'appareil (IndexedDB), sans compte ni serveur.
 * Une base « fontafond », un magasin « projects » : clé = id du projet.
 */
import { createStore, del, get, set, values, type UseStore } from 'idb-keyval'
import { isFontProject, summarize, withCharset, withNewIdentity } from './project'
import type { FontProject, ProjectSummary } from './types'

let store: UseStore | null = null
function projects(): UseStore {
  store ??= createStore('fontafond', 'projects')
  return store
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const all = (await values(projects())) as unknown[]
  return all
    .filter(isFontProject)
    .map(summarize)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<FontProject | undefined> {
  const p: unknown = await get(id, projects())
  return isFontProject(p) ? withCharset(p) : undefined
}

/** Enregistre le projet et met à jour sa date de modification. */
export async function saveProject(project: FontProject): Promise<FontProject> {
  const saved = { ...project, updatedAt: Date.now() }
  await set(saved.id, saved, projects())
  return saved
}

export async function deleteProject(id: string): Promise<void> {
  await del(id, projects())
}

export async function renameProject(id: string, name: string): Promise<FontProject | undefined> {
  const p = await getProject(id)
  const clean = name.trim()
  if (!p || !clean) return p
  return saveProject({ ...p, name: clean })
}

export function exportProjectJson(project: FontProject): string {
  return JSON.stringify(project, null, 2)
}

export class InvalidProjectFileError extends Error {
  constructor() {
    super("Ce fichier n'est pas un projet Fontafond valide.")
    this.name = 'InvalidProjectFileError'
  }
}

/** Importe un fichier .json exporté par Fontafond, toujours comme un nouveau projet. */
export async function importProjectJson(text: string): Promise<FontProject> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new InvalidProjectFileError()
  }
  if (!isFontProject(data)) throw new InvalidProjectFileError()
  return saveProject(withNewIdentity(data))
}
