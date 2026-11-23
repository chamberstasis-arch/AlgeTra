// Verifica las credenciales de Mathpix con UNA petición real (~US$ 0.002) sobre una imagen mínima.
// Uso: pnpm mathpix:check
import { readFile } from 'node:fs/promises'
import { OcrError, ocrImage } from '../server/mathpix'
import { config, mathpixMode } from '../server/config'

const mode = mathpixMode()
const mask = (s: string) => (s.length > 6 ? `${s.slice(0, 3)}…${s.slice(-2)}` : '***')

console.log('Modo:', mode)
if (mode === 'missing-credentials') {
  console.error('Faltan MATHPIX_APP_ID y/o MATHPIX_APP_KEY. Copia .env.example a .env y complétalos (ver README, "Configurar Mathpix").')
  process.exit(2)
}
if (mode === 'mock') {
  console.error('MATHPIX_MOCK está activo: no se llamará a Mathpix. Ponlo en 0 en .env.')
  process.exit(2)
}
console.log(`app_id: ${mask(config.mathpix.appId)} (la app_key no se muestra)`)

const HINTS: Record<string, string> = {
  http_unauthorized:
    'Credenciales rechazadas. Revisa que copiaste app_id y app_key completos, sin comillas ni espacios, y que la clave esté ACTIVA en console.mathpix.com (las claves solo funcionan cuando la organización tiene facturación configurada).',
  http_max_requests: 'Límite de ritmo o cuota. Espera un minuto; si persiste, revisa la pestaña Requests/Usage de la consola.',
  network_error: 'No hay conexión con api.mathpix.com desde esta máquina.',
}

try {
  const image = await readFile(new URL('../server/fixtures/check.png', import.meta.url))
  const r = await ocrImage({ image, mime: 'image/png', filename: 'check.png', settings: { documentLayout: false } })
  console.log('OK ✔  Mathpix respondió en', r.latencyMs, 'ms')
  console.log('Texto reconocido:', JSON.stringify(r.text))
  console.log('Confianza:', r.meta.confidence ?? '—', '· versión:', r.meta.version ?? '—', '· request_id:', r.meta.requestId ?? '—')
  console.log('Esperado: algo como  $2 x+3=7, \\quad x=2$')
  console.log('Costo aproximado de esta comprobación: US$', config.mathpix.costPerImageUsd)
} catch (e) {
  if (e instanceof OcrError) {
    console.error(`FALLÓ ✘  [${e.code}] ${e.message}`)
    if (HINTS[e.code]) console.error('→', HINTS[e.code])
    if (e.raw) console.error('Respuesta de Mathpix:', JSON.stringify(e.raw))
  } else console.error('FALLÓ ✘', e)
  process.exit(1)
}
