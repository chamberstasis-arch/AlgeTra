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
    if (BigInt(m[3]) === 0n) return null
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
/** Número no racional (raíces): se compara con tolerancia. */
export interface Real {
  kind: 'real'
  x: number
}
/** Vector: componentes (i, j, k, …). Un vector de R² y uno de R³ con k=0 son el mismo. */
export interface Vec {
  kind: 'vec'
  c: number[]
}
export type Value = Mat | Scalar | Real | Vec
type Slot = Mat | Vec | null

const TOL = 1e-9
const close = (a: number, b: number) => Math.abs(a - b) <= TOL * Math.max(1, Math.abs(a), Math.abs(b))
const numOf = (v: Value): number | null => (v.kind === 'scalar' ? Number(v.v.n) / Number(v.v.d) : v.kind === 'real' ? v.x : null)

const dims = (m: Mat) => `${m.rows.length}×${m.rows[0]?.length ?? 0}`

function vecEquals(a: Vec, b: Vec): boolean {
  const n = Math.max(a.c.length, b.c.length)
  for (let t = 0; t < n; t++) if (!close(a.c[t] ?? 0, b.c[t] ?? 0)) return false
  return true
}

function valueEquals(a: Value, b: Value): boolean {
  if (a.kind === 'scalar' && b.kind === 'scalar') return eq(a.v, b.v)
  const x = numOf(a)
  const y = numOf(b)
  if (x !== null && y !== null) return close(x, y)
  if (a.kind === 'vec' && b.kind === 'vec') return vecEquals(a, b)
  if (a.kind === 'mat' && b.kind === 'mat')
    return (
      a.rows.length === b.rows.length &&
      a.rows.every((r, i) => r.length === b.rows[i].length && r.every((x, j) => eq(x, b.rows[i][j])))
    )
  return false
}

const fmtNum = (x: number) => String(+x.toPrecision(8))

