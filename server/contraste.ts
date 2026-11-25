// Contraste de una transcripción con el enunciado de la base y consigo misma: detecta datos que no coinciden
// (signos o dígitos de matrices, puntos, flechas de una gráfica). No decide nada: señala dónde volver a mirar la foto.
import { diffCells, extractMatrices, frac, parseNumber, type Frac, type Mat } from '../src/shared/linalg'
import { parseFigure } from '../src/shared/figure'
import type { Exercise } from '../src/shared/types'

const COORD_RE = /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)/

/** Sistema del enunciado (`aligned` con ecuaciones lineales) como matriz aumentada [A|b]; null si no se entiende. */
export function sistemaAMatriz(latex: string): Mat | null {
  const body = /\\begin\{(?:aligned|array|cases)\}(?:\{[^}]*\})?([\s\S]*?)\\end\{(?:aligned|array|cases)\}/.exec(latex)?.[1] ?? latex
  const eqs = body.split(/\\\\/).map((r) => r.replace(/&/g, '').trim()).filter(Boolean)
  if (eqs.length < 2 || !eqs.every((e) => e.includes('='))) return null
  const vars: string[] = []
  const rows: Record<string, Frac>[] = []
  const rhs: Frac[] = []
  for (const e of eqs) {
    const [l, r] = e.split('=')
    const b = parseNumber(r.replace(/\s/g, ''))
    if (!b) return null
    const row: Record<string, Frac> = {}
    const t = l.replace(/\s/g, '')
    const re = /([+-]?)(\d+(?:\.\d+)?)?([a-zA-Z](?:_\{?\d+\}?)?)/gy
    let pos = 0
    for (let m = re.exec(t); m; m = re.exec(t)) {
      const c = parseNumber(`${m[1] === '-' ? '-' : ''}${m[2] ?? '1'}`)
      if (!c) return null
      if (!vars.includes(m[3])) vars.push(m[3])
      row[m[3]] = c
      pos = re.lastIndex
    }
    if (pos !== t.length) return null
    rows.push(row)
    rhs.push(b)
  }
  const zero = frac(0n)
  return { kind: 'mat', rows: rows.map((row, i) => [...vars.map((v) => row[v] ?? zero), rhs[i]]) }
}

const norm = (s: string) => s.replace(/[−–]/g, '-').replace(/\\left|\\right|[\s{}]/g, '')

/** ¿Aparece la matriz esperada, o una casi igual? Devuelve el problema o null. */
function buscarMatriz(esperada: Mat, delAlumno: Mat[], nombre: string): string | null {
  const r = esperada.rows.length
  const c = esperada.rows[0].length
  const mismas = delAlumno.filter((m) => m.rows.length === r && m.rows[0].length === c)
  let mejor: { d: ReturnType<typeof diffCells> } | null = null
  for (const m of mismas) {
    const d = diffCells(m, esperada)
    if (!d.length) return null
    if (!mejor || d.length < mejor.d.length) mejor = { d }
  }
  if (mejor && mejor.d.length <= Math.max(2, Math.floor((r * c) / 4))) {
    const cells = mejor.d.map((x) => `celda (${x.row},${x.col}): escrito ${x.left}, enunciado ${x.right}`).join('; ')
    return `${nombre}: la matriz más parecida de la hoja difiere del enunciado en ${cells}. Vuelve a mirar esas celdas en la foto.`
  }
  return `${nombre}: no aparece ninguna matriz ${r}×${c} igual (ni casi igual) en la hoja; puede estar en otra hoja o mal transcrita.`
}

export interface Contraste {
  ref: string
  problemas: string[]
}

