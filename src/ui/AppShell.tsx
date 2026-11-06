import type { ReactNode } from 'react'

interface AppShellProps {
  /** Contenu à droite du logo dans la barre de menus (navigation). */
  nav?: ReactNode
  /** Titre centré (nom du projet, glyphe en cours…). */
  title?: ReactNode
  /** Boutons à droite de la barre de menus. */
  actions?: ReactNode
  /** Barre d'options : change selon l'outil. */
  options?: ReactNode
  /** Barre d'outils verticale à gauche. */
  tools?: ReactNode
  /** Panneaux à droite. */
  panels?: ReactNode
  /** Barre d'état en bas. */
  status?: ReactNode
  children: ReactNode
}

/** Disposition « logiciel de création » : menus, options, outils, plan de travail, panneaux, état. */
export function AppShell({ nav, title, actions, options, tools, panels, status, children }: AppShellProps) {
  return (
    <div className="fd-app">
      <header className="fd-menubar">
        <div className="fd-brand">
          <span className="fd-logo" aria-hidden="true">
            Aa
          </span>
          <span className="fd-brand-name">Fontafond</span>
        </div>
        {nav}
        <div className="fd-menubar-title">{title}</div>
        <div className="fd-menubar-actions">{actions}</div>
      </header>
      {options && <div className="fd-options">{options}</div>}
      <div className="fd-body">
        {tools && (
          <div className="fd-tools" role="toolbar" aria-label="Outils">
            {tools}
          </div>
        )}
        <main className="fd-main">{children}</main>
        {panels && (
          <aside className="fd-panels" aria-label="Panneaux">
            {panels}
          </aside>
        )}
      </div>
      {status && <footer className="fd-status">{status}</footer>}
    </div>
  )
}

export function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="fd-panel">
      <div className="fd-panel-head">
        <h2>{title}</h2>
        {aside}
      </div>
      <div className="fd-panel-body">{children}</div>
    </section>
  )
}
