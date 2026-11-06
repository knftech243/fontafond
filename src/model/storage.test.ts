import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createProject, summarize } from './project'
import {
  InvalidProjectFileError,
  deleteProject,
  exportProjectJson,
  getProject,
  importProjectJson,
  listProjects,
  renameProject,
  saveProject,
} from './storage'

beforeEach(async () => {
  for (const p of await listProjects()) await deleteProject(p.id)
})

describe('stockage des projets (IndexedDB)', () => {
  it('enregistre, relit et liste un projet', async () => {
    const p = await saveProject(createProject('Ma Police Manuscrite'))
    const back = await getProject(p.id)
    expect(back?.name).toBe('Ma Police Manuscrite')
    expect(back?.glyphs['é']).toBeDefined()
    const list = await listProjects()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: p.id, drawn: 0 })
    expect(list[0].total).toBe(summarize(p).total)
  })

  it('compte les glyphes dessinés', async () => {
    const p = createProject('Test')
    p.glyphs.A.contours = [{ points: [{ x: 0, y: 0, type: 'on' }, { x: 100, y: 700, type: 'on' }, { x: 200, y: 0, type: 'on' }] }]
    await saveProject(p)
    expect((await listProjects())[0].drawn).toBe(1)
  })

  it('renomme et supprime', async () => {
    const p = await saveProject(createProject('Avant'))
    await renameProject(p.id, '  Après  ')
    expect((await getProject(p.id))?.name).toBe('Après')
    await deleteProject(p.id)
    expect(await getProject(p.id)).toBeUndefined()
  })

  it('exporte puis réimporte en .json comme un nouveau projet', async () => {
    const p = await saveProject(createProject('Export'))
    const copy = await importProjectJson(exportProjectJson(p))
    expect(copy.id).not.toBe(p.id)
    expect(copy.name).toBe('Export')
    expect(await listProjects()).toHaveLength(2)
  })

  it('refuse un fichier qui n’est pas un projet', async () => {
    await expect(importProjectJson('pas du json')).rejects.toBeInstanceOf(InvalidProjectFileError)
    await expect(importProjectJson('{"version":1}')).rejects.toBeInstanceOf(InvalidProjectFileError)
  })
})
