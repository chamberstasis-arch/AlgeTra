// Gráficas cartesianas 2D y figuras en R3 descritas con JSON → SVG. Pensado para dibujar lo que el
// alumno dibujó: el agente describe elementos (rectas, vectores, puntos, funciones, planos) y este
// módulo los traza. R3 se proyecta en estilo isométrico (papel de triangulitos) o caballera.
// Sin dependencias: sirve en el servidor (PNG con resvg) y en el navegador (vista previa).
import { compileExpr } from './expr'
import { DEFAULT_GRAFICA, PALETAS, type EstiloGrafica } from './estilo'

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

export interface FigureSpec2D {
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

type P3 = [number, number, number]
export type Proyeccion = 'isometrica' | 'caballera'

export type Elemento3D =
  | { t: 'recta'; puntos: [P3, P3]; punteado?: boolean; etiqueta?: string }
  | { t: 'segmento'; puntos: [P3, P3]; punteado?: boolean; etiqueta?: string }
  | { t: 'vector'; de?: P3; a: P3; punteado?: boolean; etiqueta?: string }
  | { t: 'punto'; en: P3; etiqueta?: string }
  | { t: 'poligono'; puntos: P3[]; relleno?: boolean; etiqueta?: string }
  | { t: 'plano'; a: number; b: number; c: number; d?: number; etiqueta?: string }
  | { t: 'texto'; en: P3; texto: string }

export interface FigureSpec3D {
  tipo: 'r3'
  escala: Escala
  /** `isometrica` (por defecto): ejes a 120°, rejilla triangular tipo papel isométrico. `caballera`: x en diagonal a 45° con escala ½, como se dibuja a mano. */
  proyeccion?: Proyeccion
  x?: [number, number]
  y?: [number, number]
  z?: [number, number]
  /** El papel de la libreta era cuadriculado (rejilla isométrica o de rincón según la proyección). */
  cuadricula?: boolean
  etiquetas_ejes?: [string, string, string]
  elementos: Elemento3D[]
}

export type FigureSpec = FigureSpec2D | FigureSpec3D

export type ParseResult = { ok: true; spec: FigureSpec } | { ok: false; error: string }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isP = (v: unknown): v is P => Array.isArray(v) && v.length === 2 && v.every(isNum)
const isP3 = (v: unknown): v is P3 => Array.isArray(v) && v.length === 3 && v.every(isNum)
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
  if (s.tipo === 'r3') return parse3D(s)
  if (s.tipo !== 'cartesiana') return { ok: false, error: 'Solo se admite "tipo": "cartesiana" o "r3".' }
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

function parse3D(s: Record<string, unknown>): ParseResult {
  if (!['leida', 'inferida', 'sin_valores'].includes(s.escala as string))
    return { ok: false, error: '"escala" debe ser "leida", "inferida" o "sin_valores".' }
  if (s.proyeccion !== undefined && s.proyeccion !== 'isometrica' && s.proyeccion !== 'caballera')
    return { ok: false, error: '"proyeccion" debe ser "isometrica" o "caballera".' }
  for (const k of ['x', 'y', 'z'] as const)
    if (s[k] !== undefined && !isRange(s[k])) return { ok: false, error: `"${k}" debe ser [mín, máx] con mín < máx.` }
  if (s.etiquetas_ejes !== undefined && !(Array.isArray(s.etiquetas_ejes) && s.etiquetas_ejes.length === 3 && s.etiquetas_ejes.every((v) => typeof v === 'string')))
    return { ok: false, error: '"etiquetas_ejes" debe ser una lista de 3 textos, p. ej. ["x","y","z"].' }
  if (!Array.isArray(s.elementos) || !s.elementos.length) return { ok: false, error: '"elementos" debe ser una lista no vacía.' }
  if (s.elementos.length > 60) return { ok: false, error: 'Demasiados elementos (máximo 60).' }

  for (const [i, e] of (s.elementos as Record<string, unknown>[]).entries()) {
    const w = `Elemento ${i + 1} (${String(e?.t)})`
    switch (e?.t) {
      case 'recta':
        if (!(Array.isArray(e.puntos) && e.puntos.length === 2 && e.puntos.every(isP3) && JSON.stringify(e.puntos[0]) !== JSON.stringify(e.puntos[1])))
          return { ok: false, error: `${w}: "puntos" debe ser [[x,y,z],[x,y,z]] con dos puntos distintos.` }
        break
      case 'segmento':
        if (!(Array.isArray(e.puntos) && e.puntos.length === 2 && e.puntos.every(isP3))) return { ok: false, error: `${w}: "puntos" debe ser [[x,y,z],[x,y,z]].` }
        break
      case 'vector':
        if (!isP3(e.a) || (e.de !== undefined && !isP3(e.de))) return { ok: false, error: `${w}: usa "de": [x,y,z] (opcional, por defecto el origen) y "a": [x,y,z].` }
        break
      case 'punto':
        if (!isP3(e.en)) return { ok: false, error: `${w}: "en" debe ser [x,y,z].` }
        break
      case 'poligono':
        if (!(Array.isArray(e.puntos) && e.puntos.length >= 3 && e.puntos.every(isP3))) return { ok: false, error: `${w}: "puntos" necesita al menos 3 puntos [x,y,z].` }
        break
      case 'plano':
        if (!isNum(e.a) || !isNum(e.b) || !isNum(e.c) || (e.d !== undefined && !isNum(e.d)) || (e.a === 0 && e.b === 0 && e.c === 0))
          return { ok: false, error: `${w}: define el plano ax+by+cz=d con "a","b","c" (no los tres cero) y "d" (opcional, 0 por defecto).` }
        break
      case 'texto':
        if (!isP3(e.en) || typeof e.texto !== 'string') return { ok: false, error: `${w}: usa "en": [x,y,z] y "texto".` }
        break
      default:
        return { ok: false, error: `${w}: tipo desconocido (usa recta, segmento, vector, punto, poligono, plano o texto).` }
    }
  }
  return { ok: true, spec: s as unknown as FigureSpec }
}

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

export function figureSvg(spec: FigureSpec, g: EstiloGrafica = DEFAULT_GRAFICA): string {
  return spec.tipo === 'r3' ? svg3D(spec, g) : svg2D(spec, g)
}

function svg2D(spec: FigureSpec2D, g: EstiloGrafica): string {
  const PALETTE = (PALETAS[g.paleta] ?? PALETAS.clasica).colores
  const SW = g.grosor // grosor base; los demás trazos se derivan de él
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
      `<marker id="ax" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#222"/></marker>` +
      PALETTE.map((c, i) => `<marker id="m${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`).join('') +
      '</defs>',
  )
  out.push(`<rect width="${W}" height="${H}" fill="#fff"/>`)

