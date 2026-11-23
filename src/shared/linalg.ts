// Verificación aritmética de lo que el alumno escribió, en aritmética exacta (fracciones).
//
// Idea: si la transcripción dice `A + B = C` con matrices numéricas, se puede calcular. Si el
// resultado no coincide, o el OCR leyó mal un dígito o el alumno se equivocó; en ambos casos
// conviene señalar la celda. Lo que no se puede evaluar (variables, símbolos) se marca
// "no verificable" y nunca se presenta como correcto.

import { extractEquations } from './mmd'

// ---------- fracciones exactas ----------

export interface Frac {
  n: bigint
  d: bigint
}

const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}

export function frac(n: bigint, d: bigint = 1n): Frac {
  if (d === 0n) throw new Error('división entre cero')
  if (d < 0n) {
    n = -n
    d = -d
  }
  const g = gcd(n, d) || 1n
  return { n: n / g, d: d / g }
}

const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d)
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n)
const eq = (a: Frac, b: Frac) => a.n === b.n && a.d === b.d
const ZERO = frac(0n)

export function fracToString(f: Frac): string {
  return f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`
}

/** Entero, decimal, `a/b`, `\frac{a}{b}`, `\frac12`, con signo. `null` si no es un número literal. */
export function parseNumber(raw: string): Frac | null {
  const s = raw
    .replace(/\\[,;: !]/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, '')
    .replace(/[−–]/g, '-')
  let m = /^([+-]?)(\d+)(?:[.,](\d+))?$/.exec(s)
  if (m) {
    const digits = m[3] ?? ''
    const n = BigInt(m[2] + digits)
    return frac(m[1] === '-' ? -n : n, 10n ** BigInt(digits.length))
  }
  m = /^([+-]?)\\[dt]?frac\{?(-?\d+)\}?\{?(\d+)\}?$/.exec(s) ?? /^([+-]?)(\d+)\/(\d+)$/.exec(s)
  if (m) {
    const n = BigInt(m[2])
    return frac(m[1] === '-' ? -n : n, BigInt(m[3]))
  }
  return null
}

// ---------- valores ----------

export interface Mat {
  kind: 'mat'
  rows: Frac[][]
  /** Matriz con barras verticales (`vmatrix`): se interpreta como determinante. */
  det?: boolean
}
export interface Scalar {
  kind: 'scalar'
  v: Frac
}
export type Value = Mat | Scalar

const dims = (m: Mat) => `${m.rows.length}×${m.rows[0]?.length ?? 0}`

function valueEquals(a: Value, b: Value): boolean {
  if (a.kind === 'scalar' && b.kind === 'scalar') return eq(a.v, b.v)
  if (a.kind === 'mat' && b.kind === 'mat')
    return (
      a.rows.length === b.rows.length &&
      a.rows.every((r, i) => r.length === b.rows[i].length && r.every((x, j) => eq(x, b.rows[i][j])))
    )
  return false
}

export function valueToString(v: Value): string {
  return v.kind === 'scalar' ? fracToString(v.v) : `[${v.rows.map((r) => r.map(fracToString).join(', ')).join(' ; ')}]`
}

/** Celdas que difieren entre dos matrices de la misma dimensión (1-indexadas). */
export function diffCells(a: Mat, b: Mat): { row: number; col: number; left: string; right: string }[] {
  const out: { row: number; col: number; left: string; right: string }[] = []
  if (a.rows.length !== b.rows.length || a.rows[0]?.length !== b.rows[0]?.length) return out
  a.rows.forEach((r, i) =>
    r.forEach((x, j) => {
      if (!eq(x, b.rows[i][j])) out.push({ row: i + 1, col: j + 1, left: fracToString(x), right: fracToString(b.rows[i][j]) })
    }),
  )
  return out
}

// ---------- operaciones ----------

function matMul(a: Mat, b: Mat): Mat {
  const n = a.rows.length
  const k = a.rows[0].length
  const m = b.rows[0].length
  if (k !== b.rows.length) throw new Error(`producto inválido ${dims(a)} · ${dims(b)}`)
  return {
    kind: 'mat',
    rows: Array.from({ length: n }, (_, i) =>
      Array.from({ length: m }, (_, j) => a.rows[i].reduce((acc, x, t) => add(acc, mul(x, b.rows[t][j])), ZERO)),
    ),
  }
}

export function determinant(m: Mat): Frac {
  const n = m.rows.length
  if (!n || m.rows.some((r) => r.length !== n)) throw new Error('el determinante requiere una matriz cuadrada')
  const a = m.rows.map((r) => [...r])
  let det = frac(1n)
  for (let c = 0; c < n; c++) {
    let p = c
    while (p < n && a[p][c].n === 0n) p++
    if (p === n) return ZERO
    if (p !== c) {
      ;[a[p], a[c]] = [a[c], a[p]]
      det = frac(-det.n, det.d)
    }
    det = mul(det, a[c][c])
    for (let r = c + 1; r < n; r++) {
      const f = div(a[r][c], a[c][c])
      for (let k = c; k < n; k++) a[r][k] = sub(a[r][k], mul(f, a[c][k]))
    }
  }
  return det
}

const transpose = (m: Mat): Mat => ({ kind: 'mat', rows: m.rows[0].map((_, j) => m.rows.map((r) => r[j])) })

function binary(op: '+' | '-' | '*', a: Value, b: Value): Value {
  if (op === '*') {
    if (a.kind === 'scalar' && b.kind === 'scalar') return { kind: 'scalar', v: mul(a.v, b.v) }
    if (a.kind === 'scalar' && b.kind === 'mat') return { kind: 'mat', rows: b.rows.map((r) => r.map((x) => mul(a.v, x))) }
    if (a.kind === 'mat' && b.kind === 'scalar') return { kind: 'mat', rows: a.rows.map((r) => r.map((x) => mul(x, b.v))) }
    return matMul(a as Mat, b as Mat)
  }
  const f = op === '+' ? add : sub
  if (a.kind === 'scalar' && b.kind === 'scalar') return { kind: 'scalar', v: f(a.v, b.v) }
  if (a.kind === 'mat' && b.kind === 'mat') {
    if (a.rows.length !== b.rows.length || a.rows[0].length !== b.rows[0].length)
      throw new Error(`dimensiones distintas ${dims(a)} y ${dims(b)}`)
    return { kind: 'mat', rows: a.rows.map((r, i) => r.map((x, j) => f(x, b.rows[i][j]))) }
  }
  throw new Error('no se puede sumar un escalar y una matriz')
}

// ---------- extracción de matrices ----------

// Grupos: 1 = delimitador izquierdo (`\left|` marca un determinante), 2 = entorno, 3 = cuerpo.
const MATRIX_RE =
  /(?:\\left\s*([(\[|])\s*)?\\begin\{(pmatrix|bmatrix|vmatrix|Bmatrix|Vmatrix|matrix|array)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{\2\}(?:\s*\\right\s*[)\]|])?/g

/** Una celda numérica; admite operaciones sencillas como `1+5` o `2\\cdot3`. */
function parseCell(raw: string): Frac | null {
  const n = parseNumber(raw)
  if (n) return n
  const r = evaluate(raw, [])
  return r.ok && r.value.kind === 'scalar' ? r.value.v : null
}

function parseMatrix(env: string, body: string, fence?: string): Mat | null {
  const rows = body
    .split(/\\\\/)
    .map((r) => r.replace(/\\hline/g, '').trim())
    .filter(Boolean)
    .map((r) => r.split('&').map(parseCell))
  if (!rows.length || rows.some((r) => r.length !== rows[0].length || r.some((c) => c === null))) return null
  return { kind: 'mat', rows: rows as Frac[][], det: env === 'vmatrix' || fence === '|' }
}

// ---------- evaluación de una expresión ----------

class Unverifiable extends Error {}

class Parser {
  private i = 0
  constructor(
    private s: string,
    private slots: (Mat | null)[],
  ) {}

  parse(): Value {
    const v = this.expr()
    if (this.i < this.s.length) throw new Unverifiable(`símbolo no evaluable: ${this.s.slice(this.i, this.i + 12)}`)
    return v
  }

  private peek = () => this.s[this.i]

  private expr(): Value {
    let v = this.term()
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.s[this.i++] as '+' | '-'
      v = binary(op, v, this.term())
    }
    return v
  }

  private term(): Value {
    let v = this.signed()
    for (;;) {
      const c = this.peek()
      if (c === '*') {
        this.i++
        v = binary('*', v, this.signed())
      } else if (c === '@' || c === '(' || (c !== undefined && /\d/.test(c)) || /^\\(?:[dt]?frac|det)/.test(this.s.slice(this.i))) {
        v = binary('*', v, this.signed()) // multiplicación implícita: 2@0, @0@1, 3(…)
      } else break
    }
    return v
  }

  private signed(): Value {
    if (this.peek() === '-') {
      this.i++
      return binary('*', { kind: 'scalar', v: frac(-1n) }, this.signed())
    }
    if (this.peek() === '+') {
      this.i++
      return this.signed()
    }
    return this.postfix()
  }

  private postfix(): Value {
    let v = this.atom()
    for (;;) {
      const m = /^\^(?:\{([^}]*)\}|(\w|\\top))/.exec(this.s.slice(this.i))
      if (!m) break
      const e = (m[1] ?? m[2]).trim()
      this.i += m[0].length
      if (v.kind !== 'mat') {
        if (/^\d+$/.test(e) && Number(e) <= 6) {
          let r: Value = v
          for (let k = 1; k < Number(e); k++) r = binary('*', r, v)
          v = r
          continue
        }
        throw new Unverifiable('potencia no evaluable')
      }
      if (e === 'T' || e === '\\top' || e === '\\mathsf{T}' || e === 't') v = transpose(v)
      else if (/^\d+$/.test(e) && Number(e) <= 6 && v.rows.length === v.rows[0].length) {
        let r: Value = v
        for (let k = 1; k < Number(e); k++) r = binary('*', r, v)
        v = r
      } else throw new Unverifiable('potencia de matriz no evaluable')
    }
    return v
  }

  private atom(): Value {
    const rest = this.s.slice(this.i)
    let m = /^@(\d+)/.exec(rest)
    if (m) {
      this.i += m[0].length
      const slot = this.slots[Number(m[1])]
      if (!slot) throw new Unverifiable('matriz con entradas no numéricas')
      return slot.det ? { kind: 'scalar', v: determinant(slot) } : slot
    }
    if (rest.startsWith('\\det')) {
      this.i += 4
      if (this.peek() === '(') {
        this.i++
        const inner = this.expr()
        if (this.peek() !== ')') throw new Unverifiable('paréntesis sin cerrar')
        this.i++
        if (inner.kind !== 'mat') throw new Unverifiable('det de un no-matriz')
        return { kind: 'scalar', v: determinant({ ...inner, det: false }) }
      }
      const inner = this.atom()
      if (inner.kind === 'scalar') throw new Unverifiable('det de un escalar')
      return { kind: 'scalar', v: determinant({ ...inner, det: false }) }
    }
    if (this.peek() === '(') {
      this.i++
      const v = this.expr()
      if (this.peek() !== ')') throw new Unverifiable('paréntesis sin cerrar')
      this.i++
      return v
    }
    m = /^\\[dt]?frac\{(-?\d+)\}\{(\d+)\}/.exec(rest) ?? /^\\[dt]?frac(\d)(\d)/.exec(rest)
    if (m) {
      this.i += m[0].length
      return { kind: 'scalar', v: frac(BigInt(m[1]), BigInt(m[2])) }
    }
    m = /^\d+(?:[.,]\d+)?/.exec(rest)
    if (m) {
      this.i += m[0].length
      return { kind: 'scalar', v: parseNumber(m[0])! }
    }
    throw new Unverifiable(`símbolo no evaluable: ${rest.slice(0, 12)}`)
  }
}

function normalizeExpr(s: string): string {
  return s
    .replace(/\\operatorname\{det\}/g, '\\det')
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times|\\ast|·|×/g, '*')
    .replace(/\\[,;:! ]|\\quad|\\qquad|~/g, '')
    .replace(/[−–]/g, '-')
    .replace(/\\mathbf|\\boldsymbol/g, '')
    .replace(/\s+/g, '')
}

export type EvalResult = { ok: true; value: Value } | { ok: false; reason: string }

function evaluate(expr: string, slots: (Mat | null)[]): EvalResult {
  try {
    if (!expr.trim()) return { ok: false, reason: 'vacío' }
    return { ok: true, value: new Parser(normalizeExpr(expr), slots).parse() }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

/** Evalúa una expresión LaTeX completa (p. ej. la respuesta esperada). */
export function evaluateLatex(latex: string): EvalResult {
  const slots: (Mat | null)[] = []
  const replaced = latex.replace(MATRIX_RE, (_m, fence: string | undefined, env: string, body: string) => {
    slots.push(parseMatrix(env, body, fence))
    return `@${slots.length - 1}`
  })
  return evaluate(replaced, slots)
}

/** Un lado que es solo una matriz o un número escrito (no una operación). */
function literalValue(side: string, slots: (Mat | null)[]): Value | null {
  const m = /^@(\d+)$/.exec(side)
  if (m) {
    const slot = slots[Number(m[1])]
    return slot && !slot.det ? slot : null
  }
  const n = parseNumber(side)
  return n ? { kind: 'scalar', v: n } : null
}

// ---------- verificación de una ecuación ----------

export type CheckStatus = 'ok' | 'inconsistent' | 'unverifiable'

export interface EquationCheck {
  latex: string
  status: CheckStatus
  /** Explicación breve en español. */
  detail: string
  /** Celdas distintas entre los lados (solo si `inconsistent` y ambos son matrices). */
  cells?: { row: number; col: number; left: string; right: string }[]
  /** Valores evaluados de cada lado (los no evaluables son `null`). */
  sides: (Value | null)[]
  /** Valores que el alumno *escribió tal cual* (matriz o número literal), no los calculados. */
  written: Value[]
}

export function checkEquation(latex: string): EquationCheck {
  const slots: (Mat | null)[] = []
  const replaced = latex.replace(MATRIX_RE, (_m, fence: string | undefined, env: string, body: string) => {
    slots.push(parseMatrix(env, body, fence))
    return `@${slots.length - 1}`
  })
  // Se parte por `=` de nivel superior; `\neq`, `\leq`… no contienen "=".
  const parts = replaced.split('=').map((p) => p.trim())
  if (parts.length < 2) return { latex, status: 'unverifiable', detail: 'No es una igualdad.', sides: [], written: [] }

  const results = parts.map((p) => evaluate(p, slots))
  const written = parts.flatMap((p) => {
    const lit = literalValue(normalizeExpr(p), slots)
    return lit ? [lit] : []
  })
  const sides = results.map((r) => (r.ok ? r.value : null))
  const evaluable = results.flatMap((r, i) => (r.ok ? [{ i, v: r.value }] : []))
  if (evaluable.length < 2) {
    const why = results.find((r) => !r.ok)
    return { latex, status: 'unverifiable', detail: why && !why.ok ? `No evaluable: ${why.reason}.` : 'No evaluable.', sides, written }
  }

  const first = evaluable[0]
  for (const other of evaluable.slice(1)) {
    if (!valueEquals(first.v, other.v)) {
      const cells = first.v.kind === 'mat' && other.v.kind === 'mat' ? diffCells(first.v, other.v) : undefined
      const detail =
        first.v.kind === 'mat' && other.v.kind === 'mat' && !cells?.length
          ? `Dimensiones distintas: ${dims(first.v)} frente a ${dims(other.v)}.`
          : cells?.length
            ? `Celdas que no coinciden: ${cells.map((c) => `(${c.row},${c.col}): ${c.left} ≠ ${c.right}`).join('; ')}.`
            : `Los lados valen ${valueToString(first.v)} y ${valueToString(other.v)}.`
      return { latex, status: 'inconsistent', detail, cells, sides, written }
    }
  }
  return { latex, status: 'ok', detail: 'La aritmética es consistente.', sides, written }
}

// ---------- verificación de una transcripción ----------

export interface ConsistencyReport {
  checks: EquationCheck[]
  verified: number
  inconsistent: number
  unverifiable: number
}

export function checkTranscription(text: string): ConsistencyReport {
  const checks = extractEquations(text).map(checkEquation)
  return {
    checks,
    verified: checks.filter((c) => c.status === 'ok').length,
    inconsistent: checks.filter((c) => c.status === 'inconsistent').length,
    unverifiable: checks.filter((c) => c.status === 'unverifiable').length,
  }
}

// ---------- respuesta esperada ----------

import type { AnswerStatus } from './types'
export type { AnswerStatus }

export interface AnswerCheck {
  expected: string
  status: AnswerStatus
  detail: string
}

/**
 * ¿Aparece la respuesta esperada entre los valores que el alumno escribió?
 * La resolución puede variar; el resultado final no. Se acepta cualquier lado de cualquier
 * igualdad, para no depender del método ni del orden.
 */
export function checkExpectedAnswer(expectedLatex: string, text: string): AnswerCheck {
  const exp = evaluateLatex(expectedLatex)
  if (!exp.ok) return { expected: expectedLatex, status: 'unverifiable', detail: `La respuesta de referencia no es evaluable (${exp.reason}).` }

  const written: Value[] = []
  for (const eqn of extractEquations(text)) {
    const c = checkEquation(eqn)
    written.push(...c.written)
    // Una matriz suelta (sin "=") también cuenta como valor escrito.
    if (!c.sides.length) {
      const slots: (Mat | null)[] = []
      const rep = eqn.replace(MATRIX_RE, (_m, fence: string | undefined, env: string, body: string) => {
        slots.push(parseMatrix(env, body, fence))
        return `@${slots.length - 1}`
      })
      const lit = literalValue(normalizeExpr(rep), slots)
      if (lit) written.push(lit)
    }
  }
  if (written.some((w) => valueEquals(w, exp.value))) return { expected: expectedLatex, status: 'found', detail: 'La respuesta esperada aparece en la transcripción.' }

  const sameShape = written.filter((w) => w.kind === 'mat' && exp.value.kind === 'mat' && w.rows.length === exp.value.rows.length && w.rows[0].length === exp.value.rows[0].length) as Mat[]
  if (sameShape.length && exp.value.kind === 'mat') {
    const last = sameShape[sameShape.length - 1]
    const cells = diffCells(last, exp.value)
    return {
      expected: expectedLatex,
      status: 'mismatch',
      detail: `La matriz más parecida difiere en: ${cells.map((c) => `(${c.row},${c.col}): transcrito ${c.left}, esperado ${c.right}`).join('; ')}.`,
    }
  }
  const scalars = written.filter((w) => w.kind === 'scalar')
  if (exp.value.kind === 'scalar' && scalars.length)
    return { expected: expectedLatex, status: 'mismatch', detail: `Se esperaba ${valueToString(exp.value)}; el último escalar transcrito es ${valueToString(scalars[scalars.length - 1])}.` }
  return { expected: expectedLatex, status: 'not-found', detail: 'No hay en la transcripción un valor evaluable comparable.' }
}
