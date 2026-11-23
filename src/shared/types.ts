// Tipos compartidos entre el backend (server/) y la interfaz (src/).

export type PageStatus = 'queued' | 'processing' | 'done' | 'error'

export type PageRating = 'perfect' | 'minor' | 'major' | 'unusable'

/** Categorías de error pensadas para álgebra lineal; sirven para medir dónde falla el OCR. */
export const ERROR_TAGS = [
  'matriz',
  'vector',
  'letra-griega',
  'subindice-superindice',
  'signo',
  'fraccion',
  'operador',
  'texto',
  'omision',
  'orden-lectura',
] as const
export type ErrorTag = (typeof ERROR_TAGS)[number]

export const ERROR_TAG_LABELS: Record<ErrorTag, string> = {
  matriz: 'Matriz',
  vector: 'Vector',
  'letra-griega': 'Letra griega (φ, Φ, λ…)',
  'subindice-superindice': 'Subíndice / superíndice',
  signo: 'Signo (+, −, =, ≤…)',
  fraccion: 'Fracción / raíz',
  operador: 'Operador (det, ker, dim…)',
  texto: 'Texto en español',
  omision: 'Contenido omitido',
  'orden-lectura': 'Orden de lectura',
}

export interface PageError {
  code: string
  message: string
  retryable: boolean
}

export interface MathpixMeta {
  requestId?: string
  version?: string
  confidence?: number
  confidenceRate?: number
  isHandwritten?: boolean
  isPrinted?: boolean
  imageWidth?: number
  imageHeight?: number
  autoRotateDegrees?: number
}

export interface PageReview {
  /** `true` cuando una persona ya validó la página (con o sin cambios). */
  reviewed: boolean
  /** Texto corregido (la referencia contra la que se mide la exactitud). */
  editedText?: string
  rating?: PageRating
  tags: ErrorTag[]
  notes: string
  reviewedAt?: string
}

export interface Page {
  id: string
  order: number
  filename: string
  mime: string
  bytes: number
  createdAt: string
  status: PageStatus
  attempts: number
  error?: PageError
  /** Salida original del OCR en Mathpix Markdown. Nunca se sobrescribe. */
  text?: string
  latencyMs?: number
  processedAt?: string
  meta?: MathpixMeta
  /** `true` si la transcripción proviene del modo simulado y no de Mathpix. */
  mock?: boolean
  review: PageReview
}

export interface RunSettings {
  /** Activa `enable_document_layout` de Mathpix (recomendado para páginas completas). */
  documentLayout: boolean
}

export interface Run {
  id: string
  name: string
  createdAt: string
  settings: RunSettings
  pages: Page[]
}

export interface RunSummary {
  id: string
  name: string
  createdAt: string
  pageCount: number
  doneCount: number
  errorCount: number
  reviewedCount: number
}

export interface AppConfig {
  mathpix: 'ready' | 'mock' | 'missing-credentials'
  concurrency: number
  costPerImageUsd: number
}

export interface EquationStats {
  total: number
  exact: number
  substituted: number
  inserted: number
  deleted: number
}

export interface PageMetrics {
  /** Tasa de error de caracteres del texto sin fórmulas (0–1). */
  textCer: number
  /** Tasa de error de palabras del texto sin fórmulas (0–1). */
  textWer: number
  /** Tasa de error de tokens LaTeX sobre todas las fórmulas (0–1). */
  mathTokenErrorRate: number
  equations: EquationStats
  /** `true` si el texto corregido es idéntico al original. */
  unchanged: boolean
}

export interface PageReportRow {
  order: number
  filename: string
  status: string
  reviewed: boolean
  rating?: PageRating
  tags: ErrorTag[]
  notes: string
  confidence?: number
  latencyMs?: number
  mock?: boolean
  metrics?: PageMetrics
}

export interface RunReport {
  generatedAt: string
  run: { id: string; name: string; createdAt: string; documentLayout: boolean }
  totals: { pages: number; transcribed: number; failed: number; reviewed: number }
  /** Solo sobre páginas revisadas por una persona. */
  accuracy: {
    pagesUnchanged: number
    pagesUnchangedRate: number | null
    meanTextCer: number | null
    meanTextWer: number | null
    meanMathTokenErrorRate: number | null
    equations: { total: number; exact: number; substituted: number; inserted: number; deleted: number; exactRate: number | null }
  }
  ratings: Record<PageRating, number>
  tags: { tag: ErrorTag; label: string; pages: number }[]
  performance: { meanLatencyMs: number | null; p95LatencyMs: number | null; meanConfidence: number | null }
  cost: { mathpixCalls: number; estimatedUsd: number; note: string }
  mock: boolean
  pages: PageReportRow[]
}

