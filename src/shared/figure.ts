// Gráficas cartesianas 2D descritas con JSON → SVG. Pensado para dibujar lo que el alumno dibujó:
// el agente describe elementos (rectas, vectores, puntos, funciones) y este módulo los traza.
// Sin dependencias: sirve en el servidor (PNG con resvg) y en el navegador (vista previa).
import { compileExpr } from './expr'

export type Escala = 'leida' | 'inferida' | 'sin_valores'
type P = [number, number]

export type Elemento =
  | { t: 'recta'; puntos?: [P, P]; m?: number; b?: number; a?: number; c?: number; x?: number; y?: number; etiqueta?: string }
  | { t: 'segmento'; puntos: [P, P]; etiqueta?: string }
  | { t: 'vector'; de?: P; a: P; etiqueta?: string }
  | { t: 'punto'; en: P; etiqueta?: string }
  | { t: 'funcion'; expr: string; dominio?: [number, number]; etiqueta?: string }
  | { t: 'poligono'; puntos: P[]; relleno?: boolean; etiqueta?: string }
  | { t: 'texto'; en: P; texto: string }

export interface FigureSpec {
  tipo: 'cartesiana'
  /** `sin_valores`: los ejes de la foto no traen números (no se dibujan). `inferida`: números deducidos, se rotulan como tales. */
  escala: Escala
  x?: [number, number]
  y?: [number, number]
  /** El papel de la libreta era cuadriculado. */
  cuadricula?: boolean
  etiquetas_ejes?: [string, string]
  elementos: Elemento[]
}

export type ParseResult = { ok: true; spec: FigureSpec } | { ok: false; error: string }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isP = (v: unknown): v is P => Array.isArray(v) && v.length === 2 && v.every(isNum)
const isRange = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(isNum) && (v as number[])[0] < (v as number[])[1]

export function parseFigure(src: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(src)
  } catch (e) {
    return { ok: false, error: `JSON inválido: ${e instanceof Error ? e.message : e}` }
  }
  const s = raw as Record<string, unknown>
  if (!s || typeof s !== 'object') return { ok: false, error: 'La gráfica debe ser un objeto JSON.' }
  if (s.tipo !== 'cartesiana') return { ok: false, error: 'Solo se admite "tipo": "cartesiana".' }
  if (!['leida', 'inferida', 'sin_valores'].includes(s.escala as string))
    return { ok: false, error: '"escala" debe ser "leida", "inferida" o "sin_valores".' }
  for (const k of ['x', 'y'] as const)
    if (s[k] !== undefined && !isRange(s[k])) return { ok: false, error: `"${k}" debe ser [mín, máx] con mín < máx.` }
  if (!Array.isArray(s.elementos) || !s.elementos.length) return { ok: false, error: '"elementos" debe ser una lista no vacía.' }
  if (s.elementos.length > 60) return { ok: false, error: 'Demasiados elementos (máximo 60).' }

  for (const [i, e] of (s.elementos as Record<string, unknown>[]).entries()) {
    const w = `Elemento ${i + 1} (${String(e?.t)})`
    switch (e?.t) {
      case 'recta': {
        const two = Array.isArray(e.puntos) && e.puntos.length === 2 && e.puntos.every(isP) && JSON.stringify(e.puntos[0]) !== JSON.stringify(e.puntos[1])
        const slope = isNum(e.m) && (e.b === undefined || isNum(e.b))
        const general = isNum(e.a) && isNum(e.b) && isNum(e.c) && !(e.a === 0 && e.b === 0)
        const vert = isNum(e.x) && e.m === undefined
        const horiz = isNum(e.y) && e.m === undefined
        if (!(two || slope || general || vert || horiz))
          return { ok: false, error: `${w}: define la recta con "puntos" (2 distintos), "m" y "b", "a","b","c" (ax+by=c), "x" o "y".` }
        break
      }
      case 'segmento':
        if (!(Array.isArray(e.puntos) && e.puntos.length === 2 && e.puntos.every(isP))) return { ok: false, error: `${w}: "puntos" debe ser [[x,y],[x,y]].` }
        break
      case 'vector':
        if (!isP(e.a) || (e.de !== undefined && !isP(e.de))) return { ok: false, error: `${w}: usa "de": [x,y] (opcional, por defecto el origen) y "a": [x,y].` }
        break
      case 'punto':
        if (!isP(e.en)) return { ok: false, error: `${w}: "en" debe ser [x,y].` }
        break
      case 'funcion':
        try {
          compileExpr(String(e.expr))
        } catch (err) {
          return { ok: false, error: `${w}: ${err instanceof Error ? err.message : err}` }
        }
        if (e.dominio !== undefined && !isRange(e.dominio)) return { ok: false, error: `${w}: "dominio" debe ser [mín, máx].` }
        break
      case 'poligono':
        if (!(Array.isArray(e.puntos) && e.puntos.length >= 3 && e.puntos.every(isP))) return { ok: false, error: `${w}: "puntos" necesita al menos 3 puntos.` }
        break
      case 'texto':
        if (!isP(e.en) || typeof e.texto !== 'string') return { ok: false, error: `${w}: usa "en": [x,y] y "texto".` }
        break
      default:
        return { ok: false, error: `${w}: tipo desconocido (usa recta, segmento, vector, punto, funcion, poligono o texto).` }
    }
  }
  return { ok: true, spec: s as unknown as FigureSpec }
}