  if (g.cuadricula !== 'ninguna' && spec.cuadricula !== false && (spec.cuadricula || spec.escala !== 'sin_valores')) {
    let lines = ''
    for (let v = Math.ceil(x0 / stepX) * stepX; v <= x1 + 1e-9; v += stepX) lines += `<line x1="${X(v)}" y1="${M - 4}" x2="${X(v)}" y2="${H - M + 4}"/>`
    for (let v = Math.ceil(y0 / stepY) * stepY; v <= y1 + 1e-9; v += stepY) lines += `<line x1="${M - 4}" y1="${Y(v)}" x2="${W - M + 4}" y2="${Y(v)}"/>`
    out.push(g.cuadricula === 'completa' ? `<g stroke="#aab3c2" stroke-width="1.2">${lines}</g>` : `<g stroke="#d9dee7" stroke-width="1">${lines}</g>`)
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
      text ? `<text x="${X(x) + dx}" y="${Y(y) + dy}" fill="${col}" font-size="${g.etiquetas}" font-style="italic">${richText(text)}</text>` : ''
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
        body.push(`<line x1="${X(p[0] - dx * k)}" y1="${Y(p[1] - dy * k)}" x2="${X(p[0] + dx * k)}" y2="${Y(p[1] + dy * k)}" stroke="${col}" stroke-width="${SW}" clip-path="url(#v)"/>`)
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
        body.push(`<line x1="${X(e.puntos[0][0])}" y1="${Y(e.puntos[0][1])}" x2="${X(e.puntos[1][0])}" y2="${Y(e.puntos[1][1])}" stroke="${col}" stroke-width="${SW}" stroke-linecap="round"/>`)
        body.push(label((e.puntos[0][0] + e.puntos[1][0]) / 2, (e.puntos[0][1] + e.puntos[1][1]) / 2, e.etiqueta))
        break
      case 'vector': {
        const o = e.de ?? [0, 0]
        body.push(`<line x1="${X(o[0])}" y1="${Y(o[1])}" x2="${X(e.a[0])}" y2="${Y(e.a[1])}" stroke="${col}" stroke-width="${+(SW + 0.2).toFixed(2)}" marker-end="url(#m${ci})"/>`)
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
        body.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${SW}" clip-path="url(#v)"/>`)
        if (e.etiqueta && vis.length) {
          const pt = vis[Math.floor((vis.length - 1) * 0.85)]
          body.push(label(pt[0], pt[1], e.etiqueta, 6, -8))
        }
        break
      }
      case 'poligono':
        body.push(`<path d="M${e.puntos.map((p) => `${X(p[0])} ${Y(p[1])}`).join(' L')} Z" fill="${e.relleno ? col : 'none'}" fill-opacity="0.18" stroke="${col}" stroke-width="${+(SW - 0.2).toFixed(2)}"/>`)
        break
      case 'texto':
        body.push(`<text x="${X(e.en[0])}" y="${Y(e.en[1])}" font-size="${g.etiquetas}">${richText(e.texto)}</text>`)
        break
    }
  })
  out.push(...body, '</svg>')
  return out.join('\n')
}

