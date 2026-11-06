/** Apparence de l'interface (thème, taille du texte, fond du plan de travail), mémorisée sur l'appareil. */

export type ThemeName = 'dark' | 'deep' | 'light'
export type UiSize = 'small' | 'medium' | 'large'
export type CanvasTone = 'dark' | 'grey' | 'light'

export interface Appearance {
  theme: ThemeName
  uiSize: UiSize
  canvas: CanvasTone
}

export const DEFAULT_APPEARANCE: Appearance = { theme: 'dark', uiSize: 'medium', canvas: 'dark' }

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: 'Sombre',
  deep: 'Sombre profond',
  light: 'Clair',
}
export const UI_SIZE_LABELS: Record<UiSize, string> = { small: 'Petite', medium: 'Moyenne', large: 'Grande' }
export const CANVAS_LABELS: Record<CanvasTone, string> = { dark: 'Sombre', grey: 'Gris', light: 'Clair' }

const KEY = 'fontafond.appearance.v1'

const oneOf = <T extends string>(v: unknown, allowed: Record<T, string>, fallback: T): T =>
  typeof v === 'string' && v in allowed ? (v as T) : fallback

/** Lit une apparence enregistrée ; toute valeur inconnue revient à la valeur par défaut. */
export function parseAppearance(raw: string | null | undefined): Appearance {
  if (!raw) return { ...DEFAULT_APPEARANCE }
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>
    return {
      theme: oneOf(data.theme, THEME_LABELS, DEFAULT_APPEARANCE.theme),
      uiSize: oneOf(data.uiSize, UI_SIZE_LABELS, DEFAULT_APPEARANCE.uiSize),
      canvas: oneOf(data.canvas, CANVAS_LABELS, DEFAULT_APPEARANCE.canvas),
    }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function loadAppearance(store: Storage | null = storage()): Appearance {
  try {
    return parseAppearance(store?.getItem(KEY))
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export function saveAppearance(a: Appearance, store: Storage | null = storage()): void {
  try {
    store?.setItem(KEY, JSON.stringify(a))
  } catch {
    // Stockage indisponible (navigation privée) : l'apparence vaut pour cette session seulement.
  }
}

/** Applique l'apparence via des attributs data-fd-* lus par tokens.css (préfixés pour ne pas gêner une page hôte). */
export function applyAppearance(root: HTMLElement, a: Appearance): void {
  root.dataset.fdTheme = a.theme
  root.dataset.fdUiSize = a.uiSize
  root.dataset.fdCanvas = a.canvas
}
