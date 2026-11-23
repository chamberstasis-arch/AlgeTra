// Envía una carpeta de capturas a la API local y crea una "prueba" visible en la interfaz.
// Requiere el servidor en marcha (pnpm dev:all). Uso:
//   pnpm probar pruebas/capturas [--max 5] [--sin-layout] [--nombre "Lote 1"] [--yes]
import { execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'

const API = process.env.API_URL ?? 'http://localhost:3001'
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(`--${n}`)
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}
const dir = args.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--max', '--nombre'].includes(args[i - 1])))
if (!dir) {
  console.error('Uso: pnpm probar <carpeta> [--max N] [--sin-layout] [--nombre "texto"] [--yes]')
  process.exit(2)
}

const cfg = (await fetch(`${API}/api/config`).then((r) => r.json()).catch(() => null)) as {
  mathpix: string
  costPerImageUsd: number
} | null
if (!cfg) {
  console.error(`No hay servidor en ${API}. Arráncalo con: pnpm dev:all`)
  process.exit(1)
}

let files = (await readdir(dir)).filter((f) => MIME[extname(f).toLowerCase()]).sort()
const max = opt('max') ? Number(opt('max')) : undefined
if (max) files = files.slice(0, max)
if (!files.length) {
  console.error(`No hay imágenes (jpg/png/webp) en ${dir}.`)
  process.exit(1)
}

const bytes = (await Promise.all(files.map((f) => stat(join(dir, f))))).reduce((n, s) => n + s.size, 0)
const cost = files.length * cfg.costPerImageUsd
console.log(`Modo de Mathpix: ${cfg.mathpix}${cfg.mathpix === 'mock' ? '  (SIMULADO: no cuesta nada, no es real)' : ''}`)
console.log(`${files.length} imagen(es), ${(bytes / 1048576).toFixed(1)} MB → costo estimado ≈ US$ ${cost.toFixed(3)} (+ reintentos si los hay)`)
if (cfg.mathpix === 'missing-credentials') {
  console.error('Faltan credenciales en .env. Ejecuta primero: pnpm mathpix:check')
  process.exit(1)
}
if (!flag('yes') && cfg.mathpix === 'ready') {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const a = (await rl.question('¿Enviar a Mathpix? [s/N] ')).trim().toLowerCase()
  rl.close()
  if (a !== 's' && a !== 'y') process.exit(0)
}

const name = opt('nombre') ?? `${basename(dir)} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
const run = (await fetch(`${API}/api/runs`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name, documentLayout: !flag('sin-layout') }),
}).then((r) => r.json())) as { id: string }

// Mathpix limita la petición a 5 MB: las fotos grandes se reducen con ImageMagick (como hace la interfaz en el navegador).
const LIMIT = 3.5 * 1024 * 1024
const tmp = await mkdtemp(join(tmpdir(), 'algetra-'))
async function prepare(f: string): Promise<{ data: Buffer; mime: string } | null> {
  const src = join(dir!, f)
  if ((await stat(src)).size <= LIMIT) return { data: await readFile(src), mime: MIME[extname(f).toLowerCase()] }
  const out = join(tmp, `${basename(f, extname(f))}.jpg`)
  try {
    execFileSync('magick', [src, '-auto-orient', '-resize', '3000x3000>', '-quality', '85', out], { stdio: 'ignore' })
    const data = await readFile(out)
    console.log(`  ${f}: reducida a ${(data.length / 1048576).toFixed(1)} MB`)
    return data.length <= LIMIT * 1.3 ? { data, mime: 'image/jpeg' } : null
  } catch {
    console.warn(`  ${f}: pesa más de 3.5 MB y no se pudo reducir (instala ImageMagick o redúcela a mano). Se omite.`)
    return null
  }
}

// En tandas de 3 para no superar límites de tamaño de la petición.
for (let i = 0; i < files.length; i += 3) {
  const form = new FormData()
  for (const f of files.slice(i, i + 3)) {
    const img = await prepare(f)
    if (img) form.append('files', new Blob([new Uint8Array(img.data)], { type: img.mime }), f)
  }
  const res = await fetch(`${API}/api/runs/${run.id}/pages`, { method: 'POST', body: form })
  const body = (await res.json().catch(() => ({}))) as { rejected?: { filename: string; reason: string }[]; message?: string }
  if (!res.ok) console.warn(`  Error HTTP ${res.status} al subir: ${body.message ?? ''}`)
  body.rejected?.forEach((r) => console.warn('  Rechazada:', r.filename, '-', r.reason))
}

type P = { filename: string; status: string; latencyMs?: number; error?: { code: string; message: string }; meta?: { confidence?: number } }
let pages: P[] = []
const total = ((await fetch(`${API}/api/runs/${run.id}`).then((r) => r.json())) as { pages: P[] }).pages.length
if (!total) {
  console.error('No se subió ninguna imagen.')
  process.exit(1)
}
for (;;) {
  pages = ((await fetch(`${API}/api/runs/${run.id}`).then((r) => r.json())) as { pages: P[] }).pages
  process.stdout.write(`\r${pages.filter((p) => p.status === 'done' || p.status === 'error').length}/${pages.length} procesadas `)
  if (pages.every((p) => p.status === 'done' || p.status === 'error')) break
  await new Promise((r) => setTimeout(r, 1500))
}
console.log('\n')
for (const p of pages)
  console.log(
    p.status === 'done'
      ? `✔ ${p.filename}  ${((p.latencyMs ?? 0) / 1000).toFixed(1)} s  confianza ${p.meta?.confidence?.toFixed(2) ?? '—'}`
      : `✘ ${p.filename}  [${p.error?.code}] ${p.error?.message}`,
  )
console.log(`\nPrueba "${name}" (${run.id}). Ábrela en la interfaz para revisar, o descarga:`)
console.log(`  informe: ${API}/api/runs/${run.id}/report.md`)
