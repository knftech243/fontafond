/**
 * Déclarations minimales pour opentype.js 2.0 (la bibliothèque ne fournit pas de types).
 * Seules les parties utilisées par Fontafond sont décrites.
 */
declare module 'opentype.js' {
  export type PathCommand =
    | { type: 'M' | 'L'; x: number; y: number }
    | { type: 'Q'; x1: number; y1: number; x: number; y: number }
    | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
    | { type: 'Z' }

  export class Path {
    commands: PathCommand[]
    moveTo(x: number, y: number): void
    lineTo(x: number, y: number): void
    quadraticCurveTo(x1: number, y1: number, x: number, y: number): void
    curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void
    close(): void
  }

  export interface GlyphOptions {
    name: string
    unicode?: number
    unicodes?: number[]
    advanceWidth: number
    path: Path
  }

  export class Glyph {
    constructor(options: GlyphOptions)
    index: number
    name: string | null
    unicode?: number
    unicodes: number[]
    advanceWidth?: number
    path: Path
  }

  export interface FontOptions {
    familyName: string
    styleName: string
    unitsPerEm: number
    ascender: number
    descender: number
    glyphs: Glyph[]
    designer?: string
    manufacturer?: string
    version?: string
    copyright?: string
    license?: string
  }

  export interface GlyphSet {
    length: number
    get(index: number): Glyph
  }

  export class Font {
    constructor(options: FontOptions)
    unitsPerEm: number
    ascender: number
    descender: number
    glyphs: GlyphSet
    tables: { os2?: { sCapHeight?: number; sxHeight?: number } } & Record<string, unknown>
    outlinesFormat: string
    /** Paires de la table « kern » (clé « indexGauche,indexDroite »). */
    kerningPairs?: Record<string, number>
    toArrayBuffer(): ArrayBuffer
    getEnglishName(name: string): string | undefined
    charToGlyph(c: string): Glyph
    hasChar(c: string): boolean
    getKerningValue(left: Glyph | number, right: Glyph | number): number
  }

  export function parse(buffer: ArrayBuffer, options?: Record<string, unknown>): Font
}
