/** Conversions de couleurs : HEX ↔ RVB ↔ TSV (teinte, saturation, valeur). */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsv {
  h: number
  s: number
  v: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function hexToRgb(hex: string): Rgb | null {
  let h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const d = max - min
  let h = 0
  if (d) {
    if (max === R) h = 60 * (((G - B) / d) % 6)
    else if (max === G) h = 60 * ((B - R) / d + 2)
    else h = 60 * ((R - G) / d + 4)
  }
  if (h < 0) h += 360
  return { h: Math.round(h) % 360, s: Math.round(max ? (d / max) * 100 : 0), v: Math.round(max * 100) }
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const S = clamp(s, 0, 100) / 100
  const V = clamp(v, 0, 100) / 100
  const H = ((h % 360) + 360) % 360
  const c = V * S
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1))
  const m = V - c
  const [r, g, b] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x]
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

export const normalizeHex = (hex: string): string | null => {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHex(rgb) : null
}

/** Palette de la charte Fontafond (premières nuances du nuancier). */
export const BRAND_SWATCHES = ['#0b1a1b', '#ffffff', '#205a5c', '#007fff', '#f7d618', '#ce1021']
