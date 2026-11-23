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

  for (const f of failedFormulas) errors.push(`Fórmula que no se puede convertir a ecuación de Word: ${f.latex}  →  ${f.error}`)

  const unclear = (m.body.match(/\[\?\]/g) ?? []).length
  if (unclear) needsReview.push(`${unclear} fragmento(s) marcados [?] (ilegibles): requieren a la persona.`)
  const graphs = (m.body.match(/\[Gr[aá]fica/gi) ?? []).length
  if (graphs) needsReview.push(`${graphs} gráfica(s) solo descritas con texto: aún no se dibujan.`)
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
