// Estilo de presentación de un documento. Es independiente del CONTENIDO: lo que el agente transcribió
// no cambia nunca; solo cambia cómo se ve al exportar. Por eso se puede reaplicar sin volver a procesar.
//
// Todo valor se normaliza (se recorta a límites sensatos y se rechazan tipografías raras): un estilo
// mal escrito a mano nunca produce un documento roto.

/** Tipografías admitidas. Las seis primeras son las que usa la variación automática; el resto se admiten (p. ej. al copiar un ejemplo). */
export const FUENTES = ['Calibri', 'Cambria', 'Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Aptos', 'Garamond', 'Tahoma', 'Trebuchet MS', 'Palatino Linotype', 'Book Antiqua', 'Gill Sans MT'] as const
export const FUENTES_VARIAR = FUENTES.slice(0, 6)

export const PALETAS: Record<string, { nombre: string; colores: string[] }> = {
  clasica: { nombre: 'Clásica', colores: ['#1f4e9c', '#c0392b', '#1e8449', '#8e44ad', '#b9770e', '#117a8b'] },
  sobria: { nombre: 'Sobria', colores: ['#1b1b1b', '#1f4e9c', '#555555', '#7b241c', '#2c3e50', '#7f8c8d'] },
  viva: { nombre: 'Viva', colores: ['#e74c3c', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085'] },
  tierra: { nombre: 'Tierra', colores: ['#8b4513', '#556b2f', '#b8860b', '#704214', '#2f4f4f', '#a0522d'] },
  mono: { nombre: 'Escala de grises', colores: ['#000000', '#444444', '#222222', '#666666', '#333333', '#555555'] },
}

export type Cuadricula = 'ninguna' | 'suave' | 'completa'

export interface EstiloGrafica {
  /** Ancho de la gráfica como % del ancho de texto de la página. */
  ancho: number
  paleta: string
  /** Grosor base de las líneas de la gráfica. */
  grosor: number
  cuadricula: Cuadricula
  /** Tamaño de las etiquetas de la gráfica. */
  etiquetas: number
}

export interface Estilo {
  /** Preset de origen, `variado` o `personalizado`. */
  nombre: string
  /** Semilla con la que se generó una variación (para poder reproducirla). */
  semilla?: string
  fuente: string
  /** Tipografía de los títulos de actividad; sin ella, la del texto. */
  fuenteTitulos?: string
  /** Puntos; admite medios puntos. */
  tamano: number
  /** Tamaño del título de actividad (negritas); sin él, proporcional al del texto. */
  tamanoTitulos?: number
  interlineado: number
  margenCm: number
  papel: 'A4' | 'Carta'
  alinear: 'izquierda' | 'justificado'
  ecuaciones: 'centradas' | 'izquierda'
  /** Aire entre renglones e incisos: `compacto`, `normal` o `amplio`. */
  espaciado: 'compacto' | 'normal' | 'amplio'
  /** Cada actividad empieza en hoja nueva. */
  saltoActividad: boolean
  /** `entrega` imprime el nombre interno de la entrega como título; `ninguno` entrega el documento limpio. */
  titulo: 'ninguno' | 'entrega'
  colorTitulos: string
  /** Número de página al pie. */
  numeracion: boolean
  grafica: EstiloGrafica
}

export const LIMITES = {
  tamano: [10, 14],
  tamanoTitulos: [12, 20],
  interlineado: [1, 2],
  margenCm: [1.5, 3.5],
  ancho: [30, 100],
  grosor: [1.5, 4],
  etiquetas: [11, 20],
} as const

export const DEFAULT_GRAFICA: EstiloGrafica = { ancho: 65, paleta: 'clasica', grosor: 2.4, cuadricula: 'suave', etiquetas: 15 }

const BASE: Estilo = {
  nombre: 'limpio',
  fuente: 'Calibri',
  tamano: 12,
  interlineado: 1.2,
  margenCm: 2,
  papel: 'A4',
  alinear: 'izquierda',
  ecuaciones: 'izquierda',
  espaciado: 'normal',
  saltoActividad: false,
  titulo: 'ninguno',
  colorTitulos: '1F3864',
  numeracion: false,
  grafica: DEFAULT_GRAFICA,
}

export const PRESETS: Record<string, Estilo> = {
  limpio: BASE,
  cuaderno: {
    ...BASE, nombre: 'cuaderno', fuente: 'Verdana', tamano: 11, interlineado: 1.5, margenCm: 2.5, colorTitulos: '2C3E50',
    grafica: { ancho: 70, paleta: 'viva', grosor: 2.6, cuadricula: 'completa', etiquetas: 15 },
  },
  formal: {
    ...BASE, nombre: 'formal', fuente: 'Times New Roman', tamano: 12, interlineado: 1.5, margenCm: 3, alinear: 'justificado', ecuaciones: 'centradas', espaciado: 'amplio', colorTitulos: '000000', numeracion: true,
    grafica: { ancho: 60, paleta: 'sobria', grosor: 2, cuadricula: 'suave', etiquetas: 14 },
  },
  // Formato pedido por un cliente: títulos de actividad en Gill Sans MT 15 negritas, texto en Times New Roman 12,
  // sin colores (títulos negros, gráficas en grises), papel Carta y cada actividad en hoja nueva.
  uv: {
    ...BASE, nombre: 'uv', papel: 'Carta', fuente: 'Times New Roman', tamano: 12, fuenteTitulos: 'Gill Sans MT', tamanoTitulos: 15, colorTitulos: '000000', saltoActividad: true,
    grafica: { ancho: 65, paleta: 'mono', grosor: 2.2, cuadricula: 'suave', etiquetas: 14 },
  },
  compacto: {
    ...BASE, nombre: 'compacto', fuente: 'Arial', tamano: 11, interlineado: 1.1, margenCm: 1.5, espaciado: 'compacto', colorTitulos: '1F3864',
    grafica: { ancho: 55, paleta: 'clasica', grosor: 2.2, cuadricula: 'suave', etiquetas: 14 },
  },
}

const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number, paso = 0.1) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.round(Math.min(hi, Math.max(lo, n)) / paso) * paso
}
const round2 = (n: number) => Math.round(n * 100) / 100
const pick = <T extends string>(v: unknown, ok: readonly T[], fallback: T): T => (ok.includes(v as T) ? (v as T) : fallback)
const hex = (v: unknown, fallback: string) => (typeof v === 'string' && /^#?[0-9a-fA-F]{6}$/.test(v) ? v.replace('#', '').toUpperCase() : fallback)

/** Convierte cualquier cosa en un estilo válido: lo desconocido toma el valor del preset `limpio`. */
export function normalizarEstilo(raw: unknown): Estilo {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const g = (r.grafica && typeof r.grafica === 'object' ? r.grafica : {}) as Record<string, unknown>
  return {
    nombre: typeof r.nombre === 'string' && r.nombre.trim() ? r.nombre.trim().slice(0, 40) : BASE.nombre,
    ...(typeof r.semilla === 'string' ? { semilla: r.semilla.slice(0, 120) } : {}),
    fuente: pick(r.fuente, FUENTES, BASE.fuente as (typeof FUENTES)[number]),
    ...(FUENTES.includes(r.fuenteTitulos as (typeof FUENTES)[number]) ? { fuenteTitulos: r.fuenteTitulos as string } : {}),
    ...(r.tamanoTitulos === undefined || r.tamanoTitulos === '' || r.tamanoTitulos === null ? {} : { tamanoTitulos: round2(clamp(r.tamanoTitulos, LIMITES.tamanoTitulos, 15, 0.5)) }),
    tamano: round2(clamp(r.tamano, LIMITES.tamano, BASE.tamano, 0.5)),
    interlineado: round2(clamp(r.interlineado, LIMITES.interlineado, BASE.interlineado, 0.05)),
    margenCm: round2(clamp(r.margenCm, LIMITES.margenCm, BASE.margenCm, 0.1)),
    papel: pick(r.papel, ['A4', 'Carta'] as const, BASE.papel),
    alinear: pick(r.alinear, ['izquierda', 'justificado'] as const, BASE.alinear),
    ecuaciones: pick(r.ecuaciones, ['centradas', 'izquierda'] as const, BASE.ecuaciones),
    espaciado: pick(r.espaciado, ['compacto', 'normal', 'amplio'] as const, BASE.espaciado),
    saltoActividad: typeof r.saltoActividad === 'boolean' ? r.saltoActividad : BASE.saltoActividad,
    titulo: pick(r.titulo, ['ninguno', 'entrega'] as const, BASE.titulo),
    colorTitulos: hex(r.colorTitulos, BASE.colorTitulos),
    numeracion: typeof r.numeracion === 'boolean' ? r.numeracion : BASE.numeracion,
    grafica: {
      ancho: round2(clamp(g.ancho, LIMITES.ancho, DEFAULT_GRAFICA.ancho, 1)),
      paleta: typeof g.paleta === 'string' && g.paleta in PALETAS ? g.paleta : DEFAULT_GRAFICA.paleta,
      grosor: round2(clamp(g.grosor, LIMITES.grosor, DEFAULT_GRAFICA.grosor, 0.1)),
      cuadricula: pick(g.cuadricula, ['ninguna', 'suave', 'completa'] as const, DEFAULT_GRAFICA.cuadricula),
      etiquetas: round2(clamp(g.etiquetas, LIMITES.etiquetas, DEFAULT_GRAFICA.etiquetas, 1)),
    },
  }
}

// ───────── Variación determinista ─────────

function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COLORES_TITULO = ['1F3864', '2C3E50', '7B241C', '1E5631', '4A235A', '000000']

/**
 * Un estilo derivado de la semilla: la misma semilla da siempre el mismo estilo, y semillas distintas dan estilos
 * distintos. Solo elige entre combinaciones legibles; nunca produce un documento extraño.
 */
export function variarEstilo(semilla: string): Estilo {
  const rnd = mulberry32(hash32(semilla))
  const de = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]
  const paletas = Object.keys(PALETAS)
  return normalizarEstilo({
    nombre: 'variado',
    semilla,
    fuente: de(FUENTES_VARIAR),
    tamano: de([11, 11.5, 12]),
    interlineado: de([1.15, 1.25, 1.35, 1.5]),
    margenCm: de([2, 2.2, 2.5, 2.8, 3]),
    papel: 'A4',
    alinear: rnd() < 0.4 ? 'justificado' : 'izquierda',
    ecuaciones: rnd() < 0.7 ? 'izquierda' : 'centradas',
    espaciado: de(['compacto', 'normal', 'normal', 'amplio'] as const),
    saltoActividad: false,
    titulo: 'ninguno',
    colorTitulos: de(COLORES_TITULO),
    numeracion: rnd() < 0.5,
    grafica: {
      ancho: de([55, 60, 65, 70, 75]),
      paleta: de(paletas),
      grosor: de([2, 2.4, 2.8]),
      cuadricula: de(['suave', 'suave', 'completa', 'ninguna'] as const),
      etiquetas: de([14, 15, 16]),
    },
  })
}
