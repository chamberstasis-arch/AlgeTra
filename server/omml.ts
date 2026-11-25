// LaTeX → MathML (Temml) → OMML (ecuaciones nativas de Word).
// Se implementa a mano porque los conversores genéricos dejan los paréntesis/corchetes de
// las matrices como texto suelto y pierden matrices aumentadas, casos y vectores.

import temml from 'temml'
import { DOMParser } from '@xmldom/xmldom'

type El = Element

export type OmmlResult = { ok: true; xml: string } | { ok: false; error: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const NARY_CHARS = new Set([...'∑∏∐∫∬∭∮∯∰⋃⋂⋁⋀⨁⨂⨀⨆'])
const NARY_UNDOVR = new Set([...'∑∏∐⋃⋂⋁⋀⨁⨂⨀⨆'])
const LIM_NAMES = new Set(['lim', 'max', 'min', 'sup', 'inf', 'limsup', 'liminf', 'argmax', 'argmin'])
const OPERAND_STOP = new Set([...'=≠≈≡<>≤≥+−-±∓,;→⇒⟹⟺↔⇔∈∉⊂⊆⊃⊇'])
const ACCENTS: Record<string, string> = {
  '→': '⃗',
  '⃗': '⃗',
  'ˆ': '̂',
  '^': '̂',
  'ˇ': '̌',
  '˜': '̃',
  '~': '̃',
  '¯': '̄',
  '‾': '̄',
  '˙': '̇',
  '¨': '̈',
  '`': '̀',
  '´': '́',
  '˘': '̆',
}
const INVISIBLE = /[⁡⁢⁣⁤]/g

const kids = (el: El): El[] => {
  const out: El[] = []
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) out.push(n as El)
  return out
}
const txt = (el: El) => (el.textContent ?? '').replace(INVISIBLE, '')
const name = (el: El) => el.localName ?? el.nodeName

const W_RPR = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr>'

function run(text: string, style?: 'p' | 'b' | 'bi' | 'i' | 'nor'): string {
  if (!text) return ''
  let rpr = ''
  if (style === 'nor') rpr = '<m:rPr><m:nor/></m:rPr>'
  else if (style) rpr = `<m:rPr><m:sty m:val="${style}"/></m:rPr>`
  return `<m:r>${rpr}${W_RPR}<m:t xml:space="preserve">${esc(text)}</m:t></m:r>`
}

const e = (inner: string) => `<m:e>${inner}</m:e>`

function miStyle(el: El, text: string): 'p' | 'b' | 'bi' | 'i' | undefined {
  switch (el.getAttribute('mathvariant')) {
    case 'normal':
      return 'p'
    case 'bold':
      return 'b'
    case 'bold-italic':
      return 'bi'
    case 'italic':
      return 'i'
  }
  const chars = [...text]
  if (chars.length > 1) return 'p' // nombres de función: det, ker, dim…
  // Latinas y griegas minúsculas se italizan solas en Word; el resto (ℝ, ℒ, 𝐯, Φ, ‖) va derecho.
  return /^[A-Za-zα-ωϕϑϖϱϵ]$/.test(text) ? undefined : 'p'
}

function spaceChar(width: string | null): string {
  const w = parseFloat(width ?? '0')
  if (!(w > 0.05)) return ''
  if (w < 0.2) return ' '
  if (w < 0.4) return ' '
  if (w < 0.8) return ' '
  return ' '
}

function delimited(beg: string, end: string, parts: string[], opts: { sep?: string; grow?: boolean } = {}): string {
  const pr =
    `<m:dPr><m:begChr m:val="${esc(beg)}"/>` +
    (opts.sep ? `<m:sepChr m:val="${esc(opts.sep)}"/>` : '') +
    `<m:endChr m:val="${esc(end)}"/>` +
    (opts.grow === false ? '<m:grow m:val="0"/>' : '') +
    '</m:dPr>'
  return `<m:d>${pr}${parts.map(e).join('')}</m:d>`
}

