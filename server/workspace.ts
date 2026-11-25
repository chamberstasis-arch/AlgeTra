// Espacio de trabajo del agente: carpetas, entrada de archivos, calidad de imagen, ensamblado y PDF.
// Lo comparten la línea de comandos del agente (scripts/harness.ts) y la interfaz (server/ui.ts).
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import JSZip from 'jszip'
import { comparePage } from '../src/shared/metrics'
import { normalizarEstilo, PRESETS, type Estilo } from '../src/shared/estilo'
import { runChecks } from './checks'
import { findExercises, loadCorpus } from './corpus'
import { buildDocx, type DocxResult } from './docx'
import { componerCuerpo, lintTranscription, orderSegments, parseMarkers, quitarEncabezado, safeId, splitSegments, type Lint, type Segment } from './harness'

const run = promisify(execFile)

export const ROOT = resolve(process.env.HARNESS_DIR ?? './trabajo')
export const D = {
  por_procesar: join(ROOT, 'por_procesar'),
  en_proceso: join(ROOT, 'en_proceso'),
  procesadas: join(ROOT, 'procesadas'),
  revision: join(ROOT, 'revision'),
  entregas: join(ROOT, 'entregas'),
  archivo: join(ROOT, 'archivo'),
}
export type Estado = 'por_procesar' | 'en_proceso' | 'procesadas' | 'revision'
export const ESTADOS: Estado[] = ['por_procesar', 'en_proceso', 'procesadas', 'revision']
export const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
export const natural = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true })

export async function ensureDirs() {
  for (const d of Object.values(D)) await mkdir(d, { recursive: true })
}
/**
 * Candado entre procesos (varios agentes pueden trabajar a la vez): solo uno a la vez entra a la zona protegida.
 * Un candado abandonado (el proceso murió) se libera solo a los 30 s.
 */
