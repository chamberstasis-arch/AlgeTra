// Espacio de trabajo del agente: carpetas, entrada de archivos, calidad de imagen, ensamblado y PDF.
// Lo comparten la línea de comandos del agente (scripts/harness.ts) y la interfaz (server/ui.ts).
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { loadCorpus } from './corpus'
import { buildDocx } from './docx'
import { orderSegments, parseMarkers, safeId, splitSegments, type Segment } from './harness'

const run = promisify(execFile)

export const ROOT = resolve(process.env.HARNESS_DIR ?? './trabajo')
export const D = {
  por_procesar: join(ROOT, 'por_procesar'),
  en_proceso: join(ROOT, 'en_proceso'),
  procesadas: join(ROOT, 'procesadas'),
  revision: join(ROOT, 'revision'),
  entregas: join(ROOT, 'entregas'),
}
export type Estado = 'por_procesar' | 'en_proceso' | 'procesadas' | 'revision'
export const ESTADOS: Estado[] = ['por_procesar', 'en_proceso', 'procesadas', 'revision']
export const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
export const natural = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true })

export async function ensureDirs() {
  for (const d of Object.values(D)) await mkdir(d, { recursive: true })
}
export const ls = async (dir: string) => (existsSync(dir) ? (await readdir(dir)).filter((f) => !f.startsWith('.')) : [])
const isDir = async (p: string) => (await stat(p).catch(() => null))?.isDirectory() ?? false

// ───────── Calidad de la imagen ─────────

export interface Calidad {
  ancho: number
  alto: number
  /** Varianza del laplaciano relativa al contraste: menor = más borrosa. */
  nitidez: number
  brillo: number
  contraste: number
  banderas: string[]
  nivel: 'ok' | 'atencion' | 'mala'
}

const mem = new Map<string, Calidad>()

/** Heurística calibrada con imágenes sintéticas; hay que reajustar umbrales con fotos reales. */
export async function analyzeImage(path: string): Promise<Calidad | null> {
  const st = await stat(path).catch(() => null)
  if (!st) return null
  const key = `${path}:${st.mtimeMs}`
  if (mem.has(key)) return mem.get(key)!
  try {
    const base = [path, '-auto-orient', '-resize', '1400x1400>', '-colorspace', 'Gray']
    const [lap, stat1] = await Promise.all([
      run('magick', [...base, '-morphology', 'Convolve', 'Laplacian:0', '-format', '%[fx:standard_deviation]', 'info:']),
      run('magick', [...base, '-format', '%[fx:mean] %[fx:standard_deviation]', 'info:']),
    ])
    const dims = await run('magick', ['identify', '-format', '%w %h', `${path}[0]`])
    const [brillo, contraste] = stat1.stdout.trim().split(' ').map(Number)
    const [ancho, alto] = dims.stdout.trim().split(' ').map(Number)
    const nitidez = contraste > 0 ? Number(lap.stdout) / contraste : 0
    const banderas: string[] = []
    if (nitidez < 1.0) banderas.push('borrosa')
    else if (nitidez < 2.5) banderas.push('algo_borrosa')
    if (brillo < 0.35) banderas.push('oscura')
    if (contraste < 0.03) banderas.push('bajo_contraste')
    if (Math.min(ancho, alto) < 1000) banderas.push('baja_resolucion')
    const nivel = banderas.some((b) => ['borrosa', 'oscura', 'bajo_contraste', 'baja_resolucion'].includes(b)) ? 'mala' : banderas.length ? 'atencion' : 'ok'
    const c = { ancho, alto, nitidez: +nitidez.toFixed(2), brillo: +brillo.toFixed(2), contraste: +contraste.toFixed(3), banderas, nivel } satisfies Calidad
    mem.set(key, c)
    return c
  } catch {
    return null
  }
}

/** Copia con orientación corregida, contraste estirado y enfoque suave: una segunda vista para el agente. */
export async function enhanceImage(src: string, dest: string): Promise<boolean> {
  try {
    await run('magick', [src, '-auto-orient', '-resize', '3000x3000>', '-contrast-stretch', '0.5%x0.5%', '-unsharp', '0x1.4+1.2+0.02', '-quality', '88', dest])
    return true
  } catch {
    return false
  }
}

export const GUIA_CALIDAD: Record<string, string> = {
  borrosa: 'Imagen BORROSA: lo ilegible va como [?]. No adivines dígitos ni signos.',
  algo_borrosa: 'Imagen algo borrosa: reexamina dígitos parecidos (1/7, 4/9, 5/6, 0/6) y signos.',
  oscura: 'Imagen oscura: usa la copia mejorada y desconfía de trazos tenues.',
  bajo_contraste: 'Bajo contraste: usa la copia mejorada.',
  baja_resolucion: 'Baja resolución: los subíndices y exponentes pueden ser ilegibles; marca [?].',
}

// ───────── Entrada de archivos (todo termina siendo imagen) ─────────