// ---------- tablas ----------

interface TableInfo {
  rows: El[][]
  /** Índices de columna después de las cuales hay una línea vertical (matriz aumentada). */
  ruleAfter: number[]
  alignedEquations: boolean
}

function tableInfo(table: El): TableInfo {
  const rows = kids(table).map((tr) => kids(tr))
  const ruleAfter: number[] = []
  const first = rows[0] ?? []
  first.forEach((cell, j) => {
    if (/border-right\s*:/.test(cell.getAttribute('style') ?? '') && j < first.length - 1) ruleAfter.push(j)
  })
  const alignedEquations = first.some((c) => (c.getAttribute('class') ?? '').includes('tml-right'))
  return { rows, ruleAfter, alignedEquations }
}

function matrixXml(rows: El[][], from: number, to: number): string {
  const count = to - from
  const mr = rows
    .map((cells) => `<m:mr>${Array.from({ length: count }, (_, k) => e(cells[from + k] ? row(kids(cells[from + k])) : '')).join('')}</m:mr>`)
    .join('')
  return (
    `<m:m><m:mPr><m:baseJc m:val="center"/><m:mcs><m:mc><m:mcPr><m:count m:val="${count}"/>` +
    `<m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>${mr}</m:m>`
  )
}

/** Marca el primer run de `xml` como punto de alineación (`<m:aln/>`), como hace Word con `&`. */
function withAlignment(xml: string): string {
  if (xml.startsWith('<m:r><m:rPr>')) return xml.replace('</m:rPr>', '<m:aln/></m:rPr>')
  if (xml.startsWith('<m:r>')) return xml.replace('<m:r>', '<m:r><m:rPr><m:aln/></m:rPr>')
  return `<m:r><m:rPr><m:aln/></m:rPr>${W_RPR}<m:t></m:t></m:r>${xml}`
}

function eqArrXml(rows: El[][]): string {
  const rs = rows
    .map((cells) => e(cells.map((c, j) => (j === 0 ? row(kids(c)) : withAlignment(row(kids(c))))).join('')))
    .join('')
  return `<m:eqArr><m:eqArrPr/>${rs}</m:eqArr>`
}

/** Una tabla dentro (o no) de delimitadores. */
function tableXml(table: El, beg = '', end = '', grow = true): string {
  const info = tableInfo(table)
  const ncols = Math.max(0, ...info.rows.map((r) => r.length))
  if (beg === '{' || (!beg && !end && info.alignedEquations)) {
    const arr = eqArrXml(info.rows)
    return beg || end ? delimited(beg, end, [arr], { grow }) : arr
  }
  const bounds = [0, ...info.ruleAfter.map((j) => j + 1), ncols]
  const groups: string[] = []
  for (let g = 0; g < bounds.length - 1; g++) groups.push(matrixXml(info.rows, bounds[g], bounds[g + 1]))
  if (groups.length === 1) return beg || end ? delimited(beg, end, groups, { grow }) : groups[0]
  // Matriz aumentada: [ A | b ] se representa como delimitador con separador "|".
  return delimited(beg, end, groups, { sep: '|', grow })
}
// ---------- elementos ----------

interface NaryInfo {
  chr: string
  sub?: El
  sup?: El
  kind: string
}

function unwrap(el: El): El {
  let cur = el
  while (name(cur) === 'mrow') {
    const k = kids(cur)
    if (k.length !== 1) break
    cur = k[0]
  }
  return cur
}

function naryInfo(input: El): NaryInfo | null {
  const el = unwrap(input)
  const n = name(el)
  if (n === 'mo') return NARY_CHARS.has(txt(el)) ? { chr: txt(el), kind: 'mo' } : null
  const k = kids(el)
  if (!k.length || name(k[0]) !== 'mo' || !NARY_CHARS.has(txt(k[0]))) return null
  const chr = txt(k[0])
  switch (n) {
    case 'msub':
    case 'munder':
      return { chr, sub: k[1], kind: n }
    case 'msup':
    case 'mover':
      return { chr, sup: k[1], kind: n }
    case 'msubsup':
    case 'munderover':
      return { chr, sub: k[1], sup: k[2], kind: n }
  }
  return null
}

