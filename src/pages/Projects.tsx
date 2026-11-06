import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  InvalidProjectFileError,
  deleteProject,
  exportProjectJson,
  getProject,
  importProjectJson,
  listProjects,
  renameProject,
} from '../model/storage'
import type { ProjectSummary } from '../model/types'
import { Icon } from '../ui/Icon'
import { useWorkspace } from '../workspace/workspaceContext'
import { downloadFile, safeFileName } from '../utils/download'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** Contenu de l'onglet « Accueil » : créer, ouvrir, importer, gérer ses polices. */
export function ProjectsHome() {
  const ws = useWorkspace()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [newName, setNewName] = useState('Ma police')

  const refresh = useCallback(
    () =>
      listProjects().then(
        (list) => setProjects(list),
        () => {
          setProjects([])
          setMessage({ kind: 'error', text: 'Impossible de lire les polices enregistrées sur cet appareil (navigation privée ?).' })
        },
      ),
    [],
  )

  const { listVersion } = ws
  useEffect(() => {
    let alive = true
    listProjects().then(
      (list) => alive && setProjects(list),
      () => {
        if (!alive) return
        setProjects([])
        setMessage({ kind: 'error', text: 'Impossible de lire les polices enregistrées sur cet appareil (navigation privée ?).' })
      },
    )
    return () => {
      alive = false
    }
  }, [listVersion])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    await ws.createAndOpen(newName)
  }

  async function handleImportJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const p = await importProjectJson(await file.text())
      setMessage({ kind: 'info', text: `« ${p.name} » a été importé.` })
      await refresh()
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof InvalidProjectFileError ? err.message : "L'import a échoué. Réessayez avec un autre fichier.",
      })
    }
  }

  async function handleRename(p: ProjectSummary) {
    const name = window.prompt('Nouveau nom de la police :', p.name)
    if (name && name.trim() && name.trim() !== p.name) {
      const saved = await renameProject(p.id, name)
      if (saved) ws.onProjectRenamed(p.id, saved.name)
      await refresh()
    }
  }

  async function handleExport(p: ProjectSummary) {
    const full = await getProject(p.id)
    if (full) downloadFile(`${safeFileName(full.name)}.fontafond.json`, exportProjectJson(full), 'application/json')
  }

  async function handleDelete(p: ProjectSummary) {
    if (window.confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`)) {
      await deleteProject(p.id)
      ws.onProjectDeleted(p.id)
      await refresh()
    }
  }

  return (
    <div className="fd-panel-scroll">
      <div className="fd-page">
        <div className="fd-page-head">
          <h1>Mes polices</h1>
          <p className="fd-muted">
            Créez une police de zéro ou ouvrez une police existante pour la modifier. Tout reste sur votre appareil.
          </p>
        </div>

        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`fd-notice fd-notice-${message.kind}`}>
            {message.text}
          </p>
        )}

        <div className="fd-cards">
          <form className="fd-card" onSubmit={handleCreate}>
            <span className="fd-card-icon fd-card-icon-blue">
              <Icon name="plus" size={22} />
            </span>
            <h2>Nouvelle police</h2>
            <p className="fd-muted">Grille vide : majuscules, minuscules, chiffres, ponctuation et accents français.</p>
            <label className="fd-field">
              <span>Nom de la police</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} required />
            </label>
            <button type="submit" className="fd-btn fd-btn-primary">
              Créer et ouvrir
            </button>
          </form>

          <div className="fd-card fd-card-dashed">
            <span className="fd-card-icon">
              <Icon name="upload" size={22} />
            </span>
            <h2>Modifier une police existante</h2>
            <p className="fd-muted">
              Ouvrez un fichier .ttf, .otf ou .woff : ses lettres, sa chasse et son crénage deviendront modifiables.
            </p>
            <button type="button" className="fd-btn" disabled aria-describedby="import-font-soon">
              Choisir un fichier de police
            </button>
            <span id="import-font-soon" className="fd-badge">
              Bientôt disponible
            </span>
          </div>

          <div className="fd-card">
            <span className="fd-card-icon">
              <Icon name="file" size={22} />
            </span>
            <h2>Importer un projet</h2>
            <p className="fd-muted">Rouvrez un projet sauvegardé avec « Exporter .json » (sur un autre appareil, par exemple).</p>
            <label className="fd-btn fd-file-btn">
              Choisir un fichier .json
              <input type="file" accept=".json,application/json" onChange={handleImportJson} />
            </label>
          </div>

          <div className="fd-card fd-card-warning">
            <h2>
              <Icon name="warning" size={18} /> Licence des polices
            </h2>
            <p>
              Ne modifiez que des polices dont la licence le permet (par exemple la licence libre OFL, utilisée par beaucoup
              de polices Google). Si la licence l'exige, donnez un nouveau nom à votre version.
            </p>
          </div>
        </div>

        <section aria-labelledby="recents" className="fd-recents">
          <h2 id="recents" className="fd-section-title">
            Récents
          </h2>
          {projects === null && <p className="fd-muted">Chargement…</p>}
          {projects?.length === 0 && <p className="fd-muted">Aucune police pour l'instant. Créez la première ci-dessus.</p>}
          <ul className="fd-project-list">
            {projects?.map((p) => (
              <li key={p.id} className="fd-project">
                <button type="button" className="fd-project-open" onClick={() => ws.openProject(p.id, p.name)}>
                  <span className="fd-project-sample" aria-hidden="true">
                    Aa
                  </span>
                  <span className="fd-project-name">{p.name}</span>
                  <span className="fd-muted">
                    {p.drawn} / {p.total} glyphes dessinés · {dateFmt.format(p.updatedAt)}
                  </span>
                </button>
                <div className="fd-project-actions">
                  <button type="button" className="fd-icon-btn" aria-label={`Renommer ${p.name}`} onClick={() => handleRename(p)}>
                    <Icon name="edit" />
                  </button>
                  <button
                    type="button"
                    className="fd-icon-btn"
                    aria-label={`Exporter ${p.name} en .json`}
                    onClick={() => handleExport(p)}
                  >
                    <Icon name="download" />
                  </button>
                  <button
                    type="button"
                    className="fd-icon-btn fd-icon-btn-danger"
                    aria-label={`Supprimer ${p.name}`}
                    onClick={() => handleDelete(p)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