let sofficeLock: Promise<unknown> = Promise.resolve()
async function docToPdf(src: string, outDir: string): Promise<string> {
  const job = sofficeLock.then(async () => {
    const profile = join(tmpdir(), 'algetra-lo-profile')
    await run('soffice', [`-env:UserInstallation=file://${profile}`, '--headless', '--convert-to', 'pdf', '--outdir', outDir, src], { timeout: 120_000 })
  })
  sofficeLock = job.catch(() => {})
  await job
  return join(outDir, src.split('/').pop()!.replace(/\.[^.]+$/, '.pdf'))
}

export interface IngestResult {
  guardadas: string[]
  avisos: string[]
}

export async function ingest(filename: string, data: Buffer, entrega: string): Promise<IngestResult> {
  await ensureDirs()
  const eName = entrega ? safeId(entrega) : ''
  const dir = eName ? join(D.por_procesar, eName) : D.por_procesar
  await mkdir(dir, { recursive: true })
  const ext = extname(filename).toLowerCase()
  const stem = safeId(filename)
  const unique = (name: string) => {
    let n = name
    for (let i = 2; existsSync(join(dir, n)); i++) n = name.replace(/(\.[^.]+)$/, `-${i}$1`)
    return n
  }
  const res: IngestResult = { guardadas: [], avisos: [] }
  const tmp = await mkdtemp(join(tmpdir(), 'algetra-in-'))
  try {
    if (IMG_EXT.has(ext)) {
      const name = unique(`${stem}${ext}`)
      await writeFile(join(dir, name), data)
      res.guardadas.push(name)
    } else if (['.heic', '.heif'].includes(ext)) {
      const src = join(tmp, `in${ext}`)
      await writeFile(src, data)
      const name = unique(`${stem}.jpg`)
      await run('magick', [src, '-auto-orient', '-quality', '92', join(dir, name)])
      res.guardadas.push(name)
    } else if (ext === '.pdf' || ['.docx', '.doc', '.odt', '.rtf'].includes(ext)) {
      let pdf = join(tmp, 'in.pdf')
      if (ext === '.pdf') await writeFile(pdf, data)
      else {
        const src = join(tmp, `in${ext}`)
        await writeFile(src, data)
        pdf = await docToPdf(src, tmp)
        res.avisos.push(`${filename}: documento convertido a imágenes; las ecuaciones de Word se leerán como imagen, no como texto.`)
      }
      await run('pdftoppm', ['-r', '170', '-jpeg', '-jpegopt', 'quality=90', '-l', '60', pdf, join(tmp, 'p')], { timeout: 180_000 })
      const pages = (await readdir(tmp)).filter((f) => /^p-\d+\.jpg$/.test(f)).sort(natural)
      if (!pages.length) res.avisos.push(`${filename}: no se pudo convertir a imágenes.`)
      for (const [i, f] of pages.entries()) {
        const name = unique(`${stem}-p${String(i + 1).padStart(2, '0')}.jpg`)
        await rename(join(tmp, f), join(dir, name))
        res.guardadas.push(name)
      }
    } else res.avisos.push(`${filename}: formato no admitido (usa imágenes, PDF o DOCX).`)
  } catch (e) {
    res.avisos.push(`${filename}: falló la conversión (${e instanceof Error ? e.message.split('\n')[0] : e}).`)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
  for (const n of res.guardadas) {
    const q = await analyzeImage(join(dir, n))
    if (q?.nivel === 'mala') res.avisos.push(`${n}: calidad baja (${q.banderas.join(', ')}). Conviene volver a fotografiarla.`)
  }
  return res
}

// ───────── Hojas ─────────

export interface Hoja {
  id: string
  estado: Estado
  entrega: string
  archivo: string
  dir?: string
  imagen: string
  orden?: number
  calidad?: Calidad | null
  informe?: Record<string, unknown> | null
}

const firstImage = async (dir: string) => (await ls(dir)).find((f) => /^imagen\.(jpe?g|png|webp)$/i.test(f))

/** Lista todas las hojas de todas las carpetas. */
export async function listHojas(): Promise<Hoja[]> {
  await ensureDirs()
  const out: Hoja[] = []
  // por_procesar: archivos sueltos o dentro de una carpeta por entrega.
  const scan = async (entrega: string, dir: string) => {
    for (const f of (await ls(dir)).filter((x) => IMG_EXT.has(extname(x).toLowerCase())).sort(natural)) {
      const imagen = join(dir, f)
      out.push({ id: entrega ? `${entrega}/${f}` : f, estado: 'por_procesar', entrega, archivo: f, imagen, calidad: await analyzeImage(imagen) })
    }
  }
  await scan('', D.por_procesar)
  for (const e of (await ls(D.por_procesar)).sort(natural)) if (await isDir(join(D.por_procesar, e))) await scan(e, join(D.por_procesar, e))
  for (const estado of ['en_proceso', 'procesadas', 'revision'] as const)
    for (const id of (await ls(D[estado])).sort(natural)) {
      const dir = join(D[estado], id)
      if (!(await isDir(dir))) continue
      const meta = await readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse).catch(() => ({}))
      const informe = await readFile(join(dir, 'informe.json'), 'utf8').then(JSON.parse).catch(() => null)
      const img = await firstImage(dir)
      out.push({
        id, estado, dir, entrega: meta.entrega ?? '', archivo: meta.archivoOriginal ?? id, orden: meta.orden, informe,
        imagen: img ? join(dir, img) : '',
        calidad: meta.calidad ?? (img ? await analyzeImage(join(dir, img)) : null),
      })
    }
  return out
}

