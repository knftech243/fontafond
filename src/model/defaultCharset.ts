/** Jeu de caractères proposé à la création d'une police (français inclus). */

export interface CharsetGroup {
  id: string
  label: string
  chars: string[]
}

const range = (from: string, to: string): string[] => {
  const out: string[] = []
  for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) out.push(String.fromCharCode(c))
  return out
}

export const CHARSET_GROUPS: CharsetGroup[] = [
  { id: 'upper', label: 'Majuscules', chars: range('A', 'Z') },
  { id: 'lower', label: 'Minuscules', chars: range('a', 'z') },
  { id: 'digits', label: 'Chiffres', chars: range('0', '9') },
  {
    id: 'punct',
    label: 'Ponctuation',
    chars: [...'.,;:!?\'"-–—()[]/&@#%*+=€$«»…'],
  },
  {
    id: 'accents',
    label: 'Accents',
    chars: [...'àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ'],
  },
  {
    id: 'marks',
    label: 'Signes',
    // Signes diacritiques (pour les accents automatiques) et i sans point.
    chars: [...'´`ˆ¨¸˜ı'],
  },
]

/** Tous les caractères, sans doublon, dans l'ordre des groupes. */
export const DEFAULT_CHARSET: string[] = Array.from(new Set(CHARSET_GROUPS.flatMap((g) => g.chars)))

/** Espace : présente dans la police exportée, mais rien à dessiner. */
export const SPACE = ' '

/** Nom de glyphe accepté par les fichiers de police. */
export function glyphName(char: string): string {
  if (char === SPACE) return 'space'
  if (/^[A-Za-z]$/.test(char)) return char
  const code = char.codePointAt(0) ?? 0
  return 'uni' + code.toString(16).toUpperCase().padStart(4, '0')
}

/** Chasse par défaut, selon le type de caractère (unités/em = 1000). */
export function defaultAdvance(char: string): number {
  if (char === SPACE) return 250
  if (/[A-ZÀ-ÝŒÆŸ]/.test(char)) return 680
  if (/[0-9]/.test(char)) return 560
  if (/[a-zà-ÿœæ]/.test(char)) return 540
  return 320
}

/** Libellé lisible d'un caractère, ex. « U+00E9 ». */
export function unicodeLabel(char: string): string {
  const code = char.codePointAt(0) ?? 0
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0')
}