function naryXml(info: NaryInfo, operand: string): string {
  const limLoc = NARY_UNDOVR.has(info.chr) ? 'undOvr' : 'subSup'
  const sub = info.sub ? row([info.sub]) : ''
  const sup = info.sup ? row([info.sup]) : ''
  const pr =
    `<m:naryPr><m:chr m:val="${esc(info.chr)}"/><m:limLoc m:val="${limLoc}"/><m:grow m:val="1"/>` +
    (info.sub ? '' : '<m:subHide m:val="1"/>') +
    (info.sup ? '' : '<m:supHide m:val="1"/>') +
    '</m:naryPr>'
  return `<m:nary>${pr}<m:sub>${sub}</m:sub><m:sup>${sup}</m:sup>${e(operand)}</m:nary>`
}

/** Convierte una secuencia de hermanos; los operadores n-arios (∑, ∫…) absorben su operando. */
function row(nodes: El[]): string {
  let out = ''
  for (let i = 0; i < nodes.length; i++) {
    const info = naryInfo(nodes[i])
    if (!info) {
      out += conv(nodes[i])
      continue
    }
    const operand: El[] = []
    let j = i + 1
    for (; j < nodes.length; j++) {
      if (name(nodes[j]) === 'mo' && OPERAND_STOP.has(txt(nodes[j]))) break
      operand.push(nodes[j])
    }
    out += naryXml(info, row(operand))
    i = j - 1
  }
  return out
}

function fenceOf(el: El): { beg: string; end: string; inner: El[]; grow: boolean } | null {
  const k = kids(el)
  if (k.length < 2) return null
  const a = k[0]
  const b = k[k.length - 1]
  if (name(a) !== 'mo' || name(b) !== 'mo') return null
  if (a.getAttribute('fence') !== 'true' || b.getAttribute('fence') !== 'true') return null
  return { beg: txt(a), end: txt(b), inner: k.slice(1, -1), grow: a.getAttribute('stretchy') !== 'false' }
}

function accentChar(el: El): string | null {
  if (name(el) !== 'mo') return null
  const c = txt(el)
  const cls = el.getAttribute('class') ?? ''
  if (el.getAttribute('accent') === 'true' || /vec|acc/.test(cls) || c in ACCENTS) return ACCENTS[c] ?? c
  return null
}

