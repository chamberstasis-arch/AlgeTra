// Resolución de referencia de los ejercicios de la base, con aritmética exacta (fracciones) y los mismos métodos que usa
// el alumno: eliminación por renglones, cofactores, fórmula de la proyección, producto cruz por determinante, etc.
// Sirve para contrastar los resultados finales transcritos; no se muestra a quien transcribe.
import { sistemaConVariables } from './contraste'

// ───────── Fracciones exactas ─────────
export type R = { n: bigint; d: bigint }
const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) [a, b] = [b, a % b]
  return a
}
export const R = (n: bigint | number, d: bigint | number = 1): R => {
  let N = BigInt(n)
  let D = BigInt(d)
  if (D < 0n) [N, D] = [-N, -D]
  const g = gcd(N, D) || 1n
  return { n: N / g, d: D / g }
}
const add = (a: R, b: R) => R(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: R, b: R) => R(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a: R, b: R) => R(a.n * b.n, a.d * b.d)
const div = (a: R, b: R) => R(a.n * b.d, a.d * b.n)
const isZero = (a: R) => a.n === 0n
const ZERO = R(0)
const ONE = R(1)
const num = (a: R) => Number(a.n) / Number(a.d)

/** LaTeX de una fracción: `3`, `-\frac{1}{2}`. */
export const tex = (a: R): string => (a.d === 1n ? `${a.n}` : `${a.n < 0n ? '-' : ''}\\frac{${a.n < 0n ? -a.n : a.n}}{${a.d}}`)

/** √(p/q) simplificada como texto LaTeX (p/q racional ≥ 0). */
export function raizTex(x: R): string {
  if (isZero(x)) return '0'
  const simp = (n: bigint): [bigint, bigint] => {
    let out = 1n
    let rest = n
    for (let f = 2n; f * f <= rest; f++) while (rest % (f * f) === 0n) (out *= f), (rest /= f * f)
    return [out, rest]
  }
  const [a, b] = simp(x.n)
  const [c, d] = simp(x.d)
  // √(a²b / c²d) = (a/c)·√(b/d); se racionaliza el denominador: √(b/d) = √(bd)/d
  const [e, f] = simp(b * d)
  const coef = R(a * e, c * d)
  const rad = f === 1n ? '' : `\\sqrt{${f}}`
  if (f === 1n) return tex(coef)
  if (coef.n === 1n && coef.d === 1n) return rad
  return coef.d === 1n ? `${coef.n}${rad}` : `\\frac{${coef.n}${rad}}{${coef.d}}`
}

// ───────── Valores: escalar, vector, matriz ─────────
type V = { k: 'e'; v: R } | { k: 'v'; c: R[] } | { k: 'm'; r: R[][] }
const esc = (v: R): V => ({ k: 'e', v })

function vmul(a: V, b: V): V {
  if (a.k === 'e' && b.k === 'e') return esc(mul(a.v, b.v))
  if (a.k === 'e') return b.k === 'v' ? { k: 'v', c: b.c.map((x) => mul(a.v, x)) } : { k: 'm', r: (b as { r: R[][] }).r.map((r) => r.map((x) => mul(a.v, x))) }
  if (b.k === 'e') return vmul(b, a)
  throw new Error('producto no soportado')
}
function vadd(a: V, b: V, s: 1 | -1): V {
  if (a.k === 'v' && b.k === 'v') return { k: 'v', c: a.c.map((x, i) => (s === 1 ? add(x, b.c[i]) : sub(x, b.c[i]))) }
  if (a.k === 'm' && b.k === 'm') return { k: 'm', r: a.r.map((r, i) => r.map((x, j) => (s === 1 ? add(x, b.r[i][j]) : sub(x, b.r[i][j])))) }
  if (a.k === 'e' && b.k === 'e') return esc(s === 1 ? add(a.v, b.v) : sub(a.v, b.v))
  throw new Error('suma no soportada')
}
const dot = (a: R[], b: R[]) => a.reduce((s, x, i) => add(s, mul(x, b[i])), ZERO)

