import { Resvg } from '@resvg/resvg-js'
import type { EstiloGrafica } from '../src/shared/estilo'
import { figureAlt, figureSvg, parseFigure } from '../src/shared/figure'

export interface FigurePng {
  png: Buffer
  /** Tamaño lógico en píxeles (el PNG tiene el doble de resolución). */
  width: number
  height: number
  alt: string
}

export type FigureResult = ({ ok: true } & FigurePng) | { ok: false; error: string }

/** JSON de la gráfica → PNG. Los errores se devuelven, no se lanzan: una gráfica mala no tumba el documento. */
export function renderFigure(source: string, estilo?: EstiloGrafica): FigureResult {
  const p = parseFigure(source)
  if (!p.ok) return p
  try {
    const svg = figureSvg(p.spec, estilo)
    const w = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 520)
    const h = Number(/height="(\d+)"/.exec(svg)?.[1] ?? 520)
    const png = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' }, fitTo: { mode: 'width', value: w * 2 } }).render().asPng()
    return { ok: true, png: Buffer.from(png), width: w, height: h, alt: figureAlt(p.spec) }
  } catch (e) {
    return { ok: false, error: `No se pudo dibujar: ${e instanceof Error ? e.message : e}` }
  }
}