export function valueToString(v: Value): string {
  if (v.kind === 'scalar') return fracToString(v.v)
  if (v.kind === 'real') return `≈${fmtNum(v.x)}`
  if (v.kind === 'vec') return `(${v.c.map(fmtNum).join(', ')})`
  return `[${v.rows.map((r) => r.map(fracToString).join(', ')).join(' ; ')}]`
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

class Unverifiable extends Error {}

type Op = '+' | '-' | '*' | '#' | '/'

/** Entero → escalar exacto; cualquier otro → real. */
function fromNumber(x: number): Value {
  if (!Number.isFinite(x)) throw new Unverifiable('resultado no finito')
  return Number.isInteger(x) && Math.abs(x) < 2 ** 53 ? { kind: 'scalar', v: frac(BigInt(x)) } : { kind: 'real', x }
}

const isqrt = (n: bigint): bigint => {
  if (n < 2n) return n
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return x
}

function sqrtValue(v: Value): Value {
  if (v.kind === 'scalar') {
    if (v.v.n < 0n) throw new Unverifiable('raíz de un número negativo')
    const rn = isqrt(v.v.n)
    const rd = isqrt(v.v.d)
    if (rn * rn === v.v.n && rd * rd === v.v.d) return { kind: 'scalar', v: frac(rn, rd) }
  }
  const x = numOf(v)
  if (x === null) throw new Unverifiable('raíz de un no-número')
  if (x < 0) throw new Unverifiable('raíz de un número negativo')
  return { kind: 'real', x: Math.sqrt(x) }
}

/** `|x|` de un número, `|v|` de un vector (norma). Los determinantes ya llegan como matriz. */
function normOf(v: Value): Value {
  if (v.kind === 'vec') return sqrtValue(fromNumber(v.c.reduce((acc, t) => acc + t * t, 0)))
  const x = numOf(v)
  if (x === null) throw new Unverifiable('valor absoluto de una matriz')
  return v.kind === 'scalar' ? { kind: 'scalar', v: frac(v.v.n < 0n ? -v.v.n : v.v.n, v.v.d) } : { kind: 'real', x: Math.abs(x) }
}

function vecOp(op: Op, a: Value, b: Value): Value {
  if (a.kind === 'vec' && b.kind === 'vec') {
    const n = Math.max(a.c.length, b.c.length)
    const u = Array.from({ length: n }, (_, t) => a.c[t] ?? 0)
    const w = Array.from({ length: n }, (_, t) => b.c[t] ?? 0)
    if (op === '+') return { kind: 'vec', c: u.map((t, i) => t + w[i]) }
    if (op === '-') return { kind: 'vec', c: u.map((t, i) => t - w[i]) }
    if (op === '*') return fromNumber(u.reduce((acc, t, i) => acc + t * w[i], 0))
    if (op === '#') {
      if (n > 3) throw new Unverifiable('producto cruz solo en R³')
      const [a1, a2, a3] = [u[0] ?? 0, u[1] ?? 0, u[2] ?? 0]
      const [b1, b2, b3] = [w[0] ?? 0, w[1] ?? 0, w[2] ?? 0]
      return { kind: 'vec', c: [a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1] }
    }
    throw new Unverifiable('división entre vectores')
  }
  const v = (a.kind === 'vec' ? a : b) as Vec
  const other = a.kind === 'vec' ? b : a
  const k = numOf(other)
  if (k === null) throw new Unverifiable('vector con matriz')
  if (op === '*' || op === '#') return { kind: 'vec', c: v.c.map((t) => t * k) }
  if (op === '/' && a.kind === 'vec') {
    if (k === 0) throw new Unverifiable('división entre cero')
    return { kind: 'vec', c: v.c.map((t) => t / k) }
  }
  throw new Unverifiable('operación entre un vector y un escalar no válida')
}

function binary(op: Op, a: Value, b: Value): Value {
  const x = numOf(a)
  const y = numOf(b)
  if (x !== null && y !== null) {
    if (a.kind === 'scalar' && b.kind === 'scalar') {
      if (op === '+') return { kind: 'scalar', v: add(a.v, b.v) }
      if (op === '-') return { kind: 'scalar', v: sub(a.v, b.v) }
      if (op === '/') {
        if (b.v.n === 0n) throw new Unverifiable('división entre cero')
        return { kind: 'scalar', v: div(a.v, b.v) }
      }
      return { kind: 'scalar', v: mul(a.v, b.v) }
    }
    if (op === '/' && y === 0) throw new Unverifiable('división entre cero')
    const r = op === '+' ? x + y : op === '-' ? x - y : op === '/' ? x / y : x * y
    if (!Number.isFinite(r)) throw new Unverifiable('resultado no finito')
    return { kind: 'real', x: r }
  }
  if (a.kind === 'vec' || b.kind === 'vec') return vecOp(op, a, b)
  if (op === '/') throw new Unverifiable('división con matrices')
  if (op === '*' || op === '#') {
    if (a.kind === 'scalar' && b.kind === 'mat') return { kind: 'mat', rows: b.rows.map((r) => r.map((t) => mul(a.v, t))) }
    if (a.kind === 'mat' && b.kind === 'scalar') return { kind: 'mat', rows: a.rows.map((r) => r.map((t) => mul(t, b.v))) }
    if (a.kind === 'mat' && b.kind === 'mat') return matMul(a, b)
    throw new Unverifiable('matriz con números irracionales')
  }
  const f = op === '+' ? add : sub
  if (a.kind === 'mat' && b.kind === 'mat') {
    if (a.rows.length !== b.rows.length || a.rows[0].length !== b.rows[0].length)
      throw new Error(`dimensiones distintas ${dims(a)} y ${dims(b)}`)
    return { kind: 'mat', rows: a.rows.map((r, i) => r.map((t, j) => f(t, b.rows[i][j]))) }
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

const UNIT: Record<string, number[]> = { i: [1, 0, 0], j: [0, 1, 0], k: [0, 0, 1] }

function parseMatrix(env: string, body: string, fence?: string): Mat | Vec | null {
  const raw = body
    .split(/\\\\/)
    .map((r) => r.replace(/\\hline/g, '').trim())
    .filter(Boolean)
    .map((r) => r.split('&'))
  // Producto cruz escrito como determinante simbólico: | i j k ; a1 a2 a3 ; b1 b2 b3 |
  if (raw.length === 3 && raw.every((r) => r.length === 3) && (env === 'vmatrix' || fence === '|')) {
    const head = raw[0].map((c) => {
      const r = evaluate(c, [])
      return r.ok && r.value.kind === 'vec' ? r.value.c.join(',') : ''
    })
    if (head.join('|') === '1,0,0|0,1,0|0,0,1') {
      const rows = raw.slice(1).map((r) => r.map(parseCell))
      if (rows.every((r) => r.every((c) => c !== null))) {
        const [u, w] = rows.map((r) => r.map((c) => Number(c!.n) / Number(c!.d)))
        return { kind: 'vec', c: [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]] }
      }
    }
  }
  const rows = raw.map((r) => r.map(parseCell))
  if (!rows.length || rows.some((r) => r.length !== rows[0].length || r.some((c) => c === null))) return null
  return { kind: 'mat', rows: rows as Frac[][], det: env === 'vmatrix' || fence === '|' }
}

/** Todas las matrices numéricas (no vectores ni determinantes simbólicos) que aparecen en un texto LaTeX. */
export function extractMatrices(latex: string): Mat[] {
  const out: Mat[] = []
  for (const m of latex.matchAll(MATRIX_RE)) {
    const r = parseMatrix(m[2], m[3], m[1])
    if (r && r.kind === 'mat') out.push(r)
  }
  return out
}

// ---------- evaluación de una expresión ----------

/** Símbolos definidos antes en la misma hoja (`v = 4i - 2j + k`). Solo letras de vectores y matrices. */
export type Env = Record<string, Value>
const BINDABLE = /^[A-Zuvwpq]$/

class Parser {
  private i = 0
  constructor(
    private s: string,
    private slots: Slot[],
    private env: Env = {},
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

  private startsAtom(): boolean {
    const c = this.peek()
    return (
      c === '@' || c === '(' || c === '{' || c === '|' || c === '‖' ||
      (c !== undefined && /[\dijk]/.test(c)) ||
      (c !== undefined && BINDABLE.test(c) && c in this.env) ||
      /^\\(?:[dt]?frac|det|sqrt|pi)/.test(this.s.slice(this.i))
    )
  }

  /** Producto implícito (2x, 3(…), 2\sqrt{3}, 3j): se une antes que `*` y `#`, así `u × 3k` = `u × (3k)`. */
  private implicit(): Value {
    let v = this.signed()
    while (this.startsAtom()) v = binary('*', v, this.signed())
    return v
  }

  private term(): Value {
    let v = this.implicit()
    for (;;) {
      const c = this.peek()
      if (c === '*' || c === '#') {
        this.i++
        v = binary(c, v, this.implicit())
      } else if (c === '/') {
        this.i++
        v = binary('/', v, this.signed())
      } else if (this.startsAtom()) v = binary('*', v, this.signed())
      else break
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
      if (v.kind === 'vec') throw new Unverifiable('potencia de un vector')
      if (v.kind !== 'mat') {
        if (/^-?\d+$/.test(e) && Math.abs(Number(e)) <= 12) {
          const n = Math.abs(Number(e))
          let r: Value = { kind: 'scalar', v: frac(1n) }
          for (let k = 0; k < n; k++) r = binary('*', r, v)
          v = Number(e) < 0 ? binary('/', { kind: 'scalar', v: frac(1n) }, r) : r
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

  /** Lee `{…}` con llaves balanceadas y devuelve el contenido. */
  private group(): string {
    if (this.peek() !== '{') throw new Unverifiable('se esperaba "{"')
    let depth = 0
    const start = this.i + 1
    for (let j = this.i; j < this.s.length; j++) {
      if (this.s[j] === '{') depth++
      else if (this.s[j] === '}' && --depth === 0) {
        this.i = j + 1
        return this.s.slice(start, j)
      }
    }
    throw new Unverifiable('llave sin cerrar')
  }

  private sub(src: string): Value {
    return new Parser(src, this.slots, this.env).parse()
  }

  private atom(): Value {
    const rest = this.s.slice(this.i)
    let m = /^@(\d+)/.exec(rest)
    if (m) {
      this.i += m[0].length
      const slot = this.slots[Number(m[1])]
      if (!slot) throw new Unverifiable('matriz con entradas no numéricas')
      return slot.kind === 'mat' && slot.det ? { kind: 'scalar', v: determinant(slot) } : slot
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
      if (inner.kind !== 'mat') throw new Unverifiable('det de un no-matriz')
      return { kind: 'scalar', v: determinant({ ...inner, det: false }) }
    }
    if (this.peek() === '(') {
      this.i++
      const first = this.expr()
      if (this.peek() === ',') {
        // (a, b, c): un vector
        const comps = [first]
        while (this.peek() === ',') {
          this.i++
          comps.push(this.expr())
        }
        if (this.peek() !== ')') throw new Unverifiable('paréntesis sin cerrar')
        this.i++
        const nums = comps.map(numOf)
        if (nums.some((t) => t === null) || nums.length > 3) throw new Unverifiable('tupla no evaluable')
        return { kind: 'vec', c: nums as number[] }
      }
      if (this.peek() !== ')') throw new Unverifiable('paréntesis sin cerrar')
      this.i++
      return first
    }
    if (this.peek() === '{') return this.sub(this.group())
    if (this.peek() === '|' || this.peek() === '‖') {
      const delim = this.peek()
      const end = this.s.indexOf(delim, this.i + 1)
      if (end < 0) throw new Unverifiable('barra sin cerrar')
      const inner = this.s.slice(this.i + 1, end)
      this.i = end + 1
      return normOf(this.sub(inner))
    }
    if (rest.startsWith('\\sqrt')) {
      this.i += 5
      if (this.peek() === '[') throw new Unverifiable('raíz con índice')
      return sqrtValue(this.sub(this.group()))
    }
    if (rest.startsWith('\\pi') && !/^\\pi[A-Za-z]/.test(rest)) {
      this.i += 3
      return { kind: 'real', x: Math.PI }
    }
    m = /^\\[dt]?frac(?=\{)/.exec(rest)
    if (m) {
      this.i += m[0].length
      const num = this.sub(this.group())
      const den = this.sub(this.group())
      return binary('/', num, den)
    }
    m = /^\\[dt]?frac(\d)(\d)/.exec(rest)
    if (m) {
      this.i += m[0].length
      return { kind: 'scalar', v: frac(BigInt(m[1]), BigInt(m[2])) }
    }
    m = /^\d+(?:\.\d+)?/.exec(rest)
    if (m) {
      this.i += m[0].length
      return { kind: 'scalar', v: parseNumber(m[0])! }
    }
    m = /^[ijk]/.exec(rest)
    if (m) {
      if (rest[1] === '_') throw new Unverifiable('índice, no vector unitario')
      this.i += 1
      return { kind: 'vec', c: [...UNIT[m[0]]] }
    }
    m = /^[A-Za-z]/.exec(rest)
    if (m && BINDABLE.test(m[0]) && m[0] in this.env && !/^[A-Za-z]_/.test(rest)) {
      this.i += 1
      return this.env[m[0]]
    }
    throw new Unverifiable(`símbolo no evaluable: ${rest.slice(0, 12)}`)
  }
}

function normalizeExpr(s: string): string {
  return s
    .replace(/\\operatorname\{det\}/g, '\\det')
    .replace(/\\left|\\right/g, '')
    .replace(/\\times|×/g, '#') // en vectores es el producto cruz
    .replace(/\\cdot|\\ast|·/g, '*') // en vectores es el producto punto
    .replace(/\\langle|⟨/g, '(')
    .replace(/\\rangle|⟩/g, ')')
    .replace(/\\\||\\lVert|\\rVert|∥/g, '‖')
    .replace(/\\imath/g, 'i')
    .replace(/\\jmath/g, 'j')
    .replace(/\\(?:hat|vec|overrightarrow|bar)(?![A-Za-z])/g, '')
    .replace(/\\[,;:! ]|\\quad|\\qquad|~/g, '')
    .replace(/[−–]/g, '-')
    .replace(/\\mathbf|\\boldsymbol|\\mathrm/g, '')
    .replace(/\s+/g, '')
}

export type EvalResult = { ok: true; value: Value } | { ok: false; reason: string }

function evaluate(expr: string, slots: Slot[], env: Env = {}): EvalResult {
  try {
    if (!expr.trim()) return { ok: false, reason: 'vacío' }
    return { ok: true, value: new Parser(normalizeExpr(expr), slots, env).parse() }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

/** Evalúa una expresión LaTeX completa (p. ej. la respuesta esperada). */
export function evaluateLatex(latex: string): EvalResult {
  const slots: Slot[] = []
  const replaced = latex.replace(MATRIX_RE, (_m, fence: string | undefined, env: string, body: string) => {
    slots.push(parseMatrix(env, body, fence))
    return `@${slots.length - 1}`
  })
  return evaluate(replaced, slots)
}

// Un valor "escrito" (no calculado): número, matriz, vector o radical sin operaciones por hacer.
const R_ATOM = String.raw`(?:\d+(?:\.\d+)?|\\sqrt\{\d+\}|\\[dt]?frac\{(?:\d+|\\sqrt\{\d+\})\}\{(?:\d+|\\sqrt\{\d+\})\})`
const LIT_REAL = new RegExp(`^[+-]?${R_ATOM}(?:\\*?${R_ATOM})?(?:/${R_ATOM})?$`)
const LIT_TUPLE = /^\([-+]?\d+(?:\.\d+)?(?:,[-+]?\d+(?:\.\d+)?){1,2}\)$/
const LIT_IJK = /^(?:[+-]?\d*(?:\.\d+)?[ijk])+$/

/** Un lado que es solo un valor escrito (no una operación). */
function literalValue(side: string, slots: Slot[]): Value | null {
  const m = /^@(\d+)$/.exec(side)
  if (m) {
    const slot = slots[Number(m[1])]
    return slot && !(slot.kind === 'mat' && slot.det) ? slot : null
  }
  const n = parseNumber(side)
  if (n) return { kind: 'scalar', v: n }
  if (LIT_REAL.test(side) || LIT_TUPLE.test(side) || LIT_IJK.test(side)) {
    const r = evaluate(side, slots)
    return r.ok ? r.value : null
  }
  return null
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
  /** Símbolo que esta igualdad define (`v = …`) y su valor, o `null` si el valor no es evaluable. */
  defines?: { name: string; value: Value | null }
}

/**
 * Un decimal escrito que es el redondeo o el truncamiento del otro lado (`\sqrt{21} = 4.58`)
 * no es un error del alumno: el valor exacto no cabe en ese número de cifras.
 */
function roundedMatch(a: { i: number; v: Value }, b: { i: number; v: Value }, parts: string[]): boolean {
  for (const [lit, other] of [[a, b], [b, a]] as const) {
    const m = /^-?\d+[.,](\d+)$/.exec(normalizeExpr(parts[lit.i]))
    const x = numOf(lit.v)
    const target = numOf(other.v)
    if (!m || x === null || target === null) continue
    const f = 10 ** m[1].length
    if (close(x, Math.round(target * f) / f) || close(x, Math.trunc(target * f) / f)) return true
  }
  return false
}

/** Quita los recuadros `\boxed{…}` / `\fbox{…}` (el alumno encierra sus respuestas): el recuadro es forma, no valor. */
export function sinRecuadros(latex: string): string {
  let s = latex
  for (let guard = 0; guard < 20; guard++) {
    const m = /\\(?:boxed|fbox)\s*\{/.exec(s)
    if (!m) break
    let depth = 1
    let i = m.index + m[0].length
    while (i < s.length && depth > 0) {
      if (s[i] === '{') depth++
      else if (s[i] === '}') depth--
      i++
    }
    const inner = s.slice(m.index + m[0].length, depth === 0 ? i - 1 : i)
    s = s.slice(0, m.index) + inner + (depth === 0 ? s.slice(i) : '')
  }
  return s
}

export function checkEquation(rawLatex: string, env: Env = {}): EquationCheck {
  return { ...checkEquationInner(sinRecuadros(rawLatex), env), latex: rawLatex }
}

function checkEquationInner(latex: string, env: Env): EquationCheck {
  const slots: Slot[] = []
  const replaced = latex.replace(MATRIX_RE, (_m, fence: string | undefined, envName: string, body: string) => {
    slots.push(parseMatrix(envName, body, fence))
    return `@${slots.length - 1}`
  })
  // Se parte por `=` de nivel superior; `\neq`, `\leq`… no contienen "=".
  const parts = replaced.split('=').map((p) => p.trim())
  if (parts.length < 2) return { latex, status: 'unverifiable', detail: 'No es una igualdad.', sides: [], written: [] }

  // `v = …` con un símbolo suelto a la izquierda define v (no se compara con una definición anterior).
  const binder = /^\{?([A-Za-z])\}?$/.exec(normalizeExpr(parts[0]))
  const results = parts.map((p, idx) => (idx === 0 && binder ? ({ ok: false, reason: 'definición' } as const) : evaluate(p, slots, env)))
  const written = parts.flatMap((p) => {
    const lit = literalValue(normalizeExpr(p), slots)
    return lit ? [lit] : []
  })
  const sides = results.map((r) => (r.ok ? r.value : null))
  const done = (c: EquationCheck): EquationCheck => {
    if (!binder || !BINDABLE.test(binder[1])) return c
    const rhs = results.slice(1).find((r) => r.ok)
    return { ...c, defines: { name: binder[1], value: rhs && rhs.ok ? rhs.value : null } }
  }
  const evaluable = results.flatMap((r, i) => (r.ok ? [{ i, v: r.value }] : []))
  if (evaluable.length < 2) {
    const why = results.find((r) => !r.ok)
    return done({ latex, status: 'unverifiable', detail: why && !why.ok ? `No evaluable: ${why.reason}.` : 'No evaluable.', sides, written })
  }

  const first = evaluable[0]
  for (const other of evaluable.slice(1)) {
    if ((first.v.kind === 'vec') !== (other.v.kind === 'vec'))
      return done({ latex, status: 'unverifiable', detail: 'Un lado es un vector y el otro no: no se comparan.', sides, written })
    if (!valueEquals(first.v, other.v)) {
      if (roundedMatch(first, other, parts)) continue
      const cells = first.v.kind === 'mat' && other.v.kind === 'mat' ? diffCells(first.v, other.v) : undefined
      const detail =
        first.v.kind === 'mat' && other.v.kind === 'mat' && !cells?.length
          ? `Dimensiones distintas: ${dims(first.v)} frente a ${dims(other.v)}.`
          : cells?.length
            ? `Celdas que no coinciden: ${cells.map((c) => `(${c.row},${c.col}): ${c.left} ≠ ${c.right}`).join('; ')}.`
            : `Los lados valen ${valueToString(first.v)} y ${valueToString(other.v)}.`
      return done({ latex, status: 'inconsistent', detail, cells, sides, written })
    }
  }
  return done({ latex, status: 'ok', detail: 'La aritmética es consistente.', sides, written })
}

// ---------- verificación de una transcripción ----------

export interface ConsistencyReport {
  checks: EquationCheck[]
  verified: number
  inconsistent: number
  unverifiable: number
}

export function checkTranscription(text: string): ConsistencyReport {
  // En orden de lectura: lo que la hoja define (`v = …`) sirve para comprobar las líneas siguientes.
  const env: Env = {}
  const checks = extractEquations(text).map((eqn) => {
    const c = checkEquation(eqn, env)
    if (c.defines) {
      if (c.defines.value) env[c.defines.name] = c.defines.value
      else delete env[c.defines.name] // redefinida con algo no evaluable: el valor anterior ya no vale
    }
    return c
  })
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
      const slots: Slot[] = []
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
  const scalars = written.filter((w) => numOf(w) !== null)
  if (numOf(exp.value) !== null && scalars.length)
    return { expected: expectedLatex, status: 'mismatch', detail: `Se esperaba ${valueToString(exp.value)}; el último escalar transcrito es ${valueToString(scalars[scalars.length - 1])}.` }
  return { expected: expectedLatex, status: 'not-found', detail: 'No hay en la transcripción un valor evaluable comparable.' }
}