/** Evalúa `2a + 4b - 3c`, `(2a) \cdot (3b)`, `3A - C`… con las variables de `env`. */
export function evaluar(expr: string, env: Record<string, V>): V {
  const toks = expr.replace(/\\cdot/g, '·').replace(/\\left|\\right/g, '').replace(/\s+/g, '').match(/\d+(?:\.\d+)?|[A-Za-z]|[()+\-·]/g) ?? []
  let p = 0
  const peek = () => toks[p]
  const primary = (): V => {
    const t = toks[p++]
    if (t === '-') return vmul(esc(R(-1)), primary())
    if (t === '(') {
      const v = suma()
      p++ // ')'
      return v
    }
    if (/^\d/.test(t)) return esc(R(Math.round(Number(t) * 1000), 1000))
    if (env[t]) return env[t]
    throw new Error(`símbolo ${t}`)
  }
  const producto = (): V => {
    let v = primary()
    while (peek() && (/^[\dA-Za-z(]/.test(peek()))) v = vmul(v, primary())
    return v
  }
  const punto = (): V => {
    let v = producto()
    while (peek() === '·') {
      p++
      const w = producto()
      if (v.k !== 'v' || w.k !== 'v') throw new Error('producto punto de no vectores')
      v = esc(dot(v.c, w.c))
    }
    return v
  }
  const suma = (): V => {
    let v = punto()
    while (peek() === '+' || peek() === '-') {
      const s = toks[p++] === '+' ? 1 : -1
      v = vadd(v, punto(), s)
    }
    return v
  }
  const r = suma()
  if (p < toks.length) throw new Error('expresión no consumida')
  return r
}

// ───────── Lectura de datos del enunciado ─────────
const entero = (s: string) => R(Math.round(Number(s.replace(/[−–]/g, '-')) * 1000), 1000)

function matrices(texto: string): R[][][] {
  const out: R[][][] = []
  for (const m of texto.matchAll(/\\begin\{[pbv]matrix\}([\s\S]*?)\\end\{[pbv]matrix\}/g)) out.push(m[1].split('\\\\').map((r) => r.trim()).filter(Boolean).map((r) => r.split('&').map((c) => entero(c.trim()))))
  return out
}
const ijk = (s: string): R[] | null => {
  const c = [ZERO, ZERO, ZERO]
  const t = s.replace(/\s+/g, '').replace(/[−–]/g, '-')
  if (!/^(?:[+-]?\d*[ijk])+$/.test(t)) return null
  for (const m of t.matchAll(/([+-]?)(\d*)([ijk])/g)) c['ijk'.indexOf(m[3])] = add(c['ijk'.indexOf(m[3])], R((m[1] === '-' ? -1 : 1) * Number(m[2] || 1)))
  return c
}
/** Definiciones `u = 2i - 3j`, `a = (…)` y matrices con nombre del enunciado. */
function entorno(texto: string, dim: 2 | 3): Record<string, V> {
  const env: Record<string, V> = {}
  for (const m of texto.matchAll(/\$?([A-Za-z])\s*=\s*\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g)) {
    const rows = m[2].split('\\\\').map((r) => r.trim()).filter(Boolean).map((r) => r.split('&').map((c) => entero(c.trim())))
    env[m[1]] = rows.every((r) => r.length === 1) ? { k: 'v', c: rows.map((r) => r[0]) } : { k: 'm', r: rows }
  }
  for (const m of texto.matchAll(/(?<![A-Za-z\\])([a-z])\s*=\s*\((-?\d+),\s*(-?\d+)\)/g)) env[m[1]] = { k: 'v', c: [entero(m[2]), entero(m[3])] }
  for (const m of texto.matchAll(/(?<![A-Za-z\\])([a-z])\s*=\s*((?:[+-]?\s*\d*\s*[ijk]\s*)+)(?=[,;.$\s]|$)/g)) {
    const c = ijk(m[2])
    if (c) env[m[1]] = { k: 'v', c: c.slice(0, dim) }
  }
  return env
}
const vtex = (c: R[]) => c.map((x, i) => ({ x, l: 'ijk'[i] })).filter(({ x }) => !isZero(x)).map(({ x, l }, i) => {
  const a = tex(x)
  const cuerpo = a === '1' ? l : a === '-1' ? `-${l}` : x.d === 1n ? `${a}${l}` : a.startsWith('-') ? `-${a.slice(1)}${l}` : `${a}${l}`
  return i === 0 || cuerpo.startsWith('-') ? cuerpo : `+${cuerpo}`
}).join('') || '0'
const mtex = (m: R[][]) => `\\begin{pmatrix}${m.map((r) => r.map(tex).join(' & ')).join(' \\\\ ')}\\end{pmatrix}`
const ctex = (c: R[]) => mtex(c.map((x) => [x]))
const norma2 = (c: R[]) => dot(c, c)

// ───────── Álgebra de matrices ─────────
export function rref(M: R[][]): { R: R[][]; pivotes: number[] } {
  const A = M.map((r) => [...r])
  const piv: number[] = []
  let fila = 0
  for (let col = 0; col < A[0].length && fila < A.length; col++) {
    const p = A.findIndex((r, i) => i >= fila && !isZero(r[col]))
    if (p < 0) continue
    ;[A[fila], A[p]] = [A[p], A[fila]]
    A[fila] = A[fila].map((x) => div(x, A[fila][col]))
    for (let i = 0; i < A.length; i++) if (i !== fila && !isZero(A[i][col])) A[i] = A[i].map((x, j) => sub(x, mul(A[i][col], A[fila][j])))
    piv.push(col)
    fila++
  }
  return { R: A, pivotes: piv }
}
export function det(M: R[][]): R {
  const A = M.map((r) => [...r])
  let d = ONE
  for (let c = 0; c < A.length; c++) {
    const p = A.findIndex((r, i) => i >= c && !isZero(r[c]))
    if (p < 0) return ZERO
    if (p !== c) [A[c], A[p]] = [A[p], A[c]], (d = mul(d, R(-1)))
    d = mul(d, A[c][c])
    for (let i = c + 1; i < A.length; i++) {
      const f = div(A[i][c], A[c][c])
      A[i] = A[i].map((x, j) => sub(x, mul(f, A[c][j])))
    }
  }
  return d
}
export function inversa(M: R[][]): R[][] | null {
  const n = M.length
  const { R: E, pivotes } = rref(M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO))]))
  return pivotes.slice(0, n).join() === [...Array(n).keys()].join() ? E.map((r) => r.slice(n)) : null
}
const rango = (M: R[][]) => rref(M).pivotes.length

