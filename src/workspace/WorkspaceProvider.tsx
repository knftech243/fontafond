import type { DockviewApi } from 'dockview-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createProject } from '../model/project'
import { getProject, saveProject } from '../model/storage'
import { emptyHistory, record, redo as redoHistory, single, undo as undoHistory, type History } from '../editor/history'
import type { FontProject, Glyph } from '../model/types'
import { DOCUMENT_COMPONENT, HOME_PANEL_ID, STUDIO_COMPONENT, documentPanelId, studioPanelId } from './layouts'
import { getStudio, saveStudio } from '../text/studioStorage'
import { createStudio as newStudioDoc, type StudioDoc } from '../text/types'
import { EMPTY_HISTORY, pushChange, type StudioHistory } from '../text/history'
import { documentPosition } from './positions'
import {
  DEFAULT_TOOL_OPTIONS,
  FIT_VIEW,
  WorkspaceContext,
  type SaveState,
  type Tool,
  type ToolOptions,
  type ViewState,
  type WorkspaceValue,
} from './workspaceContext'

const NARROW = 860

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const apiRef = useRef<DockviewApi | null>(null)
  const [api, setApiState] = useState<DockviewApi | null>(null)
  const [projects, setProjects] = useState<Record<string, FontProject | null>>({})
  const loading = useRef(new Set<string>())
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const timers = useRef(new Map<string, number>())
  const [listVersion, setListVersion] = useState(0)
  const [tool, setTool] = useState<Tool>('hand')
  const [views, setViews] = useState<Record<string, ViewState>>({})
  const [narrow, setNarrow] = useState(() => window.innerWidth < NARROW)
  const [toolOptions, setToolOptionsState] = useState<ToolOptions>(DEFAULT_TOOL_OPTIONS)
  const [histories, setHistories] = useState<Record<string, History>>({})
  const [selections, setSelections] = useState<Record<string, { char: string; keys: string[] }>>({})
  const [studios, setStudios] = useState<Record<string, StudioDoc | null>>({})
  const loadingStudios = useRef(new Set<string>())
  const [activeStudioId, setActiveStudioId] = useState<string | null>(null)
  const [activeKind, setActiveKind] = useState<'font' | 'studio' | null>(null)
  const studioTimers = useRef(new Map<string, number>())
  const [studioHistory, setStudioHistory] = useState<Record<string, StudioHistory>>({})

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NARROW)
    window.addEventListener('resize', onResize)
    const pending = timers.current
    const pendingStudios = studioTimers.current
    return () => {
      window.removeEventListener('resize', onResize)
      pending.forEach((t) => window.clearTimeout(t))
      pendingStudios.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const setApi = useCallback((a: DockviewApi) => {
    apiRef.current = a
    setApiState(a)
  }, [])

  const loadProject = useCallback((id: string) => {
    if (loading.current.has(id)) return
    loading.current.add(id)
    getProject(id).then(
      (p) => setProjects((s) => ({ ...s, [id]: p ?? null })),
      () => setProjects((s) => ({ ...s, [id]: null })),
    )
  }, [])

  const loadStudio = useCallback((id: string) => {
    if (loadingStudios.current.has(id)) return
    loadingStudios.current.add(id)
    getStudio(id).then(
      (d) => setStudios((s) => ({ ...s, [id]: d ?? null })),
      () => setStudios((s) => ({ ...s, [id]: null })),
    )
  }, [])

  const openStudio = useCallback(
    (id: string, name: string) => {
      const a = apiRef.current
      if (!a) return
      loadStudio(id)
      const panelId = studioPanelId(id)
      const existing = a.getPanel(panelId)
      if (existing) {
        existing.api.setActive()
        return
      }
      const position = documentPosition(a)
      a.addPanel({ id: panelId, component: STUDIO_COMPONENT, title: name, params: { studioId: id }, ...(position ? { position } : {}) })
      a.getPanel(HOME_PANEL_ID)?.api.close()
    },
    [loadStudio],
  )

  function persistStudio(id: string, doc: StudioDoc) {
    setSaveState('saving')
    window.clearTimeout(studioTimers.current.get(id))
    studioTimers.current.set(
      id,
      window.setTimeout(() => {
        saveStudio(doc).then(
          () => setSaveState('saved'),
          () => setSaveState('error'),
        )
      }, 400),
    )
  }

  function travelStudio(id: string, dir: 'undo' | 'redo') {
    const cur = studios[id]
    const h = studioHistory[id]
    if (!cur || !h) return
    const from = dir === 'undo' ? h.past : h.future
    const target = from[from.length - 1]
    if (!target) return
    const rest = from.slice(0, -1)
    setStudioHistory((all) => ({
      ...all,
      [id]: dir === 'undo' ? { past: rest, future: [...h.future, cur], at: 0, sig: '' } : { past: [...h.past, cur], future: rest, at: 0, sig: '' },
    }))
    setStudios((s) => ({ ...s, [id]: target }))
    if (target.name !== cur.name) apiRef.current?.getPanel(studioPanelId(id))?.api.setTitle(target.name)
    persistStudio(id, target)
  }

  const openProject = useCallback(
    (id: string, name: string) => {
      const a = apiRef.current
      if (!a) return
      loadProject(id)
      const panelId = documentPanelId(id)
      const existing = a.getPanel(panelId)
      if (existing) {
        existing.api.setActive()
        return
      }
      const position = documentPosition(a)
      a.addPanel({
        id: panelId,
        component: DOCUMENT_COMPONENT,
        title: name,
        params: { projectId: id },
        ...(position ? { position } : {}),
      })
      a.getPanel(HOME_PANEL_ID)?.api.close()
    },
    [loadProject],
  )

  function updateProject(id: string, change: (p: FontProject) => FontProject) {
    const cur = projects[id]
    if (!cur) return
    const next = change(cur)
    setProjects((s) => ({ ...s, [id]: next }))
    if (next.name !== cur.name) apiRef.current?.getPanel(documentPanelId(id))?.api.setTitle(next.name)
    setSaveState('saving')
    window.clearTimeout(timers.current.get(id))
    timers.current.set(
      id,
      window.setTimeout(() => {
        saveProject(next).then(
          () => setSaveState('saved'),
          () => setSaveState('error'),
        )
      }, 400),
    )
  }

  const selectedChar = (id: string) => selected[id] ?? 'A'

  function putGlyph(id: string, char: string, glyph: Glyph) {
    updateProject(id, (p) => ({ ...p, glyphs: { ...p.glyphs, [char]: { ...glyph, updatedAt: Date.now() } } }))
  }

  function putGlyphs(id: string, changed: Record<string, Glyph>) {
    const now = Date.now()
    updateProject(id, (p) => {
      const glyphs = { ...p.glyphs }
      for (const [c, g] of Object.entries(changed)) glyphs[c] = { ...g, updatedAt: now }
      return { ...p, glyphs }
    })
  }

  function recordHistory(id: string, char: string, before: Glyph) {
    setHistories((h) => ({ ...h, [id]: record(h[id] ?? emptyHistory(), single(char, before)) }))
  }

  function travel(id: string, dir: 'undo' | 'redo') {
    const p = projects[id]
    if (!p) return
    const h = histories[id] ?? emptyHistory()
    const res = (dir === 'undo' ? undoHistory : redoHistory)(h, (c) => p.glyphs[c])
    if (!res) return
    setHistories((all) => ({ ...all, [id]: res.history }))
    putGlyphs(id, res.restore.glyphs)
    setSelected((s) => ({ ...s, [id]: res.restore.char }))
    setSelections((s) => ({ ...s, [id]: { char: res.restore.char, keys: [] } }))
  }

  const value: WorkspaceValue = {
    api,
    setApi,
    projects,
    loadProject,
    activeProjectId,
    setActiveProjectId,
    selectedChar,
    selectChar: (id, char) => {
      setSelected((s) => ({ ...s, [id]: char }))
      setSelections((s) => ({ ...s, [id]: { char, keys: [] } }))
    },
    saveState,
    updateProject,
    openProject,
    createAndOpen: async (name) => {
      const p = await saveProject(createProject(name))
      loading.current.add(p.id)
      setProjects((s) => ({ ...s, [p.id]: p }))
      setListVersion((v) => v + 1)
      openProject(p.id, p.name)
    },
    closeProject: (id) => apiRef.current?.getPanel(documentPanelId(id))?.api.close(),
    onProjectRenamed: (id, name) => {
      apiRef.current?.getPanel(documentPanelId(id))?.api.setTitle(name)
      setProjects((s) => (s[id] ? { ...s, [id]: { ...s[id], name } } : s))
    },
    onProjectDeleted: (id) => {
      apiRef.current?.getPanel(documentPanelId(id))?.api.close()
      loading.current.delete(id)
      setProjects((s) => {
        const next = { ...s }
        delete next[id]
        return next
      })
    },
    listVersion,
    bumpList: () => setListVersion((v) => v + 1),
    tool,
    setTool,
    view: (id) => views[id] ?? FIT_VIEW,
    setView: (id, change) => setViews((s) => ({ ...s, [id]: change(s[id] ?? FIT_VIEW) })),
    narrow,
    toolOptions,
    setToolOptions: (patch) => setToolOptionsState((o) => ({ ...o, ...patch })),
    editGlyph: (id, char, change, rec = true) => {
      const g = projects[id]?.glyphs[char]
      if (!g) return
      const next = change(g)
      if (next === g) return
      if (rec) recordHistory(id, char, g)
      putGlyph(id, char, next)
    },
    editGlyphs: (id, change) => {
      const p = projects[id]
      if (!p) return
      const next = change(p.glyphs)
      const before: Record<string, Glyph> = {}
      const after: Record<string, Glyph> = {}
      for (const [c, g] of Object.entries(next)) {
        if (g !== p.glyphs[c]) {
          before[c] = p.glyphs[c]
          after[c] = g
        }
      }
      const chars = Object.keys(after)
      if (chars.length === 0) return
      const focus = chars.includes(selectedChar(id)) ? selectedChar(id) : chars[0]
      setHistories((h) => ({ ...h, [id]: record(h[id] ?? emptyHistory(), { char: focus, glyphs: before }) }))
      putGlyphs(id, after)
    },
    recordHistory,
    undo: (id) => travel(id, 'undo'),
    redo: (id) => travel(id, 'redo'),
    canUndo: (id) => (histories[id]?.past.length ?? 0) > 0,
    canRedo: (id) => (histories[id]?.future.length ?? 0) > 0,
    selection: (id) => {
      const s = selections[id]
      return s && s.char === selectedChar(id) ? s.keys : []
    },
    studios,
    loadStudio,
    activeStudioId,
    activeKind,
    setActiveDoc: (kind, id) => {
      setActiveKind(kind)
      if (kind === 'studio') setActiveStudioId(id)
      if (kind === 'font') setActiveProjectId(id)
    },
    createStudio: async (name, fontId) => {
      const d = await saveStudio(newStudioDoc(name, fontId))
      loadingStudios.current.add(d.id)
      setStudios((s) => ({ ...s, [d.id]: d }))
      setListVersion((v) => v + 1)
      openStudio(d.id, d.name)
    },
    openStudio,
    updateStudio: (id, change) => {
      const cur = studios[id]
      if (!cur) return
      const next = change(cur)
      if (next === cur) return
      const now = Date.now()
      // Changements rapprochés (frappe, glisser d'un curseur) = une seule étape d'annulation.
      setStudioHistory((all) => {
        return { ...all, [id]: pushChange(all[id] ?? EMPTY_HISTORY, cur, next, now) }
      })
      setStudios((s) => ({ ...s, [id]: next }))
      if (next.name !== cur.name) apiRef.current?.getPanel(studioPanelId(id))?.api.setTitle(next.name)
      persistStudio(id, next)
    },
    undoStudio: (id) => travelStudio(id, 'undo'),
    redoStudio: (id) => travelStudio(id, 'redo'),
    canUndoStudio: (id) => (studioHistory[id]?.past.length ?? 0) > 0,
    canRedoStudio: (id) => (studioHistory[id]?.future.length ?? 0) > 0,
    onStudioDeleted: (id) => {
      apiRef.current?.getPanel(studioPanelId(id))?.api.close()
      loadingStudios.current.delete(id)
      setStudios((s) => {
        const next = { ...s }
        delete next[id]
        return next
      })
    },
    setSelection: (id, keys) => setSelections((s) => ({ ...s, [id]: { char: selectedChar(id), keys } })),
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
