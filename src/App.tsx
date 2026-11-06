import { useEffect, useState } from 'react'
import { FontEditorPage } from './pages/FontEditor'
import { ProjectsPage } from './pages/Projects'
import { parseHash } from './router'

export default function App() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route.name === 'editor' ? <FontEditorPage key={route.id} projectId={route.id} /> : <ProjectsPage />
}