export async function conLock<T>(fn: () => Promise<T>, nombre = 'harness'): Promise<T> {
  const lock = join(ROOT, `.lock-${nombre}`)
  const inicio = Date.now()
  for (;;) {
    try {
      await mkdir(lock)
      break
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      const st = await stat(lock).catch(() => null)
      if (st && Date.now() - st.mtimeMs > 30_000) await rm(lock, { recursive: true, force: true })
      else if (Date.now() - inicio > 90_000) throw new Error('No se pudo obtener el candado del espacio de trabajo (otro proceso lo tiene tomado).')
      else await new Promise((r) => setTimeout(r, 40 + Math.random() * 120))
    }
  }
  try {
    return await fn()
  } finally {
    await rm(lock, { recursive: true, force: true })
  }
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
    // Umbrales ajustados con 62 fotos reales de libreta (nitidez 1.2–3.0, todas legibles a tamaño completo): lo bajo
    // es sobre todo trazo tenue o reflejo, no desenfoque. Con 2.5 casi toda foto salía marcada y el aviso no servía.
    if (nitidez < 0.8) banderas.push('borrosa')
    else if (nitidez < 1.3) banderas.push('algo_borrosa')
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

/**
 * Las fotos de celular suelen guardar los píxeles de lado y una etiqueta EXIF que dice cómo girarlos. Un visor que
 * ignora la etiqueta (como el que lee el agente) ve la hoja acostada. Se aplica el giro a los píxeles y se quita la etiqueta.
 * Devuelve `true` si cambió algo.
 */
export async function normalizarOrientacion(path: string): Promise<boolean> {
  try {
    const { stdout } = await run('magick', ['identify', '-format', '%[orientation]', `${path}[0]`])
    const o = stdout.trim()
    if (!o || o === 'Undefined' || o === 'TopLeft') return false
    await run('magick', [path, '-auto-orient', '-quality', '92', path])
    return true
  } catch {
    return false
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

const reservados = new Set<string>()

/** Límites contra ZIP desmedidos o maliciosos. */
const ZIP_MAX_ARCHIVOS = 400
const ZIP_MAX_BYTES = 1.5 * 1024 ** 3
const BASURA_ZIP = /(^|\/)(__MACOSX|\.[^/]*|thumbs\.db|desktop\.ini)(\/|$)/i

/**
 * Entrada de un ZIP: cada archivo de dentro (imagen, PDF, DOCX…, también en subcarpetas y en el orden natural de su
 * ruta) se procesa como si se hubiera subido suelto, todos a la misma entrega.
 */
async function ingestZip(filename: string, data: Buffer, entrega: string, profundidad: number): Promise<IngestResult> {
  const res: IngestResult = { guardadas: [], avisos: [] }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(data)
  } catch {
    res.avisos.push(`${filename}: no se pudo abrir el ZIP (¿está dañado o tiene contraseña?).`)
    return res
  }
  const entradas = Object.values(zip.files).filter((f) => !f.dir && !BASURA_ZIP.test(f.name)).sort((a, b) => natural(a.name, b.name))
  if (!entradas.length) {
    res.avisos.push(`${filename}: el ZIP no contiene archivos.`)
    return res
  }
  if (entradas.length > ZIP_MAX_ARCHIVOS) {
    res.avisos.push(`${filename}: trae ${entradas.length} archivos; el máximo por ZIP es ${ZIP_MAX_ARCHIVOS}. Pártelo en dos.`)
    return res
  }
  const tam = (f: JSZip.JSZipObject) => ((f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0)
  if (entradas.reduce((n, f) => n + tam(f), 0) > ZIP_MAX_BYTES) {
    res.avisos.push(`${filename}: descomprimido pesaría demasiado (máximo ${(ZIP_MAX_BYTES / 1024 ** 3).toFixed(1)} GB).`)
    return res
  }
  // Se convierten de 3 en 3 (PDF y fotos son trabajo de CPU), pero el resultado queda en el orden de la ruta.
  const resultados: IngestResult[] = new Array(entradas.length)
  let siguiente = 0
  await Promise.all(
    Array.from({ length: Math.min(3, entradas.length) }, async () => {
      while (siguiente < entradas.length) {
        const i = siguiente++
        const f = entradas[i]
        const nombre = f.name.split('/').pop()!
        resultados[i] = await ingestArchivo(nombre, Buffer.from(await f.async('uint8array')), entrega, profundidad + 1).catch((e) => ({
          guardadas: [],
          avisos: [`${nombre}: ${e instanceof Error ? e.message.split('\n')[0] : e}`],
        }))
      }
    }),
  )
  for (const r of resultados) {
    res.guardadas.push(...r.guardadas)
    res.avisos.push(...r.avisos)
  }
  return res
}

export async function ingest(filename: string, data: Buffer, entrega: string): Promise<IngestResult> {
  return ingestArchivo(filename, data, entrega, 0)
}

async function ingestArchivo(filename: string, data: Buffer, entrega: string, profundidad: number): Promise<IngestResult> {
  await ensureDirs()
  if (extname(filename).toLowerCase() === '.zip') {
    if (profundidad >= 2) return { guardadas: [], avisos: [`${filename}: ZIP dentro de ZIP dentro de ZIP; se omite.`] }
    return ingestZip(filename, data, entrega, profundidad)
  }
  const eName = entrega ? safeId(entrega) : ''
  const dir = eName ? join(D.por_procesar, eName) : D.por_procesar
  await mkdir(dir, { recursive: true })
  const ext = extname(filename).toLowerCase()
  const stem = safeId(filename)
  const mios: string[] = []
  const unique = (name: string) => {
    let n = name
    for (let i = 2; existsSync(join(dir, n)) || reservados.has(join(dir, n)); i++) n = name.replace(/(\.[^.]+)$/, `-${i}$1`)
    reservados.add(join(dir, n))
    mios.push(join(dir, n))
    return n
  }
  const res: IngestResult = { guardadas: [], avisos: [] }
  const tmp = await mkdtemp(join(tmpdir(), 'algetra-in-'))
  try {
    if (IMG_EXT.has(ext)) {
      const name = unique(`${stem}${ext}`)
      await writeFile(join(dir, name), data)
      await normalizarOrientacion(join(dir, name))
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
    } else res.avisos.push(`${filename}: formato no admitido (usa imágenes, PDF, DOCX o un ZIP con ellos).`)
  } catch (e) {
    res.avisos.push(`${filename}: falló la conversión (${e instanceof Error ? e.message.split('\n')[0] : e}).`)
  } finally {
    await rm(tmp, { recursive: true, force: true })
    for (const m of mios) reservados.delete(m) // el archivo ya existe en disco, o la conversión falló
  }
  for (const n of res.guardadas) {
    const q = await analyzeImage(join(dir, n))
    if (q?.nivel === 'mala') res.avisos.push(`${n}: calidad baja (${q.banderas.join(', ')}). Conviene volver a fotografiarla.`)
  }
  return res
}

/**
 * Mueve las imágenes sueltas de `por_procesar` (sin entrega) a una entrega. Sin entrega no hay documento final
 * ensamblado, así que esto es lo que permite que unas fotos subidas sin nombre acaben en un solo documento.
 */
export async function agruparSueltas(entrega: string): Promise<{ movidas: number; entrega: string }> {
  if (!entrega.trim()) throw new Error('Escribe un nombre para la entrega.')
  const nombre = safeId(entrega)
  const sueltas = (await ls(D.por_procesar)).filter((f) => IMG_EXT.has(extname(f).toLowerCase()))
  let n = 0
  if (sueltas.length) {
    const dir = join(D.por_procesar, nombre)
    await mkdir(dir, { recursive: true })
    for (const f of sueltas) {
      let destino = f
      for (let i = 2; existsSync(join(dir, destino)); i++) destino = f.replace(/(\.[^.]+)$/, `-${i}$1`)
      await rename(join(D.por_procesar, f), join(dir, destino))
      n++
    }
  }
  // Las hojas ya tomadas o cerradas que quedaron sin entrega se unen a la misma, para que el documento final las incluya.
  for (const estado of ['en_proceso', 'procesadas', 'revision'] as const)
    for (const id of await ls(D[estado])) {
      const dir = join(D[estado], id)
      const meta = await readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse).catch(() => null)
      if (!meta || meta.entrega) continue
      await writeFile(join(dir, 'meta.json'), JSON.stringify({ ...meta, entrega: nombre }, null, 2))
      const inf = await readFile(join(dir, 'informe.json'), 'utf8').then(JSON.parse).catch(() => null)
      if (inf) await writeFile(join(dir, 'informe.json'), JSON.stringify({ ...inf, entrega: nombre }, null, 2))
      n++
    }
  return { movidas: n, entrega: nombre }
}

// ───────── Archivo de entregas ─────────
// Una entrega terminada sale de la cola (el agente ya no la ve) pero no se borra: todo lo suyo queda junto en
// `archivo/<entrega>/` (hojas por estado, documento ensamblado y estilo) y se puede restaurar tal cual.

export interface Archivada {
  id: string
  nombre: string
  hojas: number
  archivadaEn: string
  tieneDocx: boolean
}

const ESTADOS_CERRADOS = ['procesadas', 'revision'] as const

/** Saca la entrega de la cola y guarda todo lo suyo en `archivo/<entrega>/`. No toca nada si hay hojas en proceso. */
export async function archivarEntrega(entrega: string): Promise<{ hojas: number; dir: string }> {
  if (!entrega.trim()) throw new Error('Falta la entrega.')
  return conLock(async () => {
    const mias = (await listHojas()).filter((h) => h.entrega === entrega)
    const ent = join(D.entregas, safeId(entrega))
    if (!mias.length && !existsSync(ent)) throw new Error(`No existe la entrega "${entrega}".`)
    const activas = mias.filter((h) => h.estado === 'en_proceso').length
    if (activas) throw new Error(`Hay ${activas} hoja(s) en proceso por un agente; espera a que las cierre antes de archivar.`)
    const dest = join(D.archivo, safeId(entrega))
    if (existsSync(dest)) throw new Error(`Ya hay una entrega archivada con ese nombre (${dest}). Restáurala o renómbrala antes.`)
    await mkdir(dest, { recursive: true })
    let n = 0
    const pend = join(D.por_procesar, entrega)
    if (existsSync(pend)) {
      await rename(pend, join(dest, 'por_procesar'))
      n += mias.filter((h) => h.estado === 'por_procesar').length
    }
    for (const estado of ESTADOS_CERRADOS)
      for (const h of mias.filter((x) => x.estado === estado)) {
        await mkdir(join(dest, estado), { recursive: true })
        await rename(h.dir!, join(dest, estado, basename(h.dir!)))
        n++
      }
    if (existsSync(ent)) await rename(ent, join(dest, 'entrega'))
    await writeFile(join(dest, 'archivo.json'), JSON.stringify({ entrega, archivadaEn: new Date().toISOString(), hojas: n }, null, 2))
    return { hojas: n, dir: dest }
  })
}

/** Entregas archivadas, de la más reciente a la más antigua. */
export async function listarArchivadas(): Promise<Archivada[]> {
  const out: Archivada[] = []
  for (const id of await ls(D.archivo)) {
    const info = await readFile(join(D.archivo, id, 'archivo.json'), 'utf8').then(JSON.parse).catch(() => null)
    if (info) out.push({ id, nombre: info.entrega, hojas: info.hojas ?? 0, archivadaEn: info.archivadaEn ?? '', tieneDocx: existsSync(join(D.archivo, id, 'entrega', 'documento.docx')) })
  }
  return out.sort((a, b) => b.archivadaEn.localeCompare(a.archivadaEn))
}

/** Devuelve una entrega archivada a la cola, cada cosa a su carpeta. Si ya hay algo con ese nombre, no mueve nada. */
export async function restaurarEntrega(id: string): Promise<{ entrega: string; hojas: number }> {
  if (!id || id.includes('/') || id.includes('..')) throw new Error('Id no válido.')
  return conLock(async () => {
    const src = join(D.archivo, id)
    const info = await readFile(join(src, 'archivo.json'), 'utf8').then(JSON.parse).catch(() => null)
    if (!info) throw new Error('No existe esa entrega archivada.')
    const entrega: string = info.entrega
    const choques: string[] = []
    if (existsSync(join(src, 'por_procesar')) && existsSync(join(D.por_procesar, entrega))) choques.push('hojas por procesar')
    if (existsSync(join(src, 'entrega')) && existsSync(join(D.entregas, safeId(entrega)))) choques.push('documento ensamblado')
    for (const estado of ESTADOS_CERRADOS) for (const h of await ls(join(src, estado))) if (existsSync(join(D[estado], h))) choques.push(`hoja ${h}`)
    if (choques.length) throw new Error(`Ya hay una entrega activa con ese nombre (${choques.join(', ')}). Archívala o renómbrala antes de restaurar.`)
    let n = 0
    if (existsSync(join(src, 'por_procesar'))) {
      n += (await ls(join(src, 'por_procesar'))).length
      await rename(join(src, 'por_procesar'), join(D.por_procesar, entrega))
    }
    for (const estado of ESTADOS_CERRADOS)
      for (const h of await ls(join(src, estado))) {
        await rename(join(src, estado, h), join(D[estado], h))
        n++
      }
    for (const estado of ESTADOS_CERRADOS) await rmdir(join(src, estado)).catch(() => {})
    if (existsSync(join(src, 'entrega'))) await rename(join(src, 'entrega'), join(D.entregas, safeId(entrega)))
    await rm(join(src, 'archivo.json'), { force: true })
    await rmdir(src).catch(() => {}) // si quedó algo ajeno, se deja
    return { entrega, hojas: n }
  })
}

const miniaturas = new Map<string, Buffer>()
/** JPEG pequeño de una imagen, para las vistas en cuadrícula (la foto completa pesa ~1 MB). Se guarda en memoria. */
export async function miniatura(path: string, ancho = 260): Promise<Buffer> {
  const st = await stat(path)
  const key = `${path}:${st.mtimeMs}:${ancho}`
  const hit = miniaturas.get(key)
  if (hit) return hit
  const { stdout } = await run('magick', [path, '-auto-orient', '-resize', `${ancho}x`, '-quality', '70', 'jpg:-'], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 } as never)
  const buf = stdout as unknown as Buffer
  if (miniaturas.size > 400) miniaturas.delete(miniaturas.keys().next().value!)
  miniaturas.set(key, buf)
  return buf
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
  ordenOriginal: boolean
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
    const src = quitarEncabezado(await readFile(join(h.dir!, 'transcripcion.md'), 'utf8'))
    segs.push(...splitSegments(src, i + 1))
    const inf = h.informe as { requierenRevision?: string[]; aprobada?: boolean } | null
    if (h.estado === 'revision' && !inf?.aprobada) requierenRevision.push(`${h.id}: ${(inf?.requierenRevision ?? []).join('; ') || 'pendiente de revisión'}`)
  }
  const ordered = orderSegments(segs, opts.ordenOriginal)
  const sinActividad = [...new Set(ordered.filter((s) => !s.act).map((s) => s.page))]
  if (sinActividad.length)
    requierenRevision.push(`Hoja(s) ${sinActividad.join(', ')} de la entrega sin actividad asignada (falta la marca \`<!-- ejercicio: act-NN/N -->\`): su contenido va al inicio, sin título de actividad.`)
  const body = componerCuerpo(ordered)

  // Ejercicios de la base que no aparecen en la entrega (para detectar hojas faltantes).
  const acts = new Set(ordered.filter((s) => s.marked && s.act).map((s) => s.act))
  const vistos = new Set(ordered.filter((s) => s.marked).map((s) => `${s.act}/${s.ej}`))
  const faltantes: string[] = []
  for (const a of (await loadCorpus()).filter((a) => acts.has(a.id)))
    for (const e of a.exercises) if (!vistos.has(e.ref)) faltantes.push(e.ref)

  const docx = await buildDocx({
    title: entrega,
    pages: [{ title: entrega, text: body }],
    pageHeaders: false,
    estilo: await leerEstilo(entrega),
  })
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
    ordenOriginal: !!opts.ordenOriginal,
    creadoEn: new Date().toISOString(),
  }
  await writeFile(join(out, 'ensamblado.json'), JSON.stringify(result, null, 2))
  return result
}

