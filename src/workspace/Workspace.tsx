import {
  DockviewReact,
  themeDark,
  type DockviewApi,
  type DockviewReadyEvent,
  type DockviewTheme,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { unicodeLabel } from '../model/defaultCharset'
import { InvalidProjectFileError, exportProjectJson, importProjectJson } from '../model/storage'
import {
  CANVAS_LABELS,
  THEME_LABELS,
  UI_SIZE_LABELS,
  applyAppearance,
  loadAppearance,
  saveAppearance,
  type Appearance,
} from '../theme/appearance'
import '../theme/dockview.css'
import { AppShell } from '../ui/AppShell'
import { Dialog } from '../ui/Dialog'
import { Icon, type IconName } from '../ui/Icon'
import { MenuBar, type Menu, type MenuItem } from '../ui/MenuBar'
import { ToolOptions } from '../editor/ToolOptions'
import { allKeys, contoursOf, deletePoints, reverseContour } from '../editor/geometry'
import { downloadFile, safeFileName } from '../utils/download'
import { DocumentPanel } from './DocumentPanel'
import {
  DOCUMENT_COMPONENT,
  HOME_COMPONENT,
  HOME_PANEL_ID,
  HOME_TITLE,
  PRESETS,
  TOOL_PANELS,
  deleteCustomWorkspace,
  loadActiveWorkspace,
  loadCurrentLayout,
  loadCustomWorkspaces,
  projectIdFromPanelId,
  saveActiveWorkspace,
  saveCurrentLayout,
  saveCustomWorkspace,
  type CustomWorkspace,
  type PresetId,
} from './layouts'
import { GlyphPanel, GlyphsPanel, GroupActions, HomePanel, MetricsPanel, PreviewPanel, Watermark } from './panels'
import { RESET_EVENT, documentPosition, isDocumentPanel, toolPosition } from './positions'
import { FIT_VIEW, useWorkspace, zoomAt, type Tool } from './workspaceContext'

const THEME: DockviewTheme = { ...themeDark, name: 'fontafond', className: `${themeDark.className} fd-dock` }

const COMPONENTS = {
  [DOCUMENT_COMPONENT]: DocumentPanel,
  [HOME_COMPONENT]: HomePanel,
  glyphs: GlyphsPanel,
  glyph: GlyphPanel,
  metrics: MetricsPanel,
  preview: PreviewPanel,
}

/** Hauteur minimale d'un panneau : sa barre d'onglets (pour pouvoir le replier). */
const TOOL_MIN_HEIGHT = 34

/** Construit une disposition par défaut (« Essentiel », « Dessin » ou téléphone). */
function buildPreset(api: DockviewApi, preset: PresetId, narrow: boolean) {
  api.clear()
  api.addPanel({ id: HOME_PANEL_ID, component: HOME_COMPONENT, title: HOME_TITLE })
  const [glyphs, glyph, metrics, preview] = TOOL_PANELS
  if (narrow) {
    api.addPanel({ id: glyphs.id, component: glyphs.id, minimumHeight: TOOL_MIN_HEIGHT, title: glyphs.title, position: { referencePanel: HOME_PANEL_ID, direction: 'below' }, initialHeight: 260 })
    api.addPanel({ id: glyph.id, component: glyph.id, minimumHeight: TOOL_MIN_HEIGHT, title: glyph.title, position: { referencePanel: glyphs.id, direction: 'within' }, inactive: true })
    api.addPanel({ id: metrics.id, component: metrics.id, minimumHeight: TOOL_MIN_HEIGHT, title: metrics.title, position: { referencePanel: glyphs.id, direction: 'within' }, inactive: true })
    api.addPanel({ id: preview.id, component: preview.id, minimumHeight: TOOL_MIN_HEIGHT, title: preview.title, position: { referencePanel: glyphs.id, direction: 'within' }, inactive: true })
  } else if (preset === 'dessin') {
    api.addPanel({ id: glyphs.id, component: glyphs.id, minimumHeight: TOOL_MIN_HEIGHT, title: glyphs.title, position: { referencePanel: HOME_PANEL_ID, direction: 'right' }, initialWidth: 300 })
    api.addPanel({ id: glyph.id, component: glyph.id, minimumHeight: TOOL_MIN_HEIGHT, title: glyph.title, position: { referencePanel: glyphs.id, direction: 'within' }, inactive: true })
    api.addPanel({ id: metrics.id, component: metrics.id, minimumHeight: TOOL_MIN_HEIGHT, title: metrics.title, position: { referencePanel: glyphs.id, direction: 'within' }, inactive: true })
    api.addPanel({ id: preview.id, component: preview.id, minimumHeight: TOOL_MIN_HEIGHT, title: preview.title, position: { referencePanel: HOME_PANEL_ID, direction: 'below' }, initialHeight: 150 })
  } else {
    api.addPanel({ id: glyphs.id, component: glyphs.id, minimumHeight: TOOL_MIN_HEIGHT, title: glyphs.title, position: { referencePanel: HOME_PANEL_ID, direction: 'right' }, initialWidth: 340 })
    api.addPanel({ id: glyph.id, component: glyph.id, minimumHeight: TOOL_MIN_HEIGHT, title: glyph.title, position: { referencePanel: glyphs.id, direction: 'below' } })
    api.addPanel({ id: metrics.id, component: metrics.id, minimumHeight: TOOL_MIN_HEIGHT, title: metrics.title, position: { referencePanel: glyph.id, direction: 'within' }, inactive: true })
    api.addPanel({ id: preview.id, component: preview.id, minimumHeight: TOOL_MIN_HEIGHT, title: preview.title, position: { referencePanel: glyph.id, direction: 'below' }, initialHeight: 170 })
  }
  api.getPanel(HOME_PANEL_ID)?.api.setActive()
}

interface OpenDoc {
  id: string
  title: string
  params: Record<string, unknown> | undefined
}

const TOOLS: { id: Tool; icon: IconName; label: string; key: string; ready: boolean }[] = [
  { id: 'pen', icon: 'pen', label: 'Plume', key: 'P', ready: true },
  { id: 'brush', icon: 'brush', label: 'Pinceau', key: 'B', ready: true },
  { id: 'select', icon: 'pointer', label: 'Sélection', key: 'V', ready: true },
  { id: 'hand', icon: 'hand', label: 'Main', key: 'H', ready: true },
  { id: 'zoom', icon: 'zoom', label: 'Zoom', key: 'Z', ready: true },
]


const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

type DialogName = 'appearance' | 'save-workspace' | 'manage-workspaces' | 'shortcuts' | 'about' | 'new-font' | null

export function Workspace() {
  const ws = useWorkspace()
  const { api, setApi, narrow, setActiveProjectId } = ws
  const disposables = useRef<{ dispose: () => void }[]>([])
  const [openPanels, setOpenPanels] = useState<string[]>([])
  const [activeWs, setActiveWs] = useState(loadActiveWorkspace)
  const [customs, setCustoms] = useState<CustomWorkspace[]>(loadCustomWorkspaces)
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance)
  const [dialog, setDialog] = useState<DialogName>(null)
  const [wsName, setWsName] = useState('')
  const [newFontName, setNewFontName] = useState('Ma police')
  const [notice, setNotice] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    applyAppearance(document.documentElement, appearance)
    saveAppearance(appearance)
  }, [appearance])

  useEffect(() => () => disposables.current.forEach((d) => d.dispose()), [])

  const activeDocs = (a: DockviewApi): OpenDoc[] =>
    a.panels
      .filter((p) => p.id.startsWith('doc:'))
      .map((p) => ({ id: p.id, title: p.title ?? p.id, params: p.params as Record<string, unknown> | undefined }))

  /** Applique un espace de travail sans fermer les documents ouverts (comme dans Photoshop). */
  const applyWorkspace = useCallback(
    (a: DockviewApi, wsId: string) => {
      const docs = activeDocs(a)
      const activeId = a.activePanel?.id
      const custom = wsId.startsWith('custom:') ? loadCustomWorkspaces().find((w) => `custom:${w.name}` === wsId) : undefined
      try {
        if (custom) {
          a.clear()
          a.fromJSON(custom.layout)
        } else {
          buildPreset(a, (wsId.replace('preset:', '') as PresetId) || 'essentiel', narrow)
        }
      } catch {
        buildPreset(a, 'essentiel', narrow)
      }
      if (!a.getPanel(HOME_PANEL_ID) && !a.panels.some((p) => isDocumentPanel(p.id)))
        a.addPanel({ id: HOME_PANEL_ID, component: HOME_COMPONENT, title: HOME_TITLE, ...(documentPosition(a) ? { position: documentPosition(a)! } : {}) })
      for (const d of docs) {
        const position = documentPosition(a)
        a.addPanel({ id: d.id, component: DOCUMENT_COMPONENT, title: d.title, params: d.params, ...(position ? { position } : {}) })
      }
      if (docs.length) a.getPanel(HOME_PANEL_ID)?.api.close()
      if (activeId) a.getPanel(activeId)?.api.setActive()
      saveActiveWorkspace(wsId)
      setActiveWs(wsId)
    },
    [narrow],
  )

  const onReady = (event: DockviewReadyEvent) => {
    const a = event.api
    setApi(a)
    const saved = loadCurrentLayout()
    let restored = false
    if (saved) {
      try {
        a.fromJSON(saved)
        restored = a.panels.length > 0
      } catch {
        restored = false
      }
    }
    if (!restored) {
      const preset = (loadActiveWorkspace().replace('preset:', '') as PresetId) || 'essentiel'
      buildPreset(a, PRESETS.some((p) => p.id === preset) ? preset : 'essentiel', narrow)
    }

    const syncPanels = () => setOpenPanels(a.panels.map((p) => p.id))
    // Document actif : celui de l'onglet actif ; sinon (un panneau a le focus) on garde le dernier,
    // et au chargement on prend le document visible de son groupe, ou le premier ouvert.
    let lastDoc: string | null = null
    const syncActive = () => {
      const doc = a.activePanel && projectIdFromPanelId(a.activePanel.id)
      const docs = a.panels.filter((p) => p.id.startsWith('doc:'))
      if (doc) lastDoc = doc
      else if (!lastDoc || !docs.some((p) => projectIdFromPanelId(p.id) === lastDoc)) {
        const visible = docs.find((p) => p.api.isVisible) ?? docs[0]
        lastDoc = visible ? projectIdFromPanelId(visible.id) : null
      }
      setActiveProjectId(lastDoc)
    }
    let saveTimer: number | undefined
    disposables.current.push(
      a.onDidLayoutChange(() => {
        window.clearTimeout(saveTimer)
        saveTimer = window.setTimeout(() => saveCurrentLayout(a.toJSON()), 300)
      }),
      a.onDidActivePanelChange(syncActive),
      a.onDidAddPanel(syncPanels),
      a.onDidLayoutFromJSON(() => {
        syncPanels()
        syncActive()
      }),
      a.onDidRemovePanel((removed) => {
        syncPanels()
        const docLeft = a.panels.find((p) => p.id.startsWith('doc:'))
        if (removed.id.startsWith('doc:')) {
          if (docLeft) {
            const pid = a.activePanel ? projectIdFromPanelId(a.activePanel.id) : null
            setActiveProjectId(pid ?? projectIdFromPanelId(docLeft.id))
          } else {
            setActiveProjectId(null)
            // Dernier document fermé : on revient à l'Accueil, au même endroit.
            queueMicrotask(() => {
              if (!a.getPanel(HOME_PANEL_ID) && !a.panels.some((p) => p.id.startsWith('doc:'))) {
                const position = toolPosition(a) ? { referencePanel: toolPosition(a)!.referencePanel, direction: 'left' as const } : undefined
                a.addPanel({ id: HOME_PANEL_ID, component: HOME_COMPONENT, title: HOME_TITLE, ...(position ? { position } : {}) })
              }
            })
          }
        }
      }),
    )
    syncPanels()
    syncActive()
  }

  const resetWorkspace = useCallback(() => api && applyWorkspace(api, activeWs), [api, applyWorkspace, activeWs])
  useEffect(() => {
    const on = () => resetWorkspace()
    window.addEventListener(RESET_EVENT, on)
    return () => window.removeEventListener(RESET_EVENT, on)
  }, [resetWorkspace])

  const activeId = ws.activeProjectId
  const project = activeId ? ws.projects[activeId] : null
  const view = activeId ? ws.view(activeId) : FIT_VIEW
  const zoomBy = (f: number) => activeId && ws.setView(activeId, (v) => zoomAt(v, f))
  const fit = () => activeId && ws.setView(activeId, () => FIT_VIEW)

  const glyphCharActive = activeId ? ws.selectedChar(activeId) : null
  const selection = activeId ? ws.selection(activeId) : []
  const currentGlyph = project && glyphCharActive ? project.glyphs[glyphCharActive] : undefined
  const undo = () => activeId && ws.undo(activeId)
  const redo = () => activeId && ws.redo(activeId)
  const selectAll = () => {
    if (!activeId || !currentGlyph) return
    ws.setTool('select')
    ws.setSelection(activeId, allKeys(currentGlyph.contours))
  }
  const deleteSelection = () => {
    if (!activeId || !glyphCharActive || selection.length === 0) return
    ws.editGlyph(activeId, glyphCharActive, (g) => ({ ...g, contours: deletePoints(g.contours, selection) }))
    ws.setSelection(activeId, [])
  }
  const reverseSelected = () => {
    if (!activeId || !glyphCharActive || selection.length === 0) return
    const idx = new Set(contoursOf(selection))
    ws.editGlyph(activeId, glyphCharActive, (g) => ({ ...g, contours: g.contours.map((c, i) => (idx.has(i) ? reverseContour(c) : c)) }))
    ws.setSelection(activeId, [])
  }
  const clearGlyph = () => {
    if (!activeId || !glyphCharActive || !currentGlyph?.contours.length) return
    ws.editGlyph(activeId, glyphCharActive, (g) => ({ ...g, contours: [] }))
    ws.setSelection(activeId, [])
  }

  // Raccourcis clavier globaux
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && (e.key === '+' || e.key === '=')) {
      e.preventDefault()
      zoomBy(1.25)
    } else if (mod && e.key === '-') {
      e.preventDefault()
      zoomBy(1 / 1.25)
    } else if (mod && e.key === '0') {
      e.preventDefault()
      fit()
    } else if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      undo()
    } else if (mod && ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      redo()
    } else if (mod && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault()
      selectAll()
    } else if (!mod && !e.altKey) {
      const tools: Record<string, Tool> = { h: 'hand', z: 'zoom', p: 'pen', b: 'brush', v: 'select' }
      const t = tools[e.key.toLowerCase()]
      if (t) ws.setTool(t)
    }
    }
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const togglePanel = (id: string, title: string) => {
    if (!api) return
    const p = api.getPanel(id)
    if (p) {
      p.api.close()
      return
    }
    const position = toolPosition(api)
    api.addPanel({ id, component: id, title, minimumHeight: TOOL_MIN_HEIGHT, ...(position ? { position } : {}), initialWidth: 320 })
  }

  const showHome = () => {
    if (!api) return
    const p = api.getPanel(HOME_PANEL_ID)
    if (p) p.api.setActive()
    else {
      const position = documentPosition(api)
      api.addPanel({ id: HOME_PANEL_ID, component: HOME_COMPONENT, title: HOME_TITLE, ...(position ? { position } : {}) })
    }
  }

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const p = await importProjectJson(await file.text())
      ws.bumpList()
      ws.openProject(p.id, p.name)
    } catch (err) {
      setNotice(err instanceof InvalidProjectFileError ? err.message : "L'import a échoué. Réessayez avec un autre fichier.")
    }
  }

  const wsLabel = activeWs.startsWith('custom:')
    ? activeWs.slice(7)
    : (PRESETS.find((p) => `preset:${p.id}` === activeWs)?.name ?? 'Essentiel')

  const menus: Menu[] = [
    {
      id: 'fichier',
      label: 'Fichier',
      items: [
        { type: 'item', label: 'Nouvelle police…', onSelect: () => setDialog('new-font') },
        { type: 'item', label: 'Ouvrir (Mes polices)', onSelect: showHome },
        { type: 'item', label: 'Importer un projet .json…', onSelect: () => importRef.current?.click() },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Exporter la police en .json',
          disabled: !project,
          onSelect: () => project && downloadFile(`${safeFileName(project.name)}.fontafond.json`, exportProjectJson(project), 'application/json'),
        },
        { type: 'item', label: 'Fermer le document', disabled: !activeId, onSelect: () => activeId && ws.closeProject(activeId) },
      ],
    },
    {
      id: 'edition',
      label: 'Édition',
      items: [
        { type: 'item', label: 'Annuler', shortcut: 'Ctrl Z', disabled: !activeId || !ws.canUndo(activeId), onSelect: undo },
        { type: 'item', label: 'Rétablir', shortcut: 'Ctrl Maj Z', disabled: !activeId || !ws.canRedo(activeId), onSelect: redo },
        { type: 'separator' },
        { type: 'item', label: 'Tout sélectionner', shortcut: 'Ctrl A', disabled: !currentGlyph?.contours.length, onSelect: selectAll },
        { type: 'item', label: 'Supprimer la sélection', shortcut: 'Suppr', disabled: selection.length === 0, onSelect: deleteSelection },
        { type: 'item', label: 'Inverser le sens du contour', disabled: selection.length === 0, onSelect: reverseSelected },
        { type: 'item', label: 'Effacer le glyphe', disabled: !currentGlyph?.contours.length, onSelect: clearGlyph },
      ],
    },
    {
      id: 'affichage',
      label: 'Affichage',
      items: [
        { type: 'item', label: 'Zoom avant', shortcut: 'Ctrl +', disabled: !activeId, onSelect: () => zoomBy(1.25) },
        { type: 'item', label: 'Zoom arrière', shortcut: 'Ctrl −', disabled: !activeId, onSelect: () => zoomBy(1 / 1.25) },
        { type: 'item', label: 'Ajuster à la fenêtre', shortcut: 'Ctrl 0', disabled: !activeId, onSelect: fit },
        { type: 'separator' },
        { type: 'item', label: 'Apparence…', onSelect: () => setDialog('appearance') },
      ],
    },
    {
      id: 'fenetre',
      label: 'Fenêtre',
      items: [
        { type: 'label', label: 'Panneaux' },
        ...TOOL_PANELS.map<MenuItem>((t) => ({
          type: 'check',
          label: t.title,
          checked: openPanels.includes(t.id),
          onSelect: () => togglePanel(t.id, t.title),
        })),
        { type: 'check', label: HOME_TITLE, checked: openPanels.includes(HOME_PANEL_ID), onSelect: showHome },
        { type: 'separator' },
        { type: 'label', label: 'Espace de travail' },
        ...PRESETS.map<MenuItem>((p) => ({
          type: 'radio',
          label: p.name,
          checked: activeWs === `preset:${p.id}`,
          onSelect: () => api && applyWorkspace(api, `preset:${p.id}`),
        })),
        ...customs.map<MenuItem>((c) => ({
          type: 'radio',
          label: c.name,
          checked: activeWs === `custom:${c.name}`,
          onSelect: () => api && applyWorkspace(api, `custom:${c.name}`),
        })),
        { type: 'separator' },
        { type: 'item', label: `Réinitialiser « ${wsLabel} »`, onSelect: resetWorkspace },
        {
          type: 'item',
          label: 'Enregistrer l’espace de travail…',
          onSelect: () => {
            setWsName(activeWs.startsWith('custom:') ? activeWs.slice(7) : '')
            setDialog('save-workspace')
          },
        },
        { type: 'item', label: 'Gérer les espaces de travail…', disabled: customs.length === 0, onSelect: () => setDialog('manage-workspaces') },
      ],
    },
    {
      id: 'aide',
      label: 'Aide',
      items: [
        { type: 'item', label: 'Raccourcis clavier…', onSelect: () => setDialog('shortcuts') },
        { type: 'item', label: 'À propos de Fontafond…', onSelect: () => setDialog('about') },
      ],
    },
  ]

  const glyphChar = activeId ? ws.selectedChar(activeId) : null

  return (
    <AppShell
      menu={<MenuBar menus={menus} />}
      title={
        project ? (
          <>
            {project.name} <span className="fd-strong">· {glyphChar}</span>
          </>
        ) : null
      }
      actions={
        <button type="button" className="fd-btn fd-btn-primary fd-btn-sm" disabled title="Disponible après les outils de dessin">
          <Icon name="download" /> Exporter .otf
        </button>
      }
      options={
        <>
          <span className="fd-strong">{TOOLS.find((t) => t.id === ws.tool)?.label}</span>
          <span className="fd-sep" aria-hidden="true" />
          {activeId ? (
            <ToolOptions
              tool={ws.tool}
              options={ws.toolOptions}
              onChange={ws.setToolOptions}
              hasSelection={selection.length > 0}
              onDeleteSelection={deleteSelection}
            />
          ) : (
            <span className="fd-muted fd-options-hint">Ouvrez ou créez une police depuis l’onglet Accueil ou le menu Fichier.</span>
          )}
          {activeId && <span className="fd-options-right">{Math.round(view.zoom * 100)} %</span>}
        </>
      }
      tools={TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="fd-tool"
          disabled={!t.ready}
          aria-pressed={ws.tool === t.id}
          aria-label={t.ready ? `${t.label} (${t.key})` : `${t.label} (${t.key}), bientôt disponible`}
          title={t.ready ? `${t.label} (${t.key})` : `${t.label} (${t.key}) – bientôt`}
          onClick={() => ws.setTool(t.id)}
        >
          <Icon name={t.icon} size={20} />
        </button>
      ))}
      status={
        <>
          {project && glyphChar ? (
            <span>
              Glyphe {glyphChar} · {unicodeLabel(glyphChar)} · {project.metrics.unitsPerEm} unités / em
            </span>
          ) : (
            <span>Aucun document</span>
          )}
          <span>Espace de travail : {wsLabel}</span>
          <span className={`fd-save fd-save-${ws.saveState}`} role="status">
            {ws.saveState === 'saved' && 'Enregistré sur cet appareil'}
            {ws.saveState === 'saving' && 'Enregistrement…'}
            {ws.saveState === 'error' && "Échec de l'enregistrement"}
          </span>
        </>
      }
    >
      <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
      {notice && (
        <p role="alert" className="fd-toast">
          {notice}
          <button type="button" className="fd-icon-btn" aria-label="Fermer le message" onClick={() => setNotice(null)}>
            ×
          </button>
        </p>
      )}
      <DockviewReact
        className="fd-dock-host"
        theme={THEME}
        components={COMPONENTS}
        rightHeaderActionsComponent={GroupActions}
        watermarkComponent={Watermark}
        onReady={onReady}
        disableFloatingGroups={narrow}
        floatingGroupBounds="boundedWithinViewport"
      />

      <Dialog open={dialog === 'new-font'} title="Nouvelle police" onClose={() => setDialog(null)}>
        <form
          className="fd-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setDialog(null)
            await ws.createAndOpen(newFontName)
          }}
        >
          <label className="fd-field">
            <span>Nom de la police</span>
            <input value={newFontName} onChange={(e) => setNewFontName(e.target.value)} maxLength={60} required autoFocus />
          </label>
          <div className="fd-form-actions">
            <button type="button" className="fd-btn" onClick={() => setDialog(null)}>
              Annuler
            </button>
            <button type="submit" className="fd-btn fd-btn-primary">
              Créer
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog === 'appearance'} title="Apparence" onClose={() => setDialog(null)}>
        <div className="fd-form">
          <fieldset className="fd-choice">
            <legend>Thème de l'interface</legend>
            {(Object.keys(THEME_LABELS) as Appearance['theme'][]).map((t) => (
              <label key={t}>
                <input type="radio" name="theme" checked={appearance.theme === t} onChange={() => setAppearance({ ...appearance, theme: t })} />
                {THEME_LABELS[t]}
              </label>
            ))}
          </fieldset>
          <fieldset className="fd-choice">
            <legend>Taille du texte de l'interface</legend>
            {(Object.keys(UI_SIZE_LABELS) as Appearance['uiSize'][]).map((t) => (
              <label key={t}>
                <input type="radio" name="uisize" checked={appearance.uiSize === t} onChange={() => setAppearance({ ...appearance, uiSize: t })} />
                {UI_SIZE_LABELS[t]}
              </label>
            ))}
          </fieldset>
          <fieldset className="fd-choice">
            <legend>Fond du plan de travail</legend>
            {(Object.keys(CANVAS_LABELS) as Appearance['canvas'][]).map((t) => (
              <label key={t}>
                <input type="radio" name="canvas" checked={appearance.canvas === t} onChange={() => setAppearance({ ...appearance, canvas: t })} />
                {CANVAS_LABELS[t]}
              </label>
            ))}
          </fieldset>
          <p className="fd-muted fd-small">Ces réglages sont mémorisés sur cet appareil.</p>
        </div>
      </Dialog>

      <Dialog open={dialog === 'save-workspace'} title="Enregistrer l’espace de travail" onClose={() => setDialog(null)}>
        <form
          className="fd-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!api || !wsName.trim()) return
            setCustoms(saveCustomWorkspace(wsName, api.toJSON()))
            const id = `custom:${wsName.trim()}`
            saveActiveWorkspace(id)
            setActiveWs(id)
            setDialog(null)
          }}
        >
          <p className="fd-muted fd-small">
            La disposition actuelle des panneaux et des fenêtres flottantes est enregistrée. Les documents ouverts ne le sont pas.
          </p>
          <label className="fd-field">
            <span>Nom de l'espace de travail</span>
            <input value={wsName} onChange={(e) => setWsName(e.target.value)} maxLength={40} required autoFocus placeholder="Ex. Mon atelier" />
          </label>
          <div className="fd-form-actions">
            <button type="button" className="fd-btn" onClick={() => setDialog(null)}>
              Annuler
            </button>
            <button type="submit" className="fd-btn fd-btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={dialog === 'manage-workspaces'} title="Espaces de travail enregistrés" onClose={() => setDialog(null)}>
        <ul className="fd-list">
          {customs.map((c) => (
            <li key={c.name}>
              <span>{c.name}</span>
              <button
                type="button"
                className="fd-icon-btn fd-icon-btn-danger"
                aria-label={`Supprimer l'espace ${c.name}`}
                onClick={() => {
                  setCustoms(deleteCustomWorkspace(c.name))
                  if (activeWs === `custom:${c.name}`) {
                    saveActiveWorkspace('preset:essentiel')
                    setActiveWs('preset:essentiel')
                  }
                }}
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
          {customs.length === 0 && <li className="fd-muted">Aucun espace enregistré.</li>}
        </ul>
      </Dialog>

      <Dialog open={dialog === 'shortcuts'} title="Raccourcis clavier" onClose={() => setDialog(null)}>
        <table className="fd-table">
          <tbody>
            {[
              ['P', 'Plume'],
              ['B', 'Pinceau'],
              ['V', 'Sélection'],
              ['Ctrl Z  /  Ctrl Maj Z', 'Annuler / Rétablir'],
              ['Ctrl A', 'Tout sélectionner'],
              ['Suppr', 'Supprimer les points sélectionnés'],
              ['Flèches (Maj = ×10)', 'Déplacer la sélection'],
              ['Entrée  /  Échap', 'Fermer le tracé à la Plume'],
              ['H', 'Outil Main'],
              ['Z', 'Outil Zoom'],
              ['Barre d’espace (maintenue)', 'Main temporaire'],
              ['Ctrl + molette', 'Zoomer autour du curseur'],
              ['Molette', 'Déplacer la vue'],
              ['Ctrl +  /  Ctrl −', 'Zoom avant / arrière'],
              ['Ctrl 0', 'Ajuster à la fenêtre'],
              ['Glisser un onglet', 'Déplacer une fenêtre ou un panneau'],
            ].map(([k, v]) => (
              <tr key={k}>
                <th scope="row">
                  <kbd>{k}</kbd>
                </th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Dialog>

      <Dialog open={dialog === 'about'} title="À propos de Fontafond" onClose={() => setDialog(null)}>
        <p>Fontafond : créez et modifiez vos polices dans le navigateur. Gratuit, sans compte ; vos projets restent sur votre appareil.</p>
        <p className="fd-muted fd-small">Version 0.2 · espace de travail modulable.</p>
      </Dialog>
    </AppShell>
  )
}
