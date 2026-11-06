import type { SerializedDockview } from 'dockview-react'
import { describe, expect, it } from 'vitest'
import { parseAppearance } from '../theme/appearance'
import {
  deleteCustomWorkspace,
  isSerializedDockview,
  loadCurrentLayout,
  loadCustomWorkspaces,
  saveCurrentLayout,
  saveCustomWorkspace,
  stripDocuments,
} from './layouts'

class MemoryStorage implements Storage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
}

const sample = (): SerializedDockview => ({
  grid: {
    root: {
      type: 'branch',
      data: [
        { type: 'leaf', data: { id: '1', views: ['home', 'doc:a', 'doc:b'], activeView: 'doc:b' }, size: 900 },
        {
          type: 'branch',
          data: [
            { type: 'leaf', data: { id: '2', views: ['glyphs'], activeView: 'glyphs' }, size: 500 },
            { type: 'leaf', data: { id: '3', views: ['glyph', 'metrics'], activeView: 'metrics' }, size: 300 },
          ],
          size: 340,
        },
      ],
      size: 800,
    },
    width: 1240,
    height: 800,
    orientation: 'HORIZONTAL' as SerializedDockview['grid']['orientation'],
  },
  panels: {
    home: { id: 'home', contentComponent: 'home', title: 'Accueil' },
    'doc:a': { id: 'doc:a', contentComponent: 'document', title: 'A', params: { projectId: 'a' } },
    'doc:b': { id: 'doc:b', contentComponent: 'document', title: 'B', params: { projectId: 'b' } },
    glyphs: { id: 'glyphs', contentComponent: 'glyphs', title: 'Glyphes' },
    glyph: { id: 'glyph', contentComponent: 'glyph', title: 'Glyphe sélectionné' },
    metrics: { id: 'metrics', contentComponent: 'metrics', title: 'Métriques' },
  },
  activeGroup: '1',
})

describe('stripDocuments', () => {
  it('retire les documents et garde un onglet Accueil à leur place', () => {
    const out = stripDocuments(sample())
    expect(Object.keys(out.panels).sort()).toEqual(['glyph', 'glyphs', 'home', 'metrics'])
    const leaf = (out.grid.root.data as { data: { views: string[]; activeView?: string } }[])[0].data
    expect(leaf.views).toEqual(['home'])
    expect(leaf.activeView).toBe('home')
  })

  it('ne touche pas aux panneaux et ne modifie pas la disposition d’origine', () => {
    const src = sample()
    stripDocuments(src)
    expect(Object.keys(src.panels)).toContain('doc:a')
  })

  it('traite aussi les documents placés dans une fenêtre flottante', () => {
    const src = sample()
    src.floatingGroups = [{ data: { id: '9', views: ['doc:a'], activeView: 'doc:a' }, position: { left: 10, top: 10, width: 300, height: 200 } }]
    ;(src.grid.root.data as { data: { views: string[] } }[])[0].data.views = ['doc:b']
    const out = stripDocuments(src)
    const leaf = (out.grid.root.data as { data: { views: string[] } }[])[0].data
    expect(leaf.views).toEqual(['home'])
    expect(out.floatingGroups?.[0].data?.views).toEqual([])
  })
})

describe('sauvegarde des dispositions', () => {
  it('enregistre et relit la disposition courante', () => {
    const store = new MemoryStorage()
    expect(loadCurrentLayout(store)).toBeNull()
    saveCurrentLayout(sample(), store)
    expect(loadCurrentLayout(store)?.panels['doc:a']).toBeDefined()
  })

  it('ignore une disposition abîmée', () => {
    const store = new MemoryStorage()
    store.setItem('fontafond.layout.v1', '{pas du json')
    expect(loadCurrentLayout(store)).toBeNull()
    store.setItem('fontafond.layout.v1', '{"grid":{}}')
    expect(loadCurrentLayout(store)).toBeNull()
    expect(isSerializedDockview(sample())).toBe(true)
  })

  it('enregistre, remplace et supprime un espace de travail personnalisé', () => {
    const store = new MemoryStorage()
    saveCustomWorkspace('Mon atelier', sample(), store)
    saveCustomWorkspace('mon atelier', sample(), store)
    const list = loadCustomWorkspaces(store)
    expect(list).toHaveLength(1)
    expect(list[0].layout.panels['doc:a']).toBeUndefined()
    expect(deleteCustomWorkspace('mon atelier', store)).toHaveLength(0)
  })

  it('fonctionne sans stockage (navigation privée)', () => {
    expect(loadCurrentLayout(null)).toBeNull()
    expect(saveCurrentLayout(sample(), null)).toBe(false)
  })
})

describe('apparence', () => {
  it('revient aux valeurs par défaut pour toute valeur inconnue', () => {
    expect(parseAppearance(null)).toEqual({ theme: 'dark', uiSize: 'medium', canvas: 'dark' })
    expect(parseAppearance('{"theme":"violet","uiSize":"large","canvas":"grey"}')).toEqual({
      theme: 'dark',
      uiSize: 'large',
      canvas: 'grey',
    })
    expect(parseAppearance('oups')).toEqual({ theme: 'dark', uiSize: 'medium', canvas: 'dark' })
  })
})