export interface Sistema {
  tipo: 'unica' | 'ninguna' | 'infinitas'
  vars: string[]
  valores?: R[]
  /** Variables libres y cada variable principal en función de ellas, ya en texto. */
  parametrica?: string[]
  texto: string
}
/** Resuelve `[A|b]` con las variables dadas. */
export function resolverSistema(aug: R[][], vars: string[]): Sistema {
  const { R: E, pivotes } = rref(aug)
  const nv = vars.length
  if (pivotes.includes(nv)) return { tipo: 'ninguna', vars, texto: 'Sin solución (sistema inconsistente)' }
  if (pivotes.length === nv) {
    const valores = vars.map((_, i) => E[i][nv])
    return { tipo: 'unica', vars, valores, texto: vars.map((v, i) => `${v} = ${tex(valores[i])}`).join(',\\ ') }
  }
  const libres = vars.map((_, i) => i).filter((i) => !pivotes.includes(i))
  const param = libres.map((i) => `${vars[i]} = ${['t', 's', 'r'][libres.indexOf(i)]}`)
  const par = ['t', 's', 'r']
  const lineas = pivotes.map((pc, fila) => {
    const partes = [tex(E[fila][nv]) === '0' ? '' : tex(E[fila][nv])]
    for (const l of libres) {
      const c = mul(R(-1), E[fila][l])
      if (!isZero(c)) partes.push(`${c.n < 0n ? '-' : partes[0] || partes.length > 1 ? '+' : ''}${(c.n < 0n ? -c.n : c.n) === 1n && c.d === 1n ? '' : tex(R(c.n < 0n ? -c.n : c.n, c.d))}${par[libres.indexOf(l)]}`)
    }
    return `${vars[pc]} = ${partes.join('').replace(/^\+/, '') || '0'}`
  })
  return { tipo: 'infinitas', vars, parametrica: [...lineas, ...param], texto: `Infinitas soluciones: ${[...lineas, ...param].join(',\\ ')}` }
}

// ───────── Resolución por ejercicio ─────────
export interface Solucion {
  /** Pasos con la fórmula usada, en LaTeX (una línea cada uno). */
  procedimiento: string[]
  /** Texto del resultado final para la base (`**Respuesta:**`). */
  respuesta: string
  /** Fórmulas del resultado que el verificador puede comparar tal cual. */
  formulas: string[]
  /** Para sistemas: la solución, para contrastar `x = 2` escritos por el alumno. */
  sistema?: Sistema
}