// ───────── R3: proyección isométrica (papel de triangulitos) o caballera ─────────

const add3 = (a: P3, b: P3): P3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub3 = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul3 = (a: P3, k: number): P3 => [a[0] * k, a[1] * k, a[2] * k]
const dot3 = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross3 = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm3 = (a: P3) => Math.hypot(a[0], a[1], a[2])

function pointsOf3(e: Elemento3D): P3[] {
  switch (e.t) {
    case 'recta':
    case 'segmento':
    case 'poligono':
      return [...e.puntos]
    case 'vector':
      return [e.de ?? [0, 0, 0], e.a]
    case 'punto':
    case 'texto':
      return [e.en]
    default:
      return []
  }
}

/** Intersección del plano n·p = d con la caja visible: polígono convexo de 3 a 6 lados, ordenado alrededor de su centro. */
function planeInBox(n: P3, d: number, corners: P3[]): P3[] {
  const verts: P3[] = []
  const seen = new Set<string>()
  for (let i = 0; i < corners.length; i++)
    for (let j = i + 1; j < corners.length; j++) {
      const a = corners[i], b = corners[j]
      if (a.filter((v, c) => v !== b[c]).length !== 1) continue // solo aristas de la caja
      const den = dot3(n, sub3(b, a))
      if (Math.abs(den) < 1e-12) continue
      const t = (d - dot3(n, a)) / den
      if (t < -1e-9 || t > 1 + 1e-9) continue
      const p = add3(a, mul3(sub3(b, a), Math.min(1, Math.max(0, t))))
      const key = p.map((v) => v.toFixed(6)).join(',')
      if (!seen.has(key)) {
        seen.add(key)
        verts.push(p)
      }
    }
  if (verts.length < 3) return []
  const c = mul3(verts.reduce(add3, [0, 0, 0] as P3), 1 / verts.length)
  const nn = mul3(n, 1 / norm3(n))
  const h: P3 = Math.abs(nn[0]) <= Math.abs(nn[1]) && Math.abs(nn[0]) <= Math.abs(nn[2]) ? [1, 0, 0] : Math.abs(nn[1]) <= Math.abs(nn[2]) ? [0, 1, 0] : [0, 0, 1]
  const u = mul3(cross3(nn, h), 1 / norm3(cross3(nn, h)))
  const v = cross3(nn, u)
  const ang = (p: P3) => Math.atan2(dot3(sub3(p, c), v), dot3(sub3(p, c), u))
  return verts.sort((a, b) => ang(a) - ang(b))
}