// ───────── Estilo por entrega ─────────

const dirEntrega = (entrega: string) => join(D.entregas, safeId(entrega))

/** Estilo guardado de la entrega; sin archivo, el preset `limpio`. */
export async function leerEstilo(entrega: string): Promise<Estilo> {
  if (!entrega) return PRESETS.limpio
  const raw = await readFile(join(dirEntrega(entrega), 'estilo.json'), 'utf8').then(JSON.parse).catch(() => null)
  return normalizarEstilo(raw)
}

export async function guardarEstilo(entrega: string, raw: unknown): Promise<Estilo> {
  const estilo = normalizarEstilo(raw)
  await mkdir(dirEntrega(entrega), { recursive: true })
  await writeFile(join(dirEntrega(entrega), 'estilo.json'), JSON.stringify(estilo, null, 2))
  return estilo
}

// ───────── Regenerar documentos (sin volver a procesar nada) ─────────

/** DOCX de una hoja a partir de su transcripción actual y el estilo de su entrega (mismo formato que el ensamblado). */
export async function docxHoja(dir: string, id: string, entrega: string): Promise<DocxResult> {
  const src = quitarEncabezado(await readFile(join(dir, 'transcripcion.md'), 'utf8'))
  const body = componerCuerpo(orderSegments(splitSegments(src, 1), true))
  const docx = await buildDocx({ title: id, pages: [{ title: id, text: body }], pageHeaders: false, estilo: await leerEstilo(entrega) })
  await writeFile(join(dir, 'documento.docx'), docx.buffer)
  await rm(join(dir, 'documento.pdf'), { force: true })
  return docx
}