const PALETTE = ['#1f4e9c', '#c0392b', '#1e8449', '#8e44ad', '#b9770e', '#117a8b']
const FONT = 'DejaVu Sans, Liberation Sans, Arial, sans-serif'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** `L_1`, `v_{12}`, `x^2` → tspans con sub/superíndice. */
function richText(label: string): string {
  const out: string[] = []
  const re = /([_^])(\{[^}]*\}|.)|([^_^]+)/g
  for (const m of label.matchAll(re)) {
    if (m[3] !== undefined) out.push(esc(m[3]))
    else {
      const body = m[2].startsWith('{') ? m[2].slice(1, -1) : m[2]
      out.push(`<tspan font-size="70%" baseline-shift="${m[1] === '_' ? 'sub' : 'super'}">${esc(body)}</tspan>`)
    }
  }
  return out.join('')
}

function niceStep(range: number): number {
  const rough = range / 8
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const f = rough / pow
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow
}
const fmt = (n: number) => String(Math.abs(n) < 1e-9 ? 0 : Number(n.toPrecision(6)))

function pointsOf(e: Elemento): P[] {
  switch (e.t) {
    case 'recta':
      return e.puntos ? [...e.puntos] : e.b !== undefined && e.m !== undefined ? [[0, e.b]] : []
    case 'segmento':
    case 'poligono':
      return [...e.puntos]
    case 'vector':
      return [e.de ?? [0, 0], e.a]
    case 'punto':
    case 'texto':
      return [e.en]
    default:
      return []
  }
}

