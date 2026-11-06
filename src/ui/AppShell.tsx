import type { ReactNode } from 'react'

interface AppShellProps {
  /** Barre de menus (Fichier, Affichage, Fenêtre, Aide). */
  menu?: ReactNode
  /** Titre centré (police et glyphe en cours). */
  title?: ReactNode
  /** Boutons à droite de la barre de menus. */
  actions?: ReactNode
  /** Barre d'options : change selon l'outil. */
  options?: ReactNode
  /** Barre d'outils verticale à gauche. */
  tools?: ReactNode
  /** Barre d'état en bas. */
  status?: ReactNode
  /** Zone des fenêtres (documents et panneaux). */
  children: ReactNode
}

/** Coque fixe « logiciel de création » : occupe tout l'écran, ne défile jamais. */
export function AppShell({ menu, title, actions, options, tools, status, children }: AppShellProps) {
  return (
    <div className="fd-app">
      <header className="fd-menubar">
        <div className="fd-brand">
          <span className="fd-logo" aria-hidden="true">
            Aa
          </span>
          <span className="fd-brand-name">Fontafond</span>
        </div>
        {menu}
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
      </div>
      {status && <footer className="fd-status">{status}</footer>}
    </div>
  )
}

/** Contenu d'un panneau : défile à l'intérieur s'il est trop long (jamais la page). */
export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="fd-panel-scroll">{children}</div>
}
