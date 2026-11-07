import type { DockviewApi } from 'dockview-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createProject } from '../model/project'
import { getProject, saveProject } from '../model/storage'
import { emptyHistory, record, redo as redoHistory, undo as undoHistory, type History } from '../editor/history'
import type { FontProject, Glyph } from '../model/types'
import { DOCUMENT_COMPONENT, HOME_PANEL_ID, documentPanelId } from './layouts'
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

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NARROW)
    window.addEventListener('resize', onResize)
    const pending = timers.current
    return () => {
      window.removeEventListener('resize', onResize)
      pending.forEach((t) => window.clearTimeout(t))
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

  function recordHistory(id: string, char: string, before: Glyph) {
    setHistories((h) => ({ ...h, [id]: record(h[id] ?? emptyHistory(), { char, glyph: before }) }))
  }

  function travel(id: string, dir: 'undo' | 'redo') {
    const p = projects[id]
    if (!p) return
    const h = histories[id] ?? emptyHistory()
    const res = (dir === 'undo' ? undoHistory : redoHistory)(h, (c) => p.glyphs[c])
    if (!res) return
    setHistories((all) => ({ ...all, [id]: res.history }))
    putGlyph(id, res.restore.char, res.restore.glyph)
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
    recordHistory,
    undo: (id) => travel(id, 'undo'),
    redo: (id) => travel(id, 'redo'),
    canUndo: (id) => (histories[id]?.past.length ?? 0) > 0,
    canRedo: (id) => (histories[id]?.future.length ?? 0) > 0,
    selection: (id) => {
      const s = selections[id]
      return s && s.char === selectedChar(id) ? s.keys : []
    },
    setSelection: (id, keys) => setSelections((s) => ({ ...s, [id]: { char: selectedChar(id), keys } })),
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
