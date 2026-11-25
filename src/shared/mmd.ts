// Parser mínimo de Mathpix Markdown (MMD) → bloques. Se usa tanto en la vista previa
// como en la exportación a DOCX, de modo que lo que se ve es lo que se descarga.

export type Inline =
  | { t: 'text'; text: string; bold?: boolean }
  | { t: 'math'; latex: string }

export type Block =
  | { t: 'para'; inlines: Inline[]; heading?: number }
  | { t: 'display'; latex: string }
  | { t: 'table'; rows: Inline[][][] }
  /** Gráfica descrita en JSON dentro de un bloque ```grafica … ``` (ver figure.ts). */
  | { t: 'figure'; source: string }

const BLOCK_RE = new RegExp(
  [
    String.raw`\$\$([\s\S]+?)\$\$`, // 1: $$ … $$
    String.raw`\\\[([\s\S]+?)\\\]`, // 2: \[ … \]
    String.raw`\\begin\{(equation\*?|align\*?|gather\*?|eqnarray\*?)\}([\s\S]+?)\\end\{\3\}`, // 3,4
    String.raw`\\begin\{tabular\}(?:\{[^}]*\})?([\s\S]+?)\\end\{tabular\}`, // 5
    String.raw`` + '`' + String.raw`{3}grafica[ \t]*\n([\s\S]*?)` + '`' + String.raw`{3}`, // 6: ```grafica … ```
  ].join('|'),
  'g',
)

const INLINE_RE = /\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  const pushText = (s: string) => {
    if (!s) return
    // **negrita** mínima
    const parts = s.split(/\*\*(.+?)\*\*/g)
    parts.forEach((p, i) => {
      if (!p) return
      out.push(i % 2 === 1 ? { t: 'text', text: p, bold: true } : { t: 'text', text: p })
    })
  }
  for (const m of text.matchAll(INLINE_RE)) {
    pushText(text.slice(last, m.index))
    const latex = (m[1] ?? m[2] ?? '').trim()
    if (latex) out.push({ t: 'math', latex })
    last = (m.index ?? 0) + m[0].length
  }
  pushText(text.slice(last))
  return out
}

/** Tabla de barras (`| a | b |` con renglón `|---|---|`): se convierte en tabla de Word. */
function parsePipeTable(lines: string[]): Inline[][][] {
  const rows: Inline[][][] = []
  for (const l of lines) {
    const t = l.trim()
    if (/^\|?[\s:|-]*-[\s:|-]*\|?$/.test(t)) continue // renglón separador
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/)
    rows.push(cells.map((c) => parseInline(c.trim())))
  }
  return rows
}

function parseTextChunk(chunk: string, blocks: Block[]) {
  const all = chunk.split('\n')
  for (let i = 0; i < all.length; i++) {
    const raw = all[i]
    const line = raw.trim()
    if (!line) continue
    if (/^\|.*\|$/.test(line) && !line.includes('$$')) {
      const grupo = [line]
      while (i + 1 < all.length && /^\|.*\|$/.test(all[i + 1].trim())) grupo.push(all[++i].trim())
      const rows = parsePipeTable(grupo)
      if (rows.length) {
        blocks.push({ t: 'table', rows })
        continue
      }
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    const body = h ? h[2] : line
    const inlines = parseInline(body)
    if (!inlines.length) continue
    // Una línea formada solo por una fórmula se trata como ecuación destacada.
    if (!h && inlines.length === 1 && inlines[0].t === 'math') {
      blocks.push({ t: 'display', latex: inlines[0].latex })
      continue
    }
    blocks.push(h ? { t: 'para', inlines, heading: h[1].length } : { t: 'para', inlines })
  }
}

function parseTabular(body: string): Inline[][][] {
  const rows: Inline[][][] = []
  for (const rawRow of body.split(/\\\\/)) {
    const row = rawRow.replace(/\\hline/g, '').trim()
    if (!row) continue
    rows.push(row.split(/(?<!\\)&/).map((c) => parseInline(c.trim())))
  }
  return rows
}

export function parseMmd(source: string): Block[] {
  const text = source.replace(/\r\n?/g, '\n')
  const blocks: Block[] = []
  let last = 0
  for (const m of text.matchAll(BLOCK_RE)) {
    parseTextChunk(text.slice(last, m.index), blocks)
    last = (m.index ?? 0) + m[0].length
    if (m[6] !== undefined) {
      blocks.push({ t: 'figure', source: m[6].trim() })
    } else if (m[5] !== undefined) {
      const rows = parseTabular(m[5])
      if (rows.length) blocks.push({ t: 'table', rows })
    } else if (m[3] !== undefined) {
      const env = m[3].replace('*', '')
      const body = m[4].trim()
      if (env === 'align' || env === 'eqnarray') blocks.push({ t: 'display', latex: `\\begin{aligned}${body}\\end{aligned}` })
      else if (env === 'gather') blocks.push({ t: 'display', latex: `\\begin{gathered}${body}\\end{gathered}` })
      else blocks.push({ t: 'display', latex: body })
    } else {
      const latex = (m[1] ?? m[2] ?? '').trim()
      if (latex) blocks.push({ t: 'display', latex })
    }
  }
  parseTextChunk(text.slice(last), blocks)
  return blocks
}

/** Todas las fórmulas (en orden de lectura) de un texto MMD. */
export function extractEquations(source: string): string[] {
  const eqs: string[] = []
  const visitInlines = (xs: Inline[]) => xs.forEach((i) => i.t === 'math' && eqs.push(i.latex))
  for (const b of parseMmd(source)) {
    if (b.t === 'display') eqs.push(b.latex)
    else if (b.t === 'para') visitInlines(b.inlines)
    else if (b.t === 'table') b.rows.forEach((r) => r.forEach(visitInlines))
  }
  return eqs
}

/** Texto sin fórmulas, para medir CER/WER del texto en español por separado. */
export function extractPlainText(source: string): string {
  const parts: string[] = []
  const visitInlines = (xs: Inline[]) =>
    parts.push(xs.map((i) => (i.t === 'text' ? i.text : '')).join(''))
  for (const b of parseMmd(source)) {
    if (b.t === 'para') visitInlines(b.inlines)
    else if (b.t === 'table') b.rows.forEach((r) => r.forEach(visitInlines))
  }
  return parts.join('\n')
}