function svg3D(spec: FigureSpec3D, g: EstiloGrafica): string {
  const PALETTE = (PALETAS[g.paleta] ?? PALETAS.clasica).colores
  const SW = g.grosor
  const iso = (spec.proyeccion ?? 'isometrica') === 'isometrica'
  // Direcciones de los ejes en pantalla (y hacia abajo): z arriba, y a la derecha, x hacia el frente-izquierda.
  // Isométrica: los tres a 120° con la misma unidad. Caballera: x en diagonal a 45° con unidad ½.
  const C30 = Math.cos(Math.PI / 6)
  const U: P[] = iso ? [[-C30, 0.5], [C30, 0.5], [0, -1]] : [[-Math.SQRT1_2 / 2, Math.SQRT1_2 / 2], [1, 0], [0, -1]]
  const E: P3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  const proj = (p: P3): P => [p[0] * U[0][0] + p[1] * U[1][0] + p[2] * U[2][0], p[0] * U[0][1] + p[1] * U[1][1] + p[2] * U[2][1]]
  // Profundidad: mayor = más cerca del observador. Se pinta de lejos a cerca (algoritmo del pintor).
  const depth = (p: P3) => (iso ? p[0] + p[1] + p[2] : p[0] + (Math.SQRT1_2 / 2) * (p[1] + p[2]))

  // Rango visible por eje: el indicado, o el que abarca lo dibujado (siempre incluyendo el origen), con margen.
  const pts = spec.elementos.flatMap(pointsOf3)
  const ext = spec.elementos.some((e) => e.t === 'recta' || e.t === 'plano')
  const ranges = ([spec.x, spec.y, spec.z] as ([number, number] | undefined)[]).map((r, i) => {
    if (r) return r
    const vs = [0, ...pts.map((p) => p[i])]
    const pad = Math.max(1, (Math.max(...vs) - Math.min(...vs)) * 0.25)
    return [Math.min(...vs, ext ? -4 : 0) - pad, Math.max(...vs, ext ? 4 : 0) + pad] as [number, number]
  })
  const [[x0, x1], [y0, y1], [z0, z1]] = ranges

  // Escala uniforme en los tres ejes: la caja proyectada se ajusta al lienzo con márgenes.
  const corners: P3[] = []
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) corners.push([x, y, z])
  const pr = corners.map(proj)
  const bx0 = Math.min(...pr.map((p) => p[0])), bx1 = Math.max(...pr.map((p) => p[0]))
  const by0 = Math.min(...pr.map((p) => p[1])), by1 = Math.max(...pr.map((p) => p[1]))
  const W = 520
  const M = 34
  const H = Math.round(W * Math.min(1.1, Math.max(0.62, (by1 - by0) / (bx1 - bx0))))
  const k = Math.min((W - 2 * M) / (bx1 - bx0), (H - 2 * M) / (by1 - by0))
  const ox = M + ((W - 2 * M) - (bx1 - bx0) * k) / 2 - bx0 * k
  const oy = M + ((H - 2 * M) - (by1 - by0) * k) / 2 - by0 * k
  const X = (p: P3) => +(ox + proj(p)[0] * k).toFixed(2)
  const Y = (p: P3) => +(oy + proj(p)[1] * k).toFixed(2)

  const out: string[] = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="14">`)
  out.push(
    `<defs><clipPath id="v"><rect x="${M - 4}" y="${M - 4}" width="${W - 2 * M + 8}" height="${H - 2 * M + 8}"/></clipPath>` +
      `<marker id="ax" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#222"/></marker>` +
      PALETTE.map((c, i) => `<marker id="m${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`).join('') +
      '</defs>',
  )
  out.push(`<rect width="${W}" height="${H}" fill="#fff"/>`)

  // Rejilla: papel isométrico (tres familias de líneas a 60°, triangulitos) o rincón cuadriculado en caballera.
  if (g.cuadricula !== 'ninguna' && spec.cuadricula !== false && (spec.cuadricula || spec.escala !== 'sin_valores')) {
    let lines = ''
    if (iso) {
      const s = niceStep(Math.max(x1 - x0, y1 - y0, z1 - z0))
      const h = s * Math.sin(Math.PI / 3) * k // distancia entre líneas paralelas de la misma familia
      const O: P = [X([0, 0, 0]), Y([0, 0, 0])]
      const cs: P[] = [[M - 4, M - 4], [W - M + 4, M - 4], [M - 4, H - M + 4], [W - M + 4, H - M + 4]]
      const L = W + H
      for (const u of U) {
        const n: P = [-u[1], u[0]]
        const ds = cs.map((c) => (c[0] - O[0]) * n[0] + (c[1] - O[1]) * n[1])
        for (let m = Math.ceil(Math.min(...ds) / h); m <= Math.floor(Math.max(...ds) / h); m++) {
          const bx = O[0] + n[0] * m * h, by = O[1] + n[1] * m * h
          lines += `<line x1="${(bx - u[0] * L).toFixed(2)}" y1="${(by - u[1] * L).toFixed(2)}" x2="${(bx + u[0] * L).toFixed(2)}" y2="${(by + u[1] * L).toFixed(2)}"/>`
        }
      }
    } else {
      const steps = [niceStep(x1 - x0), niceStep(y1 - y0), niceStep(z1 - z0)]
      const seg = (a: P3, b: P3) => {
        lines += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}"/>`
      }
      // Suelo (z = z0) y las dos paredes del fondo (y = y0, x = x0).
      for (let v = Math.ceil(x0 / steps[0]) * steps[0]; v <= x1 + 1e-9; v += steps[0]) {
        seg([v, y0, z0], [v, y1, z0])
        seg([v, y0, z0], [v, y0, z1])
      }
      for (let v = Math.ceil(y0 / steps[1]) * steps[1]; v <= y1 + 1e-9; v += steps[1]) {
        seg([x0, v, z0], [x1, v, z0])
        seg([x0, v, z0], [x0, v, z1])
      }
      for (let v = Math.ceil(z0 / steps[2]) * steps[2]; v <= z1 + 1e-9; v += steps[2]) {
        seg([x0, y0, v], [x1, y0, v])
        seg([x0, y0, v], [x0, y1, v])
      }
    }
    out.push(g.cuadricula === 'completa' ? `<g stroke="#aab3c2" stroke-width="1.2" clip-path="url(#v)">${lines}</g>` : `<g stroke="#d9dee7" stroke-width="1" clip-path="url(#v)">${lines}</g>`)
  }

  // Ejes con flecha, prolongados un poco más allá de la caja en el extremo positivo.
  const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
  const xc = cl(0, x0, x1), yc = cl(0, y0, y1), zc = cl(0, z0, z1)
  const axes = [
    { a: [x0, yc, zc] as P3, b: [x1, yc, zc] as P3, u: U[0], i: 0 },
    { a: [xc, y0, zc] as P3, b: [xc, y1, zc] as P3, u: U[1], i: 1 },
    { a: [xc, yc, z0] as P3, b: [xc, yc, z1] as P3, u: U[2], i: 2 },
  ]
  const tips = axes.map((ax) => add3(ax.b, mul3(E[ax.i], (ranges[ax.i][1] - ranges[ax.i][0]) * 0.06)))
  out.push(
    `<g stroke="#222" stroke-width="1.6">` +
      axes.map((ax, i) => `<line x1="${X(ax.a)}" y1="${Y(ax.a)}" x2="${X(tips[i])}" y2="${Y(tips[i])}" marker-end="url(#ax)"/>`).join('') +
      '</g>',
  )
  const [lx, ly, lz] = spec.etiquetas_ejes ?? ['x', 'y', 'z']
  ;[lx, ly, lz].forEach((l, i) => {
    out.push(`<text x="${X(tips[i]) + axes[i].u[0] * 14}" y="${Y(tips[i]) + axes[i].u[1] * 14 + 4}" font-style="italic">${richText(l)}</text>`)
  })

  // Marcas y números sobre cada eje (igual que en 2D: sin_valores no rotula, inferida se marca).
  if (spec.escala !== 'sin_valores') {
    const gray = spec.escala === 'inferida'
    let t = ''
    const placed: { x: number; y: number; w: number }[] = []
    for (const ax of axes) {
      const step = niceStep(ranges[ax.i][1] - ranges[ax.i][0])
      const n: P = [-ax.u[1], ax.u[0]]
      const mid: P = [(X(ax.a) + X(ax.b)) / 2, (Y(ax.a) + Y(ax.b)) / 2]
      const sgn = (mid[0] - W / 2) * n[0] + (mid[1] - H / 2) * n[1] >= 0 ? 1 : -1
      for (let v = Math.ceil(ranges[ax.i][0] / step) * step; v <= ranges[ax.i][1] + 1e-9; v += step) {
        if (Math.abs(v) < 1e-9) continue
        const p = [...ax.a] as P3
        p[ax.i] = v
        const px = X(p), py = Y(p)
        t += `<line x1="${px - n[0] * 4}" y1="${py - n[1] * 4}" x2="${px + n[0] * 4}" y2="${py + n[1] * 4}" stroke="#222"/>`
        const lx = px + n[0] * sgn * 16, ly = py + n[1] * sgn * 16 + 4
        const txt = fmt(v)
        const w = txt.length * 7 + 2
        // Cerca del origen los números chocan con los otros ejes o entre sí: ahí se deja solo la marca.
        const crowded =
          axes.some((ot) => ot !== ax && Math.abs((lx - X(ot.a)) * ot.u[1] - (ly - Y(ot.a)) * ot.u[0]) < 13) ||
          placed.some((b) => Math.abs(lx - b.x) < (w + b.w) / 2 && Math.abs(ly - b.y) < 12)
        if (!crowded) {
          placed.push({ x: lx, y: ly, w })
          t += `<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="middle">${txt}</text>`
        }
      }
    }
    out.push(`<g font-size="12" fill="${gray ? '#777' : '#222'}"${gray ? ' font-style="italic"' : ''}>${t}</g>`)
  }
  if (spec.escala === 'inferida') out.push(`<text x="${M}" y="${H - 8}" font-size="11" fill="#999" font-style="italic">escala inferida (no está en la foto)</text>`)

  // Elementos, pintados de lejos a cerca.
  const items: { z: number; s: string }[] = []
  const label = (p: P3, text: string | undefined, col: string, dx = 6, dy = -6) =>
    text ? `<text x="${X(p) + dx}" y="${Y(p) + dy}" fill="${col}" font-size="${g.etiquetas}" font-style="italic">${richText(text)}</text>` : ''
  const dash = (e: { punteado?: boolean }) => (e.punteado ? ` stroke-dasharray="${(SW * 2.2).toFixed(1)} ${(SW * 1.8).toFixed(1)}"` : '')
  spec.elementos.forEach((e, i) => {
    const ci = i % PALETTE.length
    const col = PALETTE[ci]
    switch (e.t) {
      case 'recta': {
        const [p, q] = e.puntos
        const d = sub3(q, p)
        const K = 1000 / norm3(d)
        items.push({
          z: (depth(p) + depth(q)) / 2,
          s: `<line x1="${X(add3(p, mul3(d, -K)))}" y1="${Y(add3(p, mul3(d, -K)))}" x2="${X(add3(p, mul3(d, K)))}" y2="${Y(add3(p, mul3(d, K)))}" stroke="${col}" stroke-width="${SW}"${dash(e)} clip-path="url(#v)"/>`,
        })
        if (e.etiqueta) {
          // Se rotula en la parte visible de la recta (a ~85 % de su recorrido dentro de la caja).
          let lo = -Infinity, hi = Infinity
          for (let c = 0; c < 3; c++) {
            if (Math.abs(d[c]) < 1e-12) {
              if (p[c] < ranges[c][0] || p[c] > ranges[c][1]) { lo = 1; hi = 0; break }
            } else {
              let t1 = (ranges[c][0] - p[c]) / d[c], t2 = (ranges[c][1] - p[c]) / d[c]
              if (t1 > t2) [t1, t2] = [t2, t1]
              lo = Math.max(lo, t1)
              hi = Math.min(hi, t2)
            }
          }
          if (lo < hi) items.push({ z: depth(add3(p, mul3(d, lo + (hi - lo) * 0.85))), s: label(add3(p, mul3(d, lo + (hi - lo) * 0.85)), e.etiqueta, col) })
        }
        break
      }
      case 'segmento': {
        const [p, q] = e.puntos
        items.push({
          z: (depth(p) + depth(q)) / 2,
          s: `<line x1="${X(p)}" y1="${Y(p)}" x2="${X(q)}" y2="${Y(q)}" stroke="${col}" stroke-width="${SW}" stroke-linecap="round"${dash(e)}/>`,
        })
        items.push({ z: depth(mul3(add3(p, q), 0.5)), s: label(mul3(add3(p, q), 0.5), e.etiqueta, col) })
        break
      }
      case 'vector': {
        const o = e.de ?? [0, 0, 0]
        items.push({
          z: (depth(o) + depth(e.a)) / 2,
          s: `<line x1="${X(o)}" y1="${Y(o)}" x2="${X(e.a)}" y2="${Y(e.a)}" stroke="${col}" stroke-width="${+(SW + 0.2).toFixed(2)}"${dash(e)} marker-end="url(#m${ci})"/>`,
        })
        items.push({ z: depth(e.a), s: label(e.a, e.etiqueta, col, 8, -8) })
        break
      }
      case 'punto':
        items.push({ z: depth(e.en), s: `<circle cx="${X(e.en)}" cy="${Y(e.en)}" r="4.2" fill="${col}"/>` })
        items.push({ z: depth(e.en), s: label(e.en, e.etiqueta, col, 7, -7) })
        break
      case 'poligono': {
        const c = mul3(e.puntos.reduce(add3, [0, 0, 0] as P3), 1 / e.puntos.length)
        items.push({
          z: depth(c),
          s: `<path d="M${e.puntos.map((p) => `${X(p)} ${Y(p)}`).join(' L')} Z" fill="${e.relleno ? col : 'none'}" fill-opacity="0.18" stroke="${col}" stroke-width="${+(SW - 0.2).toFixed(2)}"/>`,
        })
        items.push({ z: depth(c), s: label(c, e.etiqueta, col) })
        break
      }
      case 'plano': {
        const verts = planeInBox([e.a, e.b, e.c], e.d ?? 0, corners)
        if (verts.length >= 3) {
          const c = mul3(verts.reduce(add3, [0, 0, 0] as P3), 1 / verts.length)
          items.push({
            z: depth(c),
            s: `<path d="M${verts.map((p) => `${X(p)} ${Y(p)}`).join(' L')} Z" fill="${col}" fill-opacity="0.18" stroke="${col}" stroke-width="${+(SW - 0.2).toFixed(2)}"/>`,
          })
          items.push({ z: depth(c), s: label(c, e.etiqueta, col) })
        }
        break
      }
      case 'texto':
        items.push({ z: depth(e.en), s: `<text x="${X(e.en)}" y="${Y(e.en)}" font-size="${g.etiquetas}">${richText(e.texto)}</text>` })
        break
    }
  })
  items.sort((a, b) => a.z - b.z)
  out.push(...items.map((it) => it.s), '</svg>')
  return out.join('\n')
}

/** Descripción corta para texto alternativo (accesibilidad) y para el informe. */
export function figureAlt(spec: FigureSpec): string {
  const n: Record<string, number> = {}
  for (const e of spec.elementos) n[e.t] = (n[e.t] ?? 0) + 1
  const parts = Object.entries(n).map(([k, v]) => `${v} ${k}${v > 1 ? 's' : ''}`)
  const escala = spec.escala.replace('_', ' ')
  return spec.tipo === 'r3'
    ? `Gráfica en R3, proyección ${spec.proyeccion === 'caballera' ? 'caballera' : 'isométrica'} (${parts.join(', ')}); escala ${escala}.`
    : `Gráfica cartesiana (${parts.join(', ')}); escala ${escala}.`
}
