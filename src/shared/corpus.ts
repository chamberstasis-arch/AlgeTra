// Formato del corpus: un archivo Markdown por actividad, fácil de escribir a mano.
//
//   ---
//   id: act-01
//   titulo: Suma de matrices
//   tema: operaciones-matriciales
//   ---
//
//   ## Ejercicio 1
//   Enunciado en Markdown con $fórmulas$…
//
//   **Respuesta:** $$\begin{pmatrix}6 & 8\\10 & 12\end{pmatrix}$$
//
// La respuesta es el RESULTADO FINAL, no el procedimiento: la resolución del alumno puede variar.

import { extractEquations } from './mmd'
import { evaluateLatex } from './linalg'
import type { Activity, Exercise } from './types'

const ANSWER_RE = /^\s*(?:\*\*)?(?:Respuestas?|Resultado)(?:\*\*)?\s*:?\s*(?:\*\*)?/im

function frontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(src)
  if (!m) return { meta: {}, body: src }
  const meta: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const kv = /^([\wáéíóúñ-]+)\s*:\s*(.*)$/i.exec(line.trim())
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim()
  }
  return { meta, body: src.slice(m[0].length) }
}

export function parseActivity(src: string, file: string): Activity {
  const { meta, body } = frontmatter(src.replace(/\r\n?/g, '\n'))
  const warnings: string[] = []
  const id = meta.id || file.replace(/\.md$/i, '')
  if (!meta.id) warnings.push(`Falta "id" en el encabezado; se usa "${id}".`)

  const exercises: Exercise[] = []
  const parts = body.split(/^##\s+Ejercicio\s+(\S+)\s*$/im)
  // parts = [preámbulo, num1, cuerpo1, num2, cuerpo2, …]
  for (let i = 1; i < parts.length; i += 2) {
    const number = parts[i]
    const section = parts[i + 1]
    const split = ANSWER_RE.exec(section)
    const statement = (split ? section.slice(0, split.index) : section).trim()
    const answerText = split ? section.slice(split.index + split[0].length).trim() : ''
    const answers = extractEquations(answerText)
    const ref = `${id}/${number}`
    if (!statement) warnings.push(`${ref}: sin enunciado.`)
    if (!split) warnings.push(`${ref}: sin "**Respuesta:**"; no se podrá verificar la respuesta final.`)
    else if (!answers.length && !answerText) warnings.push(`${ref}: la respuesta está vacía.`)
    for (const a of answers) {
      const r = evaluateLatex(a)
      if (!r.ok) warnings.push(`${ref}: la respuesta "${a.slice(0, 40)}" no es evaluable (${r.reason}); se mostrará pero no se verificará automáticamente.`)
    }
    exercises.push({ ref, number, statement, answerText, answers })
  }
  const dup = exercises.map((e) => e.number).filter((n, i, a) => a.indexOf(n) !== i)
  dup.forEach((n) => warnings.push(`Ejercicio ${n} repetido.`))
  if (!exercises.length) warnings.push('No se encontraron ejercicios (se espera "## Ejercicio N").')

  return { id, title: meta.titulo || meta.title || id, topic: meta.tema || meta.topic, file, exercises, warnings }
}
