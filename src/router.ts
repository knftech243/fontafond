/** Navigation minimale par l'ancre de l'URL : #/ (projets) et #/police/<id> (éditeur). */
export type Route = { name: 'projects' } | { name: 'editor'; id: string }

export function parseHash(hash: string): Route {
  const m = /^#\/police\/([\w-]+)$/.exec(hash)
  return m ? { name: 'editor', id: m[1] } : { name: 'projects' }
}

export function openProject(id: string): void {
  window.location.hash = `#/police/${id}`
}

export function goToProjects(): void {
  window.location.hash = '#/'
}