function conv(el: El): string {
  const k = kids(el)
  switch (name(el)) {
    case 'math':
    case 'mstyle':
    case 'mpadded':
    case 'mtd':
      return row(k)
    case 'semantics':
      return k.length ? conv(k[0]) : ''
    case 'annotation':
    case 'annotation-xml':
      return ''
    case 'mrow': {
      // Temml dibuja \boxed{…} como un mrow con borde en el estilo: en Word es un recuadro nativo.
      if (/border\s*:/.test(el.getAttribute('style') ?? '')) return `<m:borderBox>${e(row(k))}</m:borderBox>`
      const f = fenceOf(el)
      if (!f) return row(k)
      if (f.inner.length === 1 && name(f.inner[0]) === 'mtable') return tableXml(f.inner[0], f.beg, f.end, f.grow)
      return delimited(f.beg, f.end, [row(f.inner)], { grow: f.grow })
    }
    case 'mi': {
      const t = txt(el)
      return run(t, miStyle(el, t))
    }
    case 'mn':
      return run(txt(el))
    case 'mo':
      return run(txt(el))
    case 'mtext': {
      const t = el.textContent ?? ''
      return run(t, 'nor')
    }
    case 'mspace': {
      // Como texto normal: Word respeta los espacios de un renglón de texto y no los colapsa dentro de una fórmula.
      const w = parseFloat(el.getAttribute('width') ?? '0')
      return run(spaceChar(el.getAttribute('width')).repeat(w >= 1.5 ? 2 : 1), 'nor')
    }
    case 'msup':
      return `<m:sSup>${e(conv(k[0]))}<m:sup>${conv(k[1])}</m:sup></m:sSup>`
    case 'msub': {
      if (name(k[0]) === 'mi' && LIM_NAMES.has(txt(k[0])))
        return `<m:limLow>${e(run(txt(k[0]), 'p'))}<m:lim>${conv(k[1])}</m:lim></m:limLow>`
      return `<m:sSub>${e(conv(k[0]))}<m:sub>${conv(k[1])}</m:sub></m:sSub>`
    }
    case 'msubsup':
      return `<m:sSubSup>${e(conv(k[0]))}<m:sub>${conv(k[1])}</m:sub><m:sup>${conv(k[2])}</m:sup></m:sSubSup>`
    case 'munder':
      return `<m:limLow>${e(conv(k[0]))}<m:lim>${conv(k[1])}</m:lim></m:limLow>`
    case 'mover': {
      const chr = accentChar(k[1])
      if (chr) return `<m:acc><m:accPr><m:chr m:val="${esc(chr)}"/></m:accPr>${e(conv(k[0]))}</m:acc>`
      return `<m:limUpp>${e(conv(k[0]))}<m:lim>${conv(k[1])}</m:lim></m:limUpp>`
    }
    case 'munderover':
      return `<m:limUpp>${e(`<m:limLow>${e(conv(k[0]))}<m:lim>${conv(k[1])}</m:lim></m:limLow>`)}<m:lim>${conv(k[2])}</m:lim></m:limUpp>`
    case 'mfrac': {
      const thick = el.getAttribute('linethickness')
      const noBar = thick !== null && parseFloat(thick) === 0
      const pr = noBar ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : ''
      return `<m:f>${pr}<m:num>${conv(k[0])}</m:num><m:den>${conv(k[1])}</m:den></m:f>`
    }
    case 'msqrt':
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/>${e(row(k))}</m:rad>`
    case 'mroot':
      return `<m:rad><m:radPr/><m:deg>${conv(k[1])}</m:deg>${e(conv(k[0]))}</m:rad>`
    case 'menclose': {
      const notation = el.getAttribute('notation') ?? ''
      if (notation === 'top' || notation === 'bottom')
        return `<m:bar><m:barPr><m:pos m:val="${notation === 'top' ? 'top' : 'bot'}"/></m:barPr>${e(row(k))}</m:bar>`
      return `<m:borderBox>${e(row(k))}</m:borderBox>`
    }
    case 'mphantom':
      return `<m:phant><m:phantPr><m:show m:val="0"/></m:phantPr>${e(row(k))}</m:phant>`
    case 'mtable':
      return tableXml(el)
    default:
      return k.length ? row(k) : run(txt(el))
  }
}

/** Convierte LaTeX a un `<m:oMath>` (o `<m:oMathPara>` si es una ecuación destacada). */
export function latexToOmml(latex: string, display: boolean): OmmlResult {
  try {
    // Una fórmula que termina en un operador (el alumno dejó un "=" sin resultado) se rellena con un espacio:
    // sin operando, Word/LibreOffice dibujan un marcador de error ("¿").
    if (/[=+\-<>]\s*$/.test(latex)) latex = `${latex.trimEnd()}\\;`
    const mathml = temml.renderToString(latex, { xml: true, throwOnError: true, strict: false, displayMode: display })
    const doc = new DOMParser({ onError: () => {} }).parseFromString(mathml, 'text/xml')
    const root = doc.documentElement
    if (!root) return { ok: false, error: 'MathML vacío' }
    const body = `<m:oMath>${conv(root as unknown as El)}</m:oMath>`
    return { ok: true, xml: display ? `<m:oMathPara>${body}</m:oMathPara>` : body }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