/** Revisa una transcripción contra los ejercicios que dice resolver. */
export function contrastar(texto: string, ejercicios: Exercise[]): Contraste[] {
  const delAlumno = extractMatrices(texto)
  const plano = norm(texto)
  const out: Contraste[] = []
  for (const ex of ejercicios) {
    const problemas: string[] = []
    const sis = sistemaAMatriz(ex.statement)
    // Solo cuando el método pide matrices (por sustitución o gráfico no hay matriz que comparar).
    if (sis && /gauss|jordan|matriz|matricial|escalon|aumentada|inversa|eliminaci/i.test(ex.statement + ex.number)) {
      const p = buscarMatriz(sis, delAlumno, 'Sistema del enunciado como matriz aumentada')
      if (p) problemas.push(p)
    }
    for (const m of extractMatrices(ex.statement)) {
      if (sis && m.rows.length === sis.rows.length && m.rows[0].length === sis.rows[0].length) continue
      const p = buscarMatriz(m, delAlumno, 'Matriz del enunciado')
      if (p) problemas.push(p)
    }
    // Puntos del enunciado: P_{1}(4, 7) → debe aparecer "(4,7)" en la hoja.
    const faltan = new Set<string>()
    for (const m of ex.statement.matchAll(/P_?\{?(\d+)\}?\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)/g)) {
      const par = `(${[m[2], m[3], m[4]].filter((v) => v !== undefined).join(',')})`
      const coords = [m[2], m[3], m[4]].filter((v) => v !== undefined).map(Number)
      const enMatriz = delAlumno.some((mt) => {
        const flat = mt.rows.flat().map((f) => Number(f.n) / Number(f.d))
        return mt.rows.length * mt.rows[0].length === coords.length && coords.every((v, i) => Math.abs(v - flat[i]) < 1e-9)
      })
      if (!plano.includes(par) && !enMatriz) faltan.add(`P${m[1]}${par}`)
    }
    if (faltan.size) problemas.push(`Puntos del enunciado que no aparecen escritos en la hoja: ${[...faltan].join(', ')}.`)
    if (/grafic/i.test(ex.statement) && !/```grafica|\[Gr[aá]fica/.test(texto)) problemas.push('El enunciado pide graficar y la hoja no trae figura (puede estar en otra hoja).')
    out.push({ ref: ex.ref, problemas })
  }
  return out
}

/** Revisa las gráficas de una transcripción: etiquetas con coordenadas frente a lo dibujado y figuras sin referencias. */
export function contrastarFiguras(texto: string): string[] {
  const out: string[] = []
  let n = 0
  for (const m of texto.matchAll(/```grafica\s*\n([\s\S]*?)```/g)) {
    n++
    const r = parseFigure(m[1])
    if (!r.ok) {
      out.push(`Figura ${n}: JSON no válido (${r.error}).`)
      continue
    }
    let etiquetados = 0
    const els = r.spec.elementos as { t: string; a?: number[]; en?: number[]; de?: number[]; etiqueta?: string; texto?: string }[]
    for (const e of els) {
      if (e.t !== 'vector' && e.t !== 'punto') continue
      const q = e.t === 'vector' ? e.a : e.en
      const c = e.etiqueta ? COORD_RE.exec(e.etiqueta) : null
      if (!c || !q) continue
      etiquetados++
      const quer = [c[1], c[2], c[3]].filter((v) => v !== undefined).map((v) => Number(v))
      const dibu = q.slice(0, quer.length)
      if (quer.some((v, i) => Math.abs(v - dibu[i]) > 1e-9)) out.push(`Figura ${n}: ${e.t} etiquetado "${e.etiqueta}" pero dibujado en (${q.join(',')}).`)
    }
    const nElem = els.filter((e) => e.t !== 'texto').length
    if (!etiquetados && r.spec.escala !== 'leida') out.push(`Figura ${n}: ${nElem} elemento(s) sin coordenadas escritas ni escala; compara cada flecha (origen, punta y sentido) con la foto.`)
    const vec = els.filter((e) => e.t === 'vector')
    for (const v of vec) {
      const a = v.a ?? []
      const de = v.de ?? a.map(() => 0)
      if (a.every((x, i) => x === de[i])) out.push(`Figura ${n}: un vector tiene origen y punta iguales (flecha de longitud cero).`)
    }
    if (r.spec.tipo === 'cartesiana' && els.some((e) => e.t === 'texto' && /^[xy]$/i.test(e.texto ?? ''))) out.push(`Figura ${n}: tiene rótulos "x"/"y" como texto; el motor ya rotula los ejes (puede salir duplicado).`)
  }
  return out
}

// ───────── Cadena de operaciones entre renglones: R2 → R2 − 2R1 aplicada a la matriz anterior da la siguiente ─────────

function coef(raw: string): number | null {
  let t = raw.replace(/\\left|\\right|[()\s]/g, '').replace(/[−–]/g, '-')
  if (!t || t === '+') return 1
  if (t === '-') return -1
  const fr = /^([+-]?)\\[dt]?frac\{(-?\d+(?:\.\d+)?)\}\{(-?\d+(?:\.\d+)?)\}$/.exec(t)
  if (fr) return (fr[1] === '-' ? -1 : 1) * (Number(fr[2]) / Number(fr[3]))
  t = t.replace(/\\cdot|\\times/g, '')
  const sl = /^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(t)
  if (sl) return Number(sl[1]) / Number(sl[2])
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

type Op = { tipo: 'swap'; a: number; b: number } | { tipo: 'lin'; destino: number; terminos: { f: number; c: number }[] }

function parseOps(latex: string): Op[] | null {
  const t = latex.replace(/\\(?:long)?rightarrow|\\to\b/g, '->').replace(/\\leftrightarrow|\\longleftrightarrow/g, '<->')
  const ops: Op[] = []
  for (const parte of t.split(/\\qquad|\\quad|;|,|\\\\/).map((x) => x.trim()).filter(Boolean)) {
    const sw = /^[RF]_?\{?(\d)\}?\s*<->\s*[RF]_?\{?(\d)\}?$/.exec(parte)
    if (sw) {
      ops.push({ tipo: 'swap', a: Number(sw[1]) - 1, b: Number(sw[2]) - 1 })
      continue
    }
    const m = /^[RF]_?\{?(\d)\}?\s*->\s*(.+)$/.exec(parte)
    if (!m) return null
    const terminos: { f: number; c: number }[] = []
    const re = /((?:[+-]\s*)?(?:\\left)?\(?[^RF+]*?\)?(?:\\right)?)\s*[RF]_?\{?(\d)\}?/gy
    const rhs = m[2].replace(/\s/g, '')
    let pos = 0
    for (let k = re.exec(rhs); k; k = re.exec(rhs)) {
      const c = coef(k[1])
      if (c === null) return null
      terminos.push({ f: Number(k[2]) - 1, c })
      pos = re.lastIndex
    }
    if (!terminos.length || pos !== rhs.length) return null
    ops.push({ tipo: 'lin', destino: Number(m[1]) - 1, terminos })
  }
  return ops.length ? ops : null
}

const toNums = (m: Mat) => m.rows.map((r) => r.map((x) => Number(x.n) / Number(x.d)))

function aplicar(base: number[][], ops: Op[]): number[][] | null {
  const M = base.map((r) => [...r])
  for (const o of ops) {
    if (o.tipo === 'swap') {
      if (!M[o.a] || !M[o.b]) return null
      ;[M[o.a], M[o.b]] = [M[o.b], M[o.a]]
    } else {
      if (!M[o.destino] || o.terminos.some((t) => !M[t.f])) return null
      const nuevo = M[0].map((_, j) => o.terminos.reduce((s, t) => s + t.c * M[t.f][j], 0))
      M[o.destino] = nuevo
    }
  }
  return M
}

const fmt = (x: number) => String(+x.toPrecision(6))

/** Verifica que cada matriz siga de la anterior mediante la operación de renglones escrita entre ambas. */
export function verificarCadena(texto: string): string[] {
  const out: string[] = []
  let ultima: Mat | null = null
  let pendiente: { ops: Op[]; txt: string } | null = null
  texto.split('\n').forEach((raw, i) => {
    const l = raw.trim()
    if (!l.startsWith('$$') || !l.endsWith('$$') || l.length < 5) return
    const c = l.slice(2, -2)
    if (/[RF]_?\{?\d\}?\s*(?:\\(?:long)?(?:left)?(?:right)?arrow|\\to\b|\\leftrightarrow)/.test(c) || /[RF]_?\{?\d\}?\s*(?:->|<->)/.test(c)) {
      const ops = parseOps(c)
      // Varios renglones de operaciones seguidos se aplican juntos a la matriz anterior.
      pendiente = ops ? { ops: [...(pendiente?.ops ?? []), ...ops], txt: pendiente ? `${pendiente.txt} … ${c.trim().slice(0, 40)}` : c.trim().slice(0, 50) } : null
      return
    }
    const ms = extractMatrices(c)
    if (ms.length !== 1) {
      return
    }
    const nueva = ms[0]
    if (pendiente && ultima && ultima.rows.length === nueva.rows.length && ultima.rows[0].length === nueva.rows[0].length) {
      const esperado = aplicar(toNums(ultima), pendiente.ops)
      if (esperado) {
        const dif: string[] = []
        toNums(nueva).forEach((r, a) =>
          r.forEach((x, b) => {
            if (Math.abs(x - esperado[a][b]) > 1e-6) dif.push(`(${a + 1},${b + 1}): escrito ${fmt(x)}, esperado ${fmt(esperado[a][b])}`)
          }),
        )
        if (dif.length) out.push(`Línea ${i + 1}: tras «${pendiente.txt}» la matriz difiere en celda ${dif.slice(0, 4).join('; ')}${dif.length > 4 ? '…' : ''}. Error del alumno o lectura equivocada: mira esas celdas en la foto.`)
      }
    }
    ultima = nueva
    pendiente = null
  })
  return out
}