function resolverSistemaEnunciado(st: string): Solucion | null {
  const S = sistemaConVariables(st)
  if (!S) return null
  const aug = S.mat.rows.map((r) => r.map((f) => R(f.n, f.d)))
  const sis = resolverSistema(aug, S.vars)
  const { R: E } = rref(aug)
  const proc = [`[A|b]=${mtex(aug).replace('pmatrix', 'bmatrix')}`, `\\text{Forma escalonada reducida: }${mtex(E).replace('pmatrix', 'bmatrix')}`]
  return { procedimiento: proc, respuesta: sis.texto.replace(/\\ /g, ' '), formulas: sis.tipo === 'unica' ? sis.valores!.map(tex) : [], sistema: sis }
}

/** Soluciones que no se calculan del enunciado (conceptuales o simbólicas), por referencia. */
const MANUAL: Record<string, Solucion> = {
  'act-02/14': { procedimiento: ['a_{11}a_{22}-a_{12}a_{21}=a(-b)-b\\,a=-2ab', 'x=\\frac{c}{a},\\ y=0\\ \\ (a\\neq 0,\\ b\\neq 0)'], respuesta: 'x = c/a, y = 0 (si a ≠ 0 y b ≠ 0); a₁₁a₂₂ − a₁₂a₂₁ = −2ab', formulas: [] },
  'act-02/15': { procedimiento: ['a_{11}a_{22}-a_{12}a_{21}=a^2-b^2', 'x=y=\\frac{c}{a+b}\\ \\ (a\\neq\\pm b)'], respuesta: 'x = y = c/(a + b) (si a ≠ ±b); a₁₁a₂₂ − a₁₂a₂₁ = a² − b²', formulas: [] },
  'act-02/16': { procedimiento: ['a_{11}a_{22}-a_{12}a_{21}=a^2+b^2', 'x=\\frac{ac+bd}{a^2+b^2},\\ y=\\frac{ad-bc}{a^2+b^2}'], respuesta: 'x = (ac + bd)/(a² + b²), y = (ad − bc)/(a² + b²); a₁₁a₂₂ − a₁₂a₂₁ = a² + b²', formulas: [] },
  'act-25/5': { procedimiento: ['u\\times v=\\begin{vmatrix}i&j&k\\\\a&0&b\\\\c&0&d\\end{vmatrix}=(bc-ad)\\,j'], respuesta: 'u × v = (bc − ad) j', formulas: [] },
  'act-26/1': { procedimiento: ['H=\\{(x,-3x)\\}=\\{x(1,-3)\\}', '\\text{Cerrado bajo suma y producto por escalar; contiene al }(0,0)'], respuesta: 'Sí es un espacio vectorial (es la recta y = −3x por el origen; se cumplen los 10 axiomas).', formulas: [] },
  'act-26/2': { procedimiento: ['(0,0)\\notin H\\ \\ (0\\neq -3\\cdot0+1)', '(x_1,-3x_1+1)+(x_2,-3x_2+1)=(x_1+x_2,-3(x_1+x_2)+2)\\notin H'], respuesta: 'No es espacio vectorial: no contiene al vector cero (axioma del neutro aditivo) y no es cerrado bajo la suma ni el producto por escalar.', formulas: [] },
  'act-27/1': { procedimiento: ['(0,1)\\in H,\\ (-1)(0,1)=(0,-1)\\notin H'], respuesta: 'No es subespacio: no es cerrado bajo la multiplicación por escalares negativos.', formulas: [] },
  'act-27/2': { procedimiento: ['H=\\{x(1,2)\\}', '(0,0)\\in H;\\ \\text{cerrado bajo suma y producto por escalar}'], respuesta: 'Sí es subespacio (la recta y = 2x por el origen).', formulas: [] },
  'act-27/3': { procedimiento: ['(1,0)\\in H,\\ 2(1,0)=(2,0)\\ \\Rightarrow\\ 2^2+0^2=4>1\\notin H'], respuesta: 'No es subespacio: no es cerrado bajo la multiplicación por escalar (ni bajo la suma).', formulas: [] },
}