/** Si ya no queda nada por procesar de la entrega, la ensambla sola: un solo documento con todas las actividades en orden. */
export async function ensamblarSiCompleta(entrega: string): Promise<Ensamblado | null> {
  if (!entrega) return null
  const mias = (await listHojas()).filter((h) => h.entrega === entrega)
  if (mias.some((h) => h.estado === 'por_procesar' || h.estado === 'en_proceso')) return null
  if (!mias.some((h) => h.estado === 'procesadas' || h.estado === 'revision')) return null
  return ensamblar(entrega)
}

/**
 * Rehace los DOCX de todas las hojas cerradas de la entrega y, si ya estaba ensamblada y no quedan hojas abiertas,
 * el documento ensamblado (con el mismo orden que tenía). Es lo que hace que cambiar el estilo o corregir una hoja no cueste procesar de nuevo.
 */
export async function regenerarEntrega(entrega: string): Promise<Ensamblado | null> {
  const todas = (await listHojas()).filter((h) => h.entrega === entrega)
  const hojas = todas.filter((h) => (h.estado === 'procesadas' || h.estado === 'revision') && h.dir)
  for (const h of hojas) await docxHoja(h.dir!, h.id, entrega)
  // Con hojas todavía abiertas (en proceso o por procesar) el documento ensamblado NO se rehace: saldría sin ellas y
  // reemplazaría al completo. Se rehace solo al cerrar la última hoja, o a mano con «Reensamblar».
  if (todas.some((h) => h.estado === 'en_proceso' || h.estado === 'por_procesar')) return null
  const previo = await readFile(join(dirEntrega(entrega), 'ensamblado.json'), 'utf8').then(JSON.parse).catch(() => null)
  return previo ? ensamblar(entrega, { ordenOriginal: !!previo.ordenOriginal }) : null
}