// ───────── Ensamblado ─────────

export interface Ensamblado {
  entrega: string
  hojas: number
  orden: { ej: string; inciso: string; hoja: number }[]
  faltantes: string[]
  pendientes: { por_procesar: number; en_proceso: number }
  formulas: number
  fallos: { latex: string; error: string }[]
  requierenRevision: string[]
  creadoEn: string
}

/** Une las hojas cerradas de una entrega en un solo documento, ordenado por actividad, ejercicio e inciso. */
export async function ensamblar(entrega: string, opts: { ordenOriginal?: boolean } = {}): Promise<Ensamblado> {
  const todas = await listHojas()
  const mias = todas.filter((h) => h.entrega === entrega)
  const cerradas = mias.filter((h) => h.estado === 'procesadas' || h.estado === 'revision').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || natural(a.id, b.id))
  if (!cerradas.length) throw new Error(`La entrega "${entrega}" no tiene hojas cerradas todavía.`)

  const segs: Segment[] = []
  const requierenRevision: string[] = []
  for (const [i, h] of cerradas.entries()) {
    const src = await readFile(join(h.dir!, 'transcripcion.md'), 'utf8')
    segs.push(...splitSegments(src, i + 1))
    const inf = h.informe as { requierenRevision?: string[]; aprobada?: boolean } | null
    if (h.estado === 'revision' && !inf?.aprobada) requierenRevision.push(`${h.id}: ${(inf?.requierenRevision ?? []).join('; ') || 'pendiente de revisión'}`)
  }
  const ordered = orderSegments(segs, opts.ordenOriginal)
  const body = ordered.map((s) => s.text.trim()).join('\n\n')

  // Ejercicios de la base que no aparecen en la entrega (para detectar hojas faltantes).
  const acts = new Set(ordered.filter((s) => s.marked && s.act).map((s) => s.act))
  const vistos = new Set(ordered.filter((s) => s.marked).map((s) => `${s.act}/${s.ej}`))
  const faltantes: string[] = []
  for (const a of (await loadCorpus()).filter((a) => acts.has(a.id)))
    for (const e of a.exercises) if (!vistos.has(e.ref)) faltantes.push(e.ref)

  const docx = await buildDocx({ title: entrega, subtitle: `Transcripción ensamblada · ${cerradas.length} hoja(s) · ${new Date().toLocaleDateString('es')}`, pages: [{ title: entrega, text: body }], pageHeaders: false })
  const out = join(D.entregas, safeId(entrega))
  await mkdir(out, { recursive: true })
  await writeFile(join(out, 'documento.docx'), docx.buffer)
  await writeFile(join(out, 'ensamblado.md'), body + '\n')
  await rm(join(out, 'documento.pdf'), { force: true })
  const result: Ensamblado = {
    entrega,
    hojas: cerradas.length,
    orden: ordered.map((s) => ({ ej: s.act ? `${s.act}/${s.ej}` : '(sin asignar)', inciso: s.inciso, hoja: s.page })),
    faltantes,
    pendientes: { por_procesar: mias.filter((h) => h.estado === 'por_procesar').length, en_proceso: mias.filter((h) => h.estado === 'en_proceso').length },
    formulas: docx.formulas,
    fallos: docx.failed.map((f) => ({ latex: f.latex, error: f.error })),
    requierenRevision,
    creadoEn: new Date().toISOString(),
  }
  await writeFile(join(out, 'ensamblado.json'), JSON.stringify(result, null, 2))
  return result
}

// ───────── PDF para visualizar el DOCX ─────────

/** Convierte un .docx a PDF (con caché por fecha). LibreOffice dibuja las ecuaciones de forma parecida, no idéntica, a Word. */
export async function docxToPdf(docx: string): Promise<string> {
  const pdf = docx.replace(/\.docx$/i, '.pdf')
  const a = await stat(docx)
  const b = await stat(pdf).catch(() => null)
  if (b && b.mtimeMs >= a.mtimeMs) return pdf
  const tmp = await mkdtemp(join(tmpdir(), 'algetra-pdf-'))
  try {
    const out = await docToPdf(docx, tmp)
    await writeFile(pdf, await readFile(out))
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
  return pdf
}

export async function toolsAvailable() {
  const has = async (c: string) => run('which', [c]).then(() => true, () => false)
  return { magick: await has('magick'), pdftoppm: await has('pdftoppm'), soffice: await has('soffice') }
}