function ejercicio(act: string, n: string, st: string): Solucion | null {
  const ref = `${act}/${n}`
  if (MANUAL[ref]) return MANUAL[ref]
  const a = Number(act.replace(/\D/g, ''))
  const dimension: 2 | 3 = /\bk\b|\d\s*k|R\^?\{?3|\\mathbb\{R\}\^\{3\}/.test(st) || a === 9 || a === 11 || (a >= 23 && a <= 25) ? 3 : 2

  // Sistemas de ecuaciones (actividades 1–8)
  if (a >= 1 && a <= 8 && a !== 4 && a !== 5) {
    const s = resolverSistemaEnunciado(st)
    if (s && a === 2) {
      const M = sistemaConVariables(st)!.mat.rows.map((r) => r.map((f) => R(f.n, f.d)))
      const d = sub(mul(M[0][0], M[1][1]), mul(M[0][1], M[1][0]))
      s.procedimiento.push(`a_{11}a_{22}-a_{12}a_{21}=${tex(d)}`)
      s.respuesta += `; a₁₁a₂₂ − a₁₂a₂₁ = ${tex(d)}`
      s.formulas.push(tex(d))
    }
    return s
  }
  if (a === 4 || a === 5) {
    const M = sistemaConVariables(st)?.mat.rows.map((r) => r.map((f) => R(f.n, f.d))) ?? matrices(st)[0]
    if (!M) return null
    const { R: E, pivotes } = rref(M)
    return { procedimiento: [`\\text{Matriz: }${mtex(M).replace('pmatrix', 'bmatrix')}`, `\\text{Forma escalonada reducida (una forma escalonada válida): }${mtex(E).replace('pmatrix', 'bmatrix')}`], respuesta: `Rango ${pivotes.length}; la forma escalonada no es única, se compara por el rango y por la forma reducida.`, formulas: [] }
  }

  // Aritmética de vectores y matrices con nombre (actividades 9, 10, 11, 17, 19, 24 partes de cálculo)
  if (a === 9 || a === 10 || a === 11) {
    const env = entorno(st, 3)
    const expr = /indicado:\s*\$(.+)\$\s*$/.exec(st)?.[1]
    if (!expr) return null
    const v = evaluar(expr, env)
    const f = v.k === 'e' ? tex(v.v) : v.k === 'v' ? ctex(v.c) : mtex(v.r)
    return { procedimiento: [`${expr}=${f}`], respuesta: `$$${f}$$`, formulas: [f] }
  }
  if (a === 12) {
    const [A, B] = matrices(st)
    if (A[0].length !== B.length) return { procedimiento: [`A_{${A.length}\\times ${A[0].length}}\\cdot B_{${B.length}\\times ${B[0].length}}\\ \\text{no está definido}`], respuesta: `El producto no está definido: ${A.length}×${A[0].length} por ${B.length}×${B[0].length} (las columnas de A deben igualar los renglones de B).`, formulas: [] }
    const C = A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => add(s, mul(x, B[k][j])), ZERO)))
    return { procedimiento: [`C_{ij}=\\sum_k A_{ik}B_{kj}`, mtex(C)], respuesta: `$$${mtex(C)}$$`, formulas: [mtex(C)] }
  }
  if (a === 13 || a === 14 || a === 15) {
    const M = matrices(st)[0]
    const d = det(M)
    const inv = a === 13 ? null : a === 15 ? inversa(M) : null
    const proc = [`\\det=${tex(d)}`]
    let resp = `det = ${tex(d)}`
    const formulas = [tex(d)]
    if (a === 13 || a === 15) resp += isZero(d) ? '; no es invertible (determinante 0)' : '; es invertible (determinante distinto de 0)'
    if (a === 15 && inv) {
      proc.push(`A^{-1}=${mtex(inv)}`)
      resp += `; A⁻¹ = $$${mtex(inv)}$$`
      formulas.push(mtex(inv))
    }
    return { procedimiento: proc, respuesta: resp, formulas }
  }

  // Vectores y cantidades geométricas (actividades 16–25)
  if (a === 16) {
    const g = (s: string): { cuad: R; val: number } => {
      const t = s.replace(/\s/g, '')
      const m = /^(-?)\\sqrt\{(\d+)\}$/.exec(t)
      if (m) return { cuad: R(Number(m[2])), val: (m[1] ? -1 : 1) * Math.sqrt(Number(m[2])) }
      return { cuad: R(Number(t) ** 2), val: Number(t) }
    }
    const comp = /v = \((.+?),\s*(.+?)\)\s*\$?$/.exec(st)!
    const x = g(comp[1])
    const y = g(comp[2])
    const mag = add(x.cuad, y.cuad)
    let th = (Math.atan2(y.val, x.val) * 180) / Math.PI
    if (th < 0) th += 360
    const m = raizTex(mag)
    return { procedimiento: [`|v|=\\sqrt{x^2+y^2}=\\sqrt{${tex(mag)}}=${m}`, `\\theta=\\arctan\\frac{y}{x}\\ \\text{(según el cuadrante)}\\approx ${th.toFixed(2)}^\\circ`], respuesta: `|v| = ${m}, θ ≈ ${th.toFixed(2)}° (medido desde el eje x positivo)`, formulas: [m] }
  }
  if (a === 17 || a === 19) {
    const env = entorno(st, 2)
    const out: string[] = []
    const forms: string[] = []
    for (const m of st.matchAll(/([a-f])\)\s*\$([^$]+)\$/g)) {
      const v = evaluar(m[2], env)
      if (v.k !== 'v') continue
      const f = vtex(v.c.slice(0, 2))
      out.push(`${m[1]}) ${m[2]} = ${f}`)
      forms.push(f)
    }
    return { procedimiento: out, respuesta: out.map((x) => `$${x}$`).join('; '), formulas: forms }
  }
  if (a === 18 || a === 20 || a === 21 || a === 22 || a === 23 || a === 24 || a === 25) return vectores(a, n, st, dimension)

  if (a === 28) {
    const cols = matrices(st.replace(/,\s*\\begin/g, ' \\begin')).length ? [...st.matchAll(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g)].map((m) => m[1].split('\\\\').map((x) => entero(x.trim()))) : []
    const M = cols[0].map((_, i) => cols.map((c) => c[i]))
    const r = rango(M)
    const ind = r === cols.length
    return { procedimiento: [`\\text{rango}=${r}\\ \\text{con ${cols.length} vectores}`], respuesta: ind ? 'Linealmente independientes (el rango es igual al número de vectores).' : `Linealmente dependientes (rango ${r} < ${cols.length} vectores).`, formulas: [] }
  }
  if (a === 29) {
    const c = matrices(st)
    const e1 = c[1].map((r) => r[0])
    const e2 = c[3].map((r) => r[0])
    const pts = [...st.matchAll(/([ab])\)\s*\$T\\begin\{pmatrix\}\s*(-?\d+)\s*\\\\\s*(-?\d+)\s*\\end\{pmatrix\}\$/g)]
    const forms: string[] = []
    const out = pts.map((m) => {
      const r = e1.map((x, i) => add(mul(R(Number(m[2])), x), mul(R(Number(m[3])), e2[i])))
      forms.push(ctex(r))
      return `${m[1]}) T(${m[2]},${m[3]}) = ${m[2]}T(e_1)+(${m[3]})T(e_2) = ${ctex(r)}`
    })
    return { procedimiento: out, respuesta: out.map((x) => `$${x}$`).join('; '), formulas: forms }
  }
  if (a >= 30 && a <= 32) return transformaciones(a, st)
  return null
}

