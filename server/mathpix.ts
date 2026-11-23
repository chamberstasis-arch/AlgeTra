import { createHash } from 'node:crypto'
import type { MathpixMeta, PageError, RunSettings } from '../src/shared/types'
import { config, mathpixMode } from './config'
import { MOCK_SAMPLES } from './fixtures/samples'

export interface OcrInput {
  image: Buffer
  mime: string
  filename: string
  settings: RunSettings
}

export interface OcrSuccess {
  text: string
  meta: MathpixMeta
  raw: unknown
  latencyMs: number
  mock: boolean
}

export class OcrError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable: boolean,
    public raw?: unknown,
  ) {
    super(message)
  }
  toPageError(): PageError {
    return { code: this.code, message: this.message, retryable: this.retryable }
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  http_unauthorized: 'Mathpix rechazó las credenciales (app_id / app_key).',
  http_max_requests: 'Mathpix limitó las solicitudes (cuota o ritmo). Se reintentará.',
  sys_exception: 'Error temporal en Mathpix.',
  connection_closed: 'Mathpix cerró la conexión antes de terminar.',
  sys_request_too_large: 'La imagen es demasiado grande para Mathpix (límite de 5 MB por petición).',
  image_decode_error: 'Mathpix no pudo decodificar la imagen.',
  image_max_size: 'Las dimensiones de la imagen exceden el máximo de Mathpix.',
  image_no_content: 'Mathpix no detectó contenido legible en la imagen.',
  math_confidence: 'Mathpix no tuvo confianza suficiente en la fórmula.',
  math_syntax: 'Mathpix produjo una fórmula con sintaxis inválida.',
}

/** Errores que Mathpix documenta como transitorios: se reintentan con backoff. */
const RETRYABLE = new Set(['http_max_requests', 'sys_exception', 'connection_closed'])

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function buildOptions(settings: RunSettings) {
  return {
    formats: ['text'],
    math_inline_delimiters: ['$', '$'],
    math_display_delimiters: ['$$', '$$'],
    rm_spaces: true,
    // Sistemas y casos salen como aligned/cases en lugar de array: se ven mejor en Word.
    idiomatic_eqn_arrays: true,
    enable_document_layout: settings.documentLayout,
    include_line_data: true,
    include_page_info: false,
    // Privacidad: no guardar imagen ni resultado en Mathpix (ver docs/artefactos/14, §8).
    metadata: { improve_mathpix: false },
  }
}

interface MathpixResponse {
  request_id?: string
  text?: string
  confidence?: number
  confidence_rate?: number
  is_handwritten?: boolean
  is_printed?: boolean
  image_width?: number
  image_height?: number
  auto_rotate_degrees?: number
  version?: string
  error?: string
  error_info?: { id?: string; message?: string }
}

async function callMathpix(input: OcrInput): Promise<OcrSuccess> {
  const started = Date.now()
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(input.image)], { type: input.mime }), input.filename)
  form.append('options_json', JSON.stringify(buildOptions(input.settings)))

  let res: Response
  try {
    res = await fetch(`${config.mathpix.baseUrl}/v3/text`, {
      method: 'POST',
      headers: { app_id: config.mathpix.appId, app_key: config.mathpix.appKey },
      body: form,
      signal: AbortSignal.timeout(config.mathpix.timeoutMs),
    })
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'TimeoutError'
    throw new OcrError(
      timeout ? 'provider_timeout' : 'network_error',
      timeout ? 'Mathpix no respondió a tiempo.' : 'No se pudo conectar con Mathpix.',
      true,
    )
  }

  let body: MathpixResponse
  try {
    body = (await res.json()) as MathpixResponse
  } catch {
    throw new OcrError('bad_response', `Respuesta inválida de Mathpix (HTTP ${res.status}).`, res.status >= 500)
  }

  const errId = body.error_info?.id
  if (res.status === 429 || errId === 'http_max_requests') throw new OcrError('http_max_requests', ERROR_MESSAGES.http_max_requests, true, body)
  if (res.status === 401 || errId === 'http_unauthorized') throw new OcrError('http_unauthorized', ERROR_MESSAGES.http_unauthorized, false, body)
  if (res.status >= 500) throw new OcrError('provider_error', `Mathpix respondió HTTP ${res.status}.`, true, body)
  if (body.error || errId) {
    const id = errId ?? 'provider_error'
    throw new OcrError(id, ERROR_MESSAGES[id] ?? body.error ?? body.error_info?.message ?? 'Error de Mathpix.', RETRYABLE.has(id), body)
  }
  if (typeof body.text !== 'string') throw new OcrError('incomplete_response', 'Mathpix respondió sin texto.', false, body)

  return {
    text: body.text,
    raw: body,
    latencyMs: Date.now() - started,
    mock: false,
    meta: {
      requestId: body.request_id,
      version: body.version,
      confidence: body.confidence,
      confidenceRate: body.confidence_rate,
      isHandwritten: body.is_handwritten,
      isPrinted: body.is_printed,
      imageWidth: body.image_width,
      imageHeight: body.image_height,
      autoRotateDegrees: body.auto_rotate_degrees,
    },
  }
}

async function callMock(input: OcrInput): Promise<OcrSuccess> {
  const started = Date.now()
  await sleep(500 + Math.random() * 800)
  const idx = createHash('sha1').update(input.image).digest()[0] % MOCK_SAMPLES.length
  const text = MOCK_SAMPLES[idx]
  return {
    text,
    raw: { mock: true, note: 'Salida simulada; no proviene de Mathpix.' },
    latencyMs: Date.now() - started,
    mock: true,
    meta: { requestId: `mock-${idx}`, version: 'mock', confidence: 0.9, confidenceRate: 0.9, isHandwritten: true },
  }
}

/** Una llamada de OCR con reintentos con backoff exponencial para errores transitorios. */
export async function ocrImage(input: OcrInput, onAttempt?: (n: number) => void): Promise<OcrSuccess> {
  const mode = mathpixMode()
  if (mode === 'missing-credentials')
    throw new OcrError('missing_credentials', 'Faltan MATHPIX_APP_ID / MATHPIX_APP_KEY en el servidor (.env).', false)
  if (input.image.length > config.mathpixMaxBytes)
    throw new OcrError('image_too_large', ERROR_MESSAGES.sys_request_too_large, false)

  const call = mode === 'mock' ? callMock : callMathpix
  let lastErr: OcrError | undefined
  for (let attempt = 1; attempt <= config.mathpix.maxAttempts; attempt++) {
    onAttempt?.(attempt)
    try {
      return await call(input)
    } catch (err) {
      if (!(err instanceof OcrError)) throw err
      lastErr = err
      if (!err.retryable || attempt === config.mathpix.maxAttempts) break
      await sleep(1000 * 3 ** (attempt - 1) + Math.random() * 400)
    }
  }
  throw lastErr!
}
