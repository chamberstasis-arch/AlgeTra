// Lógica pura del entorno de trabajo del agente (sin E/S): marcas, validación y reglas de cierre.
import { extractEquations } from '../src/shared/mmd'
import type { ChecksResponse } from '../src/shared/types'

export interface Markers {
  /** Ejercicios de la base indicados por el agente (`<!-- ejercicio: act-01/1 -->`). */
  refs: string[]
  /** Dudas del agente (`<!-- DUDA: ... -->`). */
  doubts: string[]
  /** Texto sin comentarios: es lo que se mide y se exporta. */
  body: string
}

/** Los comentarios HTML son el canal del agente hacia la persona; no llegan al DOCX. */
export function parseMarkers(source: string): Markers {
  const refs: string[] = []
  const doubts: string[] = []
  const body = source
    .replace(/<!--([\s\S]*?)-->/g, (_, inner: string) => {
      const t = inner.trim()
      const ej = /^ejercicios?\s*:\s*(.+)$/i.exec(t)
      if (ej) refs.push(...ej[1].split(/[,\s]+/).filter(Boolean))
      else if (/^duda\s*:/i.test(t)) doubts.push(t.replace(/^duda\s*:\s*/i, ''))
      return ''
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { refs: [...new Set(refs)], doubts, body }
}

export interface Lint {
  /** Impiden cerrar. */
  errors: string[]
  /** Obligan a enviar la hoja a revisión humana, pero no impiden cerrar. */
  needsReview: string[]
  /** Informativos. */
  info: string[]
}

/** `$` sin cerrar suele significar una fórmula truncada: el resto de la hoja se leería como matemática. */
export function dollarBalance(body: string): { display: number; inline: number } {
  const s = body.replace(/\\\$/g, '')
  const display = (s.match(/\$\$/g) ?? []).length
  const inline = (s.replace(/\$\$/g, '').match(/\$/g) ?? []).length
  return { display, inline }
}

export function lintTranscription(m: Markers, checks: ChecksResponse | null, failedFormulas: { latex: string; error: string }[]): Lint {
  const errors: string[] = []
  const needsReview: string[] = []
  const info: string[] = []

  if (m.body.replace(/\s/g, '').length < 3) errors.push('La transcripción está vacía.')

  const bal = dollarBalance(m.body)
  if (bal.display % 2) errors.push('Hay un `$$` sin cerrar.')
  if (bal.inline % 2) errors.push('Hay un `$` sin cerrar.')

  for (const f of failedFormulas)
    errors.push(f.latex === 'gráfica' ? `Gráfica no válida: ${f.error}` : `Fórmula que no se puede convertir a ecuación de Word: ${f.latex}  →  ${f.error}`)

  const unclear = (m.body.match(/\[\?\]/g) ?? []).length
  if (unclear) needsReview.push(`${unclear} fragmento(s) marcados [?] (ilegibles): requieren a la persona.`)
  const graphs = (m.body.match(/\[Gr[aá]fica/gi) ?? []).length
  if (graphs) needsReview.push(`${graphs} gráfica(s) solo descritas con texto: aún no se dibujan.`)
  const inferred = (m.body.match(/"escala"\s*:\s*"inferida"/g) ?? []).length
  if (inferred) needsReview.push(`${inferred} gráfica(s) con escala inferida: la persona debe confirmarla.`)
  const figs = (m.body.match(/```grafica/g) ?? []).length
  if (figs) info.push(`${figs} gráfica(s) dibujada(s) desde su descripción.`)
  if (m.doubts.length) needsReview.push(`${m.doubts.length} duda(s) declaradas por el agente.`)

  if (checks) {
    const bad = checks.consistency.checks.filter((c) => c.status === 'inconsistent')
    for (const c of bad) {
      const cells = (c.cells ?? []).map((x) => `celda (${x.row},${x.col}): escrito ${x.right}, esperado ${x.left}`).join('; ')
      errors.push(
        `La aritmética no cuadra en  ${c.latex}  →  ${c.detail}${cells ? ` [${cells}]` : ''}. ` +
          'Vuelve a mirar la imagen en esa celda: o es un dígito mal leído, o el error es del alumno (se transcribe tal cual).',
      )
    }
    info.push(`Aritmética: ${checks.consistency.verified} verificada(s), ${checks.consistency.inconsistent} inconsistente(s), ${checks.consistency.unverifiable} no verificable(s).`)
    for (const e of checks.exercises)
      info.push(`Ejercicio ${e.ref}: respuesta esperada ${e.status === 'found' ? 'ENCONTRADA' : e.status === 'mismatch' ? 'con valor distinto' : e.status === 'not-found' ? 'NO encontrada' : 'no verificable'}.`)
  }
  info.push(`${extractEquations(m.body).length} fórmula(s) detectada(s).`)
  return { errors, needsReview, info }
}

/** Una aritmética inconsistente no se resuelve sola: el agente debe atestiguar con `--revisado` que reexaminó la imagen. */
export const isArithmeticError = (e: string) => e.startsWith('La aritmética no cuadra')

export function safeId(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'hoja'
  )
}

// ───────── Ensamblado de una entrega: segmentos por ejercicio/inciso, en el orden correcto ─────────

export interface Segment {
  act: string
  ej: string
  inciso: string
  /** Número de hoja dentro de la entrega y posición dentro de la hoja, para estabilidad del orden. */
  page: number
  text: string
  marked: boolean
}

const REF_RE = /^(.+?)\/(\d+)([a-z]?)$/i

/** Parte una transcripción en segmentos en cada `<!-- ejercicio: … -->` o `<!-- inciso: … -->`. */
export function splitSegments(source: string, page: number): Segment[] {
  const segs: Segment[] = []
  let cur: Segment = { act: '', ej: '', inciso: '', page, text: '', marked: false }
  const flush = (t: string) => {
    cur.text += parseMarkers(t).body
  }
  const re = /<!--\s*(ejercicio|inciso)\s*:\s*([\s\S]*?)\s*-->/gi
  let last = 0
  for (const m of source.matchAll(re)) {
    flush(source.slice(last, m.index))
    last = (m.index ?? 0) + m[0].length
    segs.push(cur)
    if (m[1].toLowerCase() === 'ejercicio') {
      const first = m[2].split(/[,\s]+/)[0] ?? ''
      const r = REF_RE.exec(first)
      cur = { act: r ? r[1] : first, ej: r ? r[2] : '', inciso: r ? r[3].toLowerCase() : '', page, text: '', marked: true }
    } else {
      cur = { ...cur, inciso: m[2].trim().toLowerCase().replace(/[^a-z0-9ivx]/g, ''), text: '', marked: true }
    }
  }
  flush(source.slice(last))
  segs.push(cur)
  return segs.filter((s) => s.text.trim())
}

const nat = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true })

/**
 * Ordena por actividad → ejercicio → inciso. Un segmento sin marca es continuación del anterior y se queda con él.
 * Con `keepOriginal` se respeta el orden de las fotos.
 */
export function orderSegments(segs: Segment[], keepOriginal = false): Segment[] {
  const keyed: (Segment & { idx: number })[] = []
  let k = { act: '', ej: '', inciso: '' }
  segs.forEach((s, idx) => {
    if (s.marked) k = { act: s.act, ej: s.ej, inciso: s.inciso }
    keyed.push({ ...s, ...k, idx })
  })
  if (!keepOriginal) keyed.sort((a, b) => nat(a.act, b.act) || nat(a.ej, b.ej) || nat(a.inciso, b.inciso) || a.idx - b.idx)
  return keyed
}