export interface GuardadoHoja {
  lint: Lint
  fallos: { latex: string; error: string }[]
  ensamblado: Ensamblado | null
}

/** Revisa una transcripción (la misma validación que usa el agente) sin bloquear: quien edita es una persona. */
export async function revisarTexto(texto: string): Promise<{ lint: Lint; fallos: { latex: string; error: string }[] }> {
  const m = parseMarkers(texto)
  const exercises = m.refs.length ? await findExercises(m.refs) : []
  const checks = m.body.trim() ? runChecks(m.body, exercises) : null
  const docx = await buildDocx({ title: 'revisión', pages: [{ title: 'p', text: m.body }], pageHeaders: false })
  const lint = lintTranscription(m, checks, docx.failed)
  const unknown = m.refs.filter((r) => !exercises.some((e) => e.ref === r))
  if (unknown.length) lint.errors.push(`Ejercicio(s) que no existen en la base: ${unknown.join(', ')}.`)
  return { lint, fallos: docx.failed.map((f) => ({ latex: f.latex, error: f.error })) }
}

/** Guarda la edición de una persona sobre una hoja cerrada y regenera todo lo que depende de ella. */
export async function guardarTranscripcion(dir: string, id: string, entrega: string, texto: string): Promise<GuardadoHoja> {
  if (!texto.trim()) throw new Error('La transcripción no puede quedar vacía.')
  await writeFile(join(dir, 'transcripcion.md'), texto.endsWith('\n') ? texto : texto + '\n')
  const { lint, fallos } = await revisarTexto(texto)
  await docxHoja(dir, id, entrega)
  return { lint, fallos, ensamblado: entrega ? await regenerarEntrega(entrega) : null }
}

/** La corrección de la persona pasa a ser la referencia: se miden las diferencias con lo que leyó el agente. */
export async function aprobarHoja(dir: string, id: string): Promise<Record<string, any>> {
  const informe = JSON.parse(await readFile(join(dir, 'informe.json'), 'utf8'))
  const original = parseMarkers(await readFile(join(dir, 'transcripcion.original.md'), 'utf8'))
  const actual = parseMarkers(await readFile(join(dir, 'transcripcion.md'), 'utf8'))
  informe.metricas = comparePage(original.body, actual.body)
  informe.aprobada = true
  informe.aprobadaEn = new Date().toISOString()
  await docxHoja(dir, id, informe.entrega ?? '')
  await writeFile(join(dir, 'informe.json'), JSON.stringify(informe, null, 2))
  return informe
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
