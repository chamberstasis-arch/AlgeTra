import { extractEquations, extractPlainText } from './mmd'
import type { EquationStats, PageMetrics } from './types'

/** Distancia de Levenshtein genérica sobre arreglos, con función de igualdad. */
function editDistance<T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean = (x, y) => x === y): number {
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

const normText = (s: string) => s.replace(/\s+/g, ' ').trim()

const FUNCTIONS = 'det|dim|ker|rank|deg|gcd|lim|max|min|sup|inf|sin|cos|tan|log|ln|exp|arg|tr'
const ALIASES: [RegExp, string][] = [
  [/\\[dt]frac(?![a-zA-Z])/g, '\\frac'],
  [/\\leq?(?![a-zA-Z])/g, '\\le'],
  [/\\geq?(?![a-zA-Z])/g, '\\ge'],
  [/\\neq?(?![a-zA-Z])/g, '\\ne'],
  [/\\(?:rightarrow|longrightarrow)(?![a-zA-Z])/g, '\\to'],
]
const MATRIX_ENVS: Record<string, string> = { '(': 'pmatrix', '[': 'bmatrix', '|': 'vmatrix', '\\|': 'Vmatrix' }

/**
 * Lleva LaTeX equivalente en notación a una forma única, para no penalizar diferencias de estilo
 * que no son errores de transcripción: `\operatorname{det}` ≡ `\det`, `\left[\begin{array}` ≡ `bmatrix`.
 * No intenta equivalencia matemática: `\varphi` y `\phi` siguen siendo distintos a propósito.
 */
export function canonicalLatex(latex: string): string {
  let s = latex
    .replace(new RegExp(`\\\\operatorname\\{(${FUNCTIONS})\\}`, 'g'), '$1')
    .replace(new RegExp(`\\\\(${FUNCTIONS})(?![a-zA-Z])`, 'g'), '$1')
  for (const [re, to] of ALIASES) s = s.replace(re, to)
  s = s.replace(
    /\\left\s*(\\\||[(\[|])\s*\\begin\{array\}\{[clr]*\}([\s\S]*?)\\end\{array\}\s*\\right\s*(?:\\\||[)\]|])/g,
    (_m, open: string, body: string) => (MATRIX_ENVS[open] ? `\\begin{${MATRIX_ENVS[open]}}${body}\\end{${MATRIX_ENVS[open]}}` : _m),
  )
  return s
}

/** Tokeniza LaTeX ignorando espaciado y modificadores de tamaño que no cambian el significado. */
export function latexTokens(latex: string): string[] {
  const cleaned = canonicalLatex(latex)
    .replace(/\\(left|right|big|Big|bigg|Bigg)(?![a-zA-Z])/g, '')
    .replace(/\\[,;:! ]/g, '')
    .replace(/\\(displaystyle|textstyle)(?![a-zA-Z])/g, '')
    .replace(/\s+/g, '')
  return cleaned.match(/\\[a-zA-Z]+|\\.|[A-Za-z]|\d|\S/g) ?? []
}

const eqKey = (latex: string) => latexTokens(latex).join(' ')

function alignEquations(ref: string[], hyp: string[]): EquationStats {
  // DP con trazado para contar aciertos, sustituciones, inserciones y omisiones.
  const n = ref.length
  const m = hyp.length
  const rk = ref.map(eqKey)
  const hk = hyp.map(eqKey)
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)])
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (rk[i - 1] === hk[j - 1] ? 0 : 1))
    }
  }
  const stats: EquationStats = { total: n, exact: 0, substituted: 0, inserted: 0, deleted: 0 }
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (rk[i - 1] === hk[j - 1] ? 0 : 1)) {
      if (rk[i - 1] === hk[j - 1]) stats.exact++
      else stats.substituted++
      i--
      j--
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      stats.deleted++ // la referencia tiene una fórmula que el OCR no produjo
      i--
    } else {
      stats.inserted++ // el OCR produjo una fórmula que no está en la referencia
      j--
    }
  }
  return stats
}

/**
 * Compara la salida del OCR (`original`) con el texto corregido por una persona (`reference`).
 * La referencia es la verdad de terreno: por eso solo debe usarse con páginas revisadas.
 */
export function comparePage(original: string, reference: string): PageMetrics {
  const refText = normText(extractPlainText(reference))
  const hypText = normText(extractPlainText(original))
  const textCer = refText.length ? editDistance([...hypText], [...refText]) / refText.length : hypText.length ? 1 : 0
  const refWords = refText ? refText.split(' ') : []
  const hypWords = hypText ? hypText.split(' ') : []
  const textWer = refWords.length ? editDistance(hypWords, refWords) / refWords.length : hypWords.length ? 1 : 0

  const refEqs = extractEquations(reference)
  const hypEqs = extractEquations(original)
  const refTok = refEqs.flatMap((e) => [...latexTokens(e), '⏎'])
  const hypTok = hypEqs.flatMap((e) => [...latexTokens(e), '⏎'])
  const mathTokenErrorRate = refTok.length
    ? editDistance(hypTok, refTok) / refTok.length
    : hypTok.length
      ? 1
      : 0

  return {
    textCer: Math.min(textCer, 1),
    textWer: Math.min(textWer, 1),
    mathTokenErrorRate: Math.min(mathTokenErrorRate, 1),
    equations: alignEquations(refEqs, hypEqs),
    unchanged: normText(original) === normText(reference),
  }
}