function vectores(a: number, n: string, st: string, dim: 2 | 3): Solucion | null {
  const env = entorno(st, dim)
  const par = /\$u = ([^$]*?);?\s*v = ([^$]*?)\$|\$u = ([^$;]+);\s*v = ([^$]+)\$/.exec(st)
  const U = par ? ijk((par[1] ?? par[3] ?? '').trim()) : null
  const Vv = par ? ijk((par[2] ?? par[4] ?? '').trim()) : null
  const u = U ?? (env.u?.k === 'v' ? env.u.c : null)
  const v = Vv ?? (env.v?.k === 'v' ? env.v.c : null)
  const cortar = (c: R[]) => c.slice(0, dim)
  if (a === 18) {
    const w = /v = ([^$]+)\$/.exec(st)![1]
    const c = ijk(w)!
    const m2 = norma2(c)
    const mag = raizTex(m2)
    if (n === '4') {
      const s = sobreRaiz(c[1], m2)
      const co = sobreRaiz(c[0], m2)
      return { procedimiento: [`|v|=\\sqrt{${tex(m2)}}`, `\\operatorname{sen}\\theta=\\frac{y}{|v|}=${s},\\ \\cos\\theta=\\frac{x}{|v|}=${co}`], respuesta: `sen θ = $${s}$, cos θ = $${co}$`, formulas: [s, co] }
    }
    const f = `${sobreRaiz(c[0], m2)}\\,i${sobreRaiz(c[1], m2).startsWith('-') ? '' : '+'}${sobreRaiz(c[1], m2)}\\,j`
    return { procedimiento: [`|v|=\\sqrt{${tex(m2)}}=${mag}`, `\\hat v=\\frac{v}{|v|}=${f}`], respuesta: `$${f}$`, formulas: [] }
  }
  if (a === 20 && u && v) {
    const d = dot(cortar(u), cortar(v))
    const m1 = norma2(cortar(u))
    const m2 = norma2(cortar(v))
    const cos = sobreRaiz(d, mul(m1, m2))
    return { procedimiento: [`u\\cdot v=${tex(d)}`, `\\cos\\theta=\\frac{u\\cdot v}{|u||v|}=${cos}`], respuesta: `u · v = $${tex(d)}$; cos θ = $${cos}$`, formulas: [tex(d)] }
  }
  if (a === 21 && u && v) {
    const d = dot(cortar(u), cortar(v))
    const cruz = sub(mul(u[0], v[1]), mul(u[1], v[0]))
    const tipo = isZero(d) ? 'ortogonales' : isZero(cruz) ? 'paralelos' : 'ninguno de los dos'
    return { procedimiento: [`u\\cdot v=${tex(d)}`, `u_1v_2-u_2v_1=${tex(cruz)}`], respuesta: `${tipo} (u · v = ${tex(d)}; u₁v₂ − u₂v₁ = ${tex(cruz)})`, formulas: [] }
  }
  if (a === 22 && u && v) {
    const d = dot(cortar(u), cortar(v))
    const m2 = norma2(cortar(v))
    const k = div(d, m2)
    const p = cortar(v).map((x) => mul(k, x))
    const f = vtex(p.concat(Array(3 - p.length).fill(ZERO)))
    return { procedimiento: [`\\operatorname{proy}_v u=\\frac{u\\cdot v}{|v|^2}\\,v=\\frac{${tex(d)}}{${tex(m2)}}\\,v=${f}`], respuesta: `$${f}$`, formulas: [f] }
  }
  if (a === 23) {
    const c = ijk(/v = ([^$]+)\$/.exec(st)![1])!
    const m2 = norma2(c)
    const mag = raizTex(m2)
    const cos = c.map((x) => sobreRaiz(x, m2))
    return { procedimiento: [`|v|=\\sqrt{${tex(m2)}}=${mag}`, `\\cos\\alpha=\\frac{v_x}{|v|},\\ \\cos\\beta=\\frac{v_y}{|v|},\\ \\cos\\gamma=\\frac{v_z}{|v|}`], respuesta: `|v| = $${mag}$; cos α = $${cos[0]}$, cos β = $${cos[1]}$, cos γ = $${cos[2]}$`, formulas: [mag] }
  }
  if (a === 25) {
    if (!u || !v) return null
    const w = [sub(mul(u[1], v[2]), mul(u[2], v[1])), sub(mul(u[2], v[0]), mul(u[0], v[2])), sub(mul(u[0], v[1]), mul(u[1], v[0]))]
    const f = vtex(w)
    return { procedimiento: [`u\\times v=\\begin{vmatrix}i&j&k\\\\${u.map(tex).join('&')}\\\\${v.map(tex).join('&')}\\end{vmatrix}=${f}`], respuesta: `$${f}$`, formulas: [f] }
  }
  if (a === 24) {
    const e = entorno(st, 3)
    if (n === '7' || n === '8') {
      const t = e.t as { k: 'v'; c: R[] }
      const w = e.w as { k: 'v'; c: R[] }
      const d = dot(t.c, w.c)
      if (n === '7') {
        const cos = `\\frac{${tex(d)}}{\\sqrt{${tex(mul(norma2(t.c), norma2(w.c)))}}}`
        const ang = (Math.acos(num(d) / Math.sqrt(num(norma2(t.c)) * num(norma2(w.c)))) * 180) / Math.PI
        return { procedimiento: [`t\\cdot w=${tex(d)}`, `\\cos\\theta=${cos}\\Rightarrow\\theta\\approx ${ang.toFixed(2)}^\\circ`], respuesta: `θ ≈ ${ang.toFixed(2)}° (cos θ = $${cos}$)`, formulas: [] }
      }
      const p = t.c.map((x) => mul(div(d, norma2(t.c)), x))
      const f = vtex(p)
      return { procedimiento: [`\\operatorname{proy}_t w=\\frac{w\\cdot t}{|t|^2}t=${f}`], respuesta: `$${f}$`, formulas: [f] }
    }
    const expr = /^\$([^$]+)\$/.exec(st.split('. Calcule ')[1] ?? '')?.[1]
    if (!expr) return null
    const val = evaluar(expr, e)
    const f = val.k === 'e' ? tex(val.v) : val.k === 'v' ? vtex(val.c) : ''
    return { procedimiento: [`${expr}=${f}`], respuesta: `$${f}$`, formulas: [f] }
  }
  return null
}

