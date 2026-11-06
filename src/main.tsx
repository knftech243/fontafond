import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { applyAppearance, loadAppearance } from './theme/appearance'
import './theme/tokens.css'
import './theme/app.css'

// Applique le thème avant le premier affichage (évite un flash de mauvaises couleurs).
applyAppearance(document.documentElement, loadAppearance())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