export function figureSvg(spec: FigureSpec): string {
  // Rango visible: el indicado, o el que abarca lo dibujado (siempre incluyendo el origen), con margen.
  let [x0, x1] = spec.x ?? [NaN, NaN]
  let [y0, y1] = spec.y ?? [NaN, NaN]
  if (!spec.x || !spec.y) {
    const pts = spec.elementos.flatMap(pointsOf)
    for (const e of spec.elementos) if (e.t === 'funcion' && e.dominio) pts.push([e.dominio[0], 0], [e.dominio[1], 0])
    const xs = [0, ...pts.map((p) => p[0])]
    const ys = [0, ...pts.map((p) => p[1])]
    const ex = spec.elementos.some((e) => e.t === 'recta' || e.t === 'funcion')
    const px = Math.max(1, (Math.max(...xs) - Math.min(...xs)) * 0.25)
    const py = Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.25)
    if (!spec.x) [x0, x1] = [Math.min(...xs, ex ? -4 : 0) - px, Math.max(...xs, ex ? 4 : 0) + px]
    if (!spec.y) [y0, y1] = [Math.min(...ys, ex ? -4 : 0) - py, Math.max(...ys, ex ? 4 : 0) + py]
  }
  // Escala 1:1 en ambos ejes: la pendiente que se ve es la que es.
  const W = 520
  const M = 34
  const aspect = Math.min(1.25, Math.max(0.55, (y1 - y0) / (x1 - x0)))
  if ((y1 - y0) / (x1 - x0) < aspect) {
    const c = (y0 + y1) / 2
    const h = (x1 - x0) * aspect
    ;[y0, y1] = [c - h / 2, c + h / 2]
  } else {
    const c = (x0 + x1) / 2
    const w = (y1 - y0) / aspect
    ;[x0, x1] = [c - w / 2, c + w / 2]
  }
  const H = Math.round(W * aspect)
  const sx = (W - 2 * M) / (x1 - x0)
  const sy = (H - 2 * M) / (y1 - y0)
  const X = (x: number) => +(M + (x - x0) * sx).toFixed(2)
  const Y = (y: number) => +(H - M - (y - y0) * sy).toFixed(2)

  const out: string[] = []
  const stepX = niceStep(x1 - x0)
  const stepY = niceStep(y1 - y0)
  const axX = Math.min(Math.max(0, y0), y1)
  const axY = Math.min(Math.max(0, x0), x1)

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="14">`)
  out.push(
    `<defs><clipPath id="v"><rect x="${M - 4}" y="${M - 4}" width="${W - 2 * M + 8}" height="${H - 2 * M + 8}"/></clipPath>` +
      `<marker id="ax" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#222"/></marker>` +
      PALETTE.map((c, i) => `<marker id="m${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`).join('') +
      '</defs>',
  )
  out.push(`<rect width="${W}" height="${H}" fill="#fff"/>`)

  if (spec.cuadricula !== false && (spec.cuadricula || spec.escala !== 'sin_valores')) {
    let g = ''
    for (let v = Math.ceil(x0 / stepX) * stepX; v <= x1 + 1e-9; v += stepX) g += `<line x1="${X(v)}" y1="${M - 4}" x2="${X(v)}" y2="${H - M + 4}"/>`
    for (let v = Math.ceil(y0 / stepY) * stepY; v <= y1 + 1e-9; v += stepY) g += `<line x1="${M - 4}" y1="${Y(v)}" x2="${W - M + 4}" y2="${Y(v)}"/>`
    out.push(`<g stroke="#d9dee7" stroke-width="1">${g}</g>`)
  }

  // Ejes con flecha.
  out.push(
    `<g stroke="#222" stroke-width="1.6"><line x1="${M - 4}" y1="${Y(axX)}" x2="${W - M + 4}" y2="${Y(axX)}" marker-end="url(#ax)"/>` +
      `<line x1="${X(axY)}" y1="${H - M + 4}" x2="${X(axY)}" y2="${M - 4}" marker-end="url(#ax)"/></g>`,
  )
  const [lx, ly] = spec.etiquetas_ejes ?? ['x', 'y']
  out.push(`<text x="${W - M + 8}" y="${Y(axX) - 8}" font-style="italic">${richText(lx)}</text>`)
  out.push(`<text x="${X(axY) + 8}" y="${M - 8}" font-style="italic">${richText(ly)}</text>`)

  if (spec.escala !== 'sin_valores') {
    const gray = spec.escala === 'inferida'
    let t = ''
    for (let v = Math.ceil(x0 / stepX) * stepX; v <= x1 + 1e-9; v += stepX) {
      if (Math.abs(v) < 1e-9) continue
      t += `<line x1="${X(v)}" y1="${Y(axX) - 4}" x2="${X(v)}" y2="${Y(axX) + 4}" stroke="#222"/><text x="${X(v)}" y="${Y(axX) + 20}" text-anchor="middle">${fmt(v)}</text>`
    }
    for (let v = Math.ceil(y0 / stepY) * stepY; v <= y1 + 1e-9; v += stepY) {
      if (Math.abs(v) < 1e-9) continue
      t += `<line x1="${X(axY) - 4}" y1="${Y(v)}" x2="${X(axY) + 4}" y2="${Y(v)}" stroke="#222"/><text x="${X(axY) - 8}" y="${Y(v) + 5}" text-anchor="end">${fmt(v)}</text>`
    }
    out.push(`<g font-size="12" fill="${gray ? '#777' : '#222'}"${gray ? ' font-style="italic"' : ''}>${t}</g>`)
  }
  if (spec.escala === 'inferida') out.push(`<text x="${M}" y="${H - 8}" font-size="11" fill="#999" font-style="italic">escala inferida (no está en la foto)</text>`)

  // Elementos.
  const body: string[] = []
  spec.elementos.forEach((e, i) => {
    const ci = i % PALETTE.length
    const col = PALETTE[ci]
    const label = (x: number, y: number, text?: string, dx = 6, dy = -6) =>
      text ? `<text x="${X(x) + dx}" y="${Y(y) + dy}" fill="${col}" font-size="15" font-style="italic">${richText(text)}</text>` : ''
    switch (e.t) {
      case 'recta': {
        let p: P, q: P
        if (e.puntos) [p, q] = e.puntos
        else if (e.a !== undefined && e.b !== undefined && e.c !== undefined) {
          if (e.b === 0) [p, q] = [[e.c / e.a, 0], [e.c / e.a, 1]]
          else [p, q] = [[0, e.c / e.b], [1, (e.c - e.a) / e.b]]
        } else if (e.m !== undefined) [p, q] = [[0, e.b ?? 0], [1, e.m + (e.b ?? 0)]]
        else if (e.x !== undefined) [p, q] = [[e.x, 0], [e.x, 1]]
        else [p, q] = [[0, e.y!], [1, e.y!]]
        const dx = q[0] - p[0]
        const dy = q[1] - p[1]
        const k = 1000 / Math.hypot(dx, dy)
        body.push(`<line x1="${X(p[0] - dx * k)}" y1="${Y(p[1] - dy * k)}" x2="${X(p[0] + dx * k)}" y2="${Y(p[1] + dy * k)}" stroke="${col}" stroke-width="2.4" clip-path="url(#v)"/>`)
        if (e.etiqueta) {
          // Se rotula en la parte visible de la recta (a ~85 % de su recorrido dentro del recuadro).
          if (dx === 0) {
            if (p[0] >= x0 && p[0] <= x1) body.push(label(p[0], y1 - (y1 - y0) * 0.1, e.etiqueta, 6, 0))
          } else {
            const sl = dy / dx
            let lo = x0
            let hi = x1
            if (sl !== 0) {
              const ra = p[0] + (y0 - p[1]) / sl
              const rb = p[0] + (y1 - p[1]) / sl
              lo = Math.max(lo, Math.min(ra, rb))
              hi = Math.min(hi, Math.max(ra, rb))
            }
            if (lo < hi) {
              const lxv = lo + (hi - lo) * 0.85
              body.push(label(lxv, p[1] + sl * (lxv - p[0]), e.etiqueta, 6, sl >= 0 ? 14 : -8))
            }
          }
        }
        break
      }
      case 'segmento':
        body.push(`<line x1="${X(e.puntos[0][0])}" y1="${Y(e.puntos[0][1])}" x2="${X(e.puntos[1][0])}" y2="${Y(e.puntos[1][1])}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`)
        body.push(label((e.puntos[0][0] + e.puntos[1][0]) / 2, (e.puntos[0][1] + e.puntos[1][1]) / 2, e.etiqueta))
        break
      case 'vector': {
        const o = e.de ?? [0, 0]
        body.push(`<line x1="${X(o[0])}" y1="${Y(o[1])}" x2="${X(e.a[0])}" y2="${Y(e.a[1])}" stroke="${col}" stroke-width="2.6" marker-end="url(#m${ci})"/>`)
        body.push(label(e.a[0], e.a[1], e.etiqueta, 8, -8))
        break
      }
      case 'punto':
        body.push(`<circle cx="${X(e.en[0])}" cy="${Y(e.en[1])}" r="4.2" fill="${col}"/>`)
        body.push(label(e.en[0], e.en[1], e.etiqueta, 7, -7))
        break
      case 'funcion': {
        const f = compileExpr(e.expr)
        const [a, b] = e.dominio ?? [x0, x1]
        const lim = (y1 - y0) * 4
        let d = ''
        let pen = false
        const vis: P[] = []
        for (let n = 0; n <= 480; n++) {
          const xv = a + ((b - a) * n) / 480
          const yv = f(xv)
          if (!Number.isFinite(yv) || Math.abs(yv) > lim + Math.abs(y0 + y1)) pen = false
          else {
            d += `${pen ? 'L' : 'M'}${X(xv)} ${Y(yv)} `
            pen = true
            if (xv >= x0 && xv <= x1 && yv >= y0 && yv <= y1) vis.push([xv, yv])
          }
        }
        body.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" clip-path="url(#v)"/>`)
        if (e.etiqueta && vis.length) {
          const pt = vis[Math.floor((vis.length - 1) * 0.85)]
          body.push(label(pt[0], pt[1], e.etiqueta, 6, -8))
        }
        break
      }
      case 'poligono':
        body.push(`<path d="M${e.puntos.map((p) => `${X(p[0])} ${Y(p[1])}`).join(' L')} Z" fill="${e.relleno ? col : 'none'}" fill-opacity="0.18" stroke="${col}" stroke-width="2.2"/>`)
        break
      case 'texto':
        body.push(`<text x="${X(e.en[0])}" y="${Y(e.en[1])}" font-size="15">${richText(e.texto)}</text>`)
        break
    }
  })
  out.push(...body, '</svg>')
  return out.join('\n')
}

/** Descripción corta para texto alternativo (accesibilidad) y para el informe. */
export function figureAlt(spec: FigureSpec): string {
  const n: Record<string, number> = {}
  for (const e of spec.elementos) n[e.t] = (n[e.t] ?? 0) + 1
  const parts = Object.entries(n).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`)
  return `Gráfica cartesiana (${parts.join(', ')}); escala ${spec.escala.replace('_', ' ')}.`
}
