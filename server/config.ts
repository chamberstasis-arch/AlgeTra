import { resolve } from 'node:path'

try {
  process.loadEnvFile?.('.env')
} catch {
  // .env es opcional: las variables también pueden venir del entorno (Docker, CI).
}

const bool = (v: string | undefined) => ['1', 'true', 'yes'].includes((v ?? '').toLowerCase())
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d)

export const config = {
  port: num(process.env.PORT, 3001),
  host: process.env.HOST ?? '0.0.0.0',
  dataDir: resolve(process.env.DATA_DIR ?? './data'),
  mathpix: {
    appId: process.env.MATHPIX_APP_ID?.trim() ?? '',
    appKey: process.env.MATHPIX_APP_KEY?.trim() ?? '',
    mock: bool(process.env.MATHPIX_MOCK),
    baseUrl: process.env.MATHPIX_BASE_URL ?? 'https://api.mathpix.com',
    timeoutMs: num(process.env.MATHPIX_TIMEOUT_MS, 60_000),
    concurrency: Math.max(1, Math.min(10, num(process.env.MATHPIX_CONCURRENCY, 3))),
    maxAttempts: Math.max(1, num(process.env.MATHPIX_MAX_ATTEMPTS, 3)),
    costPerImageUsd: num(process.env.MATHPIX_COST_PER_IMAGE_USD, 0.002),
  },
  maxUploadBytes: 12 * 1024 * 1024,
  /** Mathpix limita el cuerpo completo de la petición a 5 MB. */
  mathpixMaxBytes: 4.8 * 1024 * 1024,
}

export type MathpixMode = 'ready' | 'mock' | 'missing-credentials'

export function mathpixMode(): MathpixMode {
  if (config.mathpix.mock) return 'mock'
  return config.mathpix.appId && config.mathpix.appKey ? 'ready' : 'missing-credentials'
}