/** c/√m con la raíz simplificada: 3/√9 → 1, 4/√52 → 2/√13. */
function sobreRaiz(c: R, m: R): string {
  if (isZero(c)) return '0'
  let out = 1n
  let rest = m.n
  for (let f = 2n; f * f <= rest; f++) while (rest % (f * f) === 0n) (out *= f), (rest /= f * f)
  const r = div(c, R(out))
  if (rest === 1n) return tex(r)
  const signo = r.n < 0n ? '-' : ''
  const n = r.n < 0n ? -r.n : r.n
  return `${signo}\\frac{${n}}{${r.d === 1n ? '' : r.d}\\sqrt{${rest}}}`
}

const ang = (g: number) => (g * Math.PI) / 180
const r4 = (x: number) => (Math.abs(x) < 5e-5 ? 0 : Math.round(x * 1e4) / 1e4)

function transformaciones(a: number, st: string): Solucion | null {
  const pts = [...st.matchAll(/P_\{(\d+)\}\(([^)]*)\)/g)].map((m) => m[2].split(',').map((s) => Number(s.trim().replace(/\\?[a-z]+/, '')) ))
  const fmt = (P: number[][]) => P.map((p, i) => `P_{${i + 1}}'=(${p.map((x) => r4(x)).join(', ')})`).join('\\quad ')
  if (a === 30) {
    let P = pts
    const pasos = [fmt(P)]
    P = P.map(([x, y]) => [x - 3, y - 2])
    pasos.push(`\\text{a) }${fmt(P)}`)
    const c = Math.cos(ang(45))
    P = P.map(([x, y]) => [x * c - y * c, x * c + y * c])
    pasos.push(`\\text{b) }${fmt(P)}`)
    P = P.map(([x, y]) => [x * 1, y * 1.5])
    pasos.push(`\\text{c) }${fmt(P)}`)
    P = P.map(([x, y]) => [x + 3, y + 2])
    pasos.push(`\\text{d) }${fmt(P)}`)
    return { procedimiento: pasos, respuesta: `Puntos finales: $${fmt(P)}$ (con 4 decimales; cada paso se aplica sobre el resultado del anterior).`, formulas: [] }
  }
  if (a === 31) {
    const [p1, p2, p3, p4] = pts
    if (/pivote/.test(st)) {
      const th = -ang(45)
      const rot = (p: number[]) => [4 + (p[0] - 4) * Math.cos(th) - (p[1] - 4) * Math.sin(th), 4 + (p[0] - 4) * Math.sin(th) + (p[1] - 4) * Math.cos(th)]
      const Q = [p1, p2, p3, p4].map(rot)
      return { procedimiento: ['T(-R)\\to R_{\\theta}\\to T(R)\\ \\text{con }R=(4,4),\\ \\theta=-45^\\circ', fmt(Q)], respuesta: `Puntos finales: $${fmt(Q)}$`, formulas: [] }
    }
    const Q = [p1, p2, p3, p4].map((p) => [p1[0] + (p[0] - p1[0]) * 2, p1[1] + (p[1] - p1[1]) * 0.5])
    return { procedimiento: ['T(P_1)\\,S(2,1/2)\\,T(-P_1)', fmt(Q)], respuesta: `Puntos finales: $${fmt(Q)}$`, formulas: [] }
  }
  if (a === 32) {
    let P = pts
    const pasos = [fmt(P).replace(/\(/g, '(')]
    const c90 = Math.cos(ang(90))
    const s90 = Math.sin(ang(90))
    P = P.map(([x, y, z]) => [x, y * c90 - z * s90, y * s90 + z * c90])
    pasos.push(`\\text{a) }${fmt(P)}`)
    const c45 = Math.cos(ang(45))
    const s45 = Math.sin(ang(45))
    P = P.map(([x, y, z]) => [x * c45 + z * s45, y, -x * s45 + z * c45])
    pasos.push(`\\text{b) }${fmt(P)}`)
    P = P.map(([x, y, z]) => [2 * x, 2 * y, 2 * z])
    pasos.push(`\\text{c) }${fmt(P)}`)
    return { procedimiento: pasos, respuesta: `Puntos finales: $${fmt(P)}$ (rotación sobre x: y′ = y cosθ − z senθ, z′ = y senθ + z cosθ; sobre y: x′ = x cosθ + z senθ, z′ = −x senθ + z cosθ).`, formulas: [] }
  }
  return null
}

export function resolver(act: string, n: string, statement: string): Solucion | null {
  try {
    return ejercicio(act, n, statement)
  } catch {
    return null
  }
}
