// Interfaz sencilla del entorno del agente: subir archivos, ver la cola, ver y descargar resultados.
// Uso: pnpm ui   (puerto 8080, o el siguiente libre; UI_PORT para fijarlo)
import multipart from '@fastify/multipart'
import Fastify from 'fastify'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { FUENTES, LIMITES, PALETAS, PRESETS, variarEstilo } from '../src/shared/estilo'
import { D, ESTADOS, agruparSueltas, aprobarHoja, docxToPdf, ensamblar, ensureDirs, guardarEstilo, guardarTranscripcion, ingest, leerEstilo, listHojas, ls, miniatura, regenerarEntrega, toolsAvailable, type Estado, type Hoja } from './workspace'
import { safeId } from './harness'
import { extraerFormato } from './formato'
import { guardarComentarios, leerComentarios, normalizarComentarios } from './comentarios'

const app = Fastify({ logger: { level: 'warn' }, bodyLimit: 1024 * 1024 })
await app.register(multipart, { limits: { fileSize: 600 * 1024 * 1024, files: 200 } })
await ensureDirs()

const bad = (m: string, code = 400) => Object.assign(new Error(m), { statusCode: code })
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', md: 'text/markdown; charset=utf-8',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', json: 'application/json',
}
const extOf = (p: string) => p.split('.').pop()!.toLowerCase()

app.get('/', async (_req, reply) => reply.type('text/html; charset=utf-8').send(await readFile(resolve('ui/index.html'), 'utf8')))

app.get<{ Querystring: { tipo?: string } }>('/api/prompt', async (req, reply) => {
  const p = resolve(req.query.tipo === 'lote' ? 'harness/PROMPT_LOTE.md' : req.query.tipo === 'orquestador' ? 'harness/PROMPT_ORQUESTADOR.md' : req.query.tipo === 'contraste' ? 'harness/PROMPT_CONTRASTE.md' : req.query.tipo === 'comentarios' ? 'harness/PROMPT_COMENTARIOS.md' : 'harness/PROMPT_INICIO.md')
  return reply.type('text/plain; charset=utf-8').send(existsSync(p) ? await readFile(p, 'utf8') : '')
})

const slim = (h: Hoja) => {
  const inf = (h.informe ?? {}) as Record<string, any>
  return {
    id: h.id, estado: h.estado, entrega: h.entrega, archivo: h.archivo, orden: h.orden, calidad: h.calidad ?? null,
    destino: inf.destino, dudas: inf.dudas?.length ?? 0, requierenRevision: inf.requierenRevision ?? [], aprobada: !!inf.aprobada,
    formulas: inf.formulas, aritmetica: inf.aritmetica ?? null, ejercicios: inf.ejercicios ?? [],
  }
}

app.get('/api/estado', async () => {
  const hojas = await listHojas()
  const nombres = [...new Set(hojas.map((h) => h.entrega).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  const entregas = await Promise.all(
    nombres.map(async (n) => {
      const hs = hojas.filter((h) => h.entrega === n)
      const dir = join(D.entregas, safeId(n))
      const ens = await readFile(join(dir, 'ensamblado.json'), 'utf8').then(JSON.parse).catch(() => null)
      const estilo = (await leerEstilo(n)).nombre
      return { nombre: n, estilo, conteo: Object.fromEntries(ESTADOS.map((e) => [e, hs.filter((h) => h.estado === e).length])), ensamblado: ens, tieneDocx: existsSync(join(dir, 'documento.docx')) }
    }),
  )
  return { hojas: hojas.map(slim), entregas, herramientas: await toolsAvailable() }
})

app.post('/api/subir', async (req) => {
  let entrega = ''
  const resultados: { archivo: string; guardadas: string[]; avisos: string[] }[] = []
  for await (const part of req.parts()) {
    if (part.type === 'field') {
      if (part.fieldname === 'entrega') entrega = String(part.value ?? '').trim()
      continue
    }
    const data = await part.toBuffer()
    if (part.file.truncated) {
      resultados.push({ archivo: part.filename, guardadas: [], avisos: ['Excede 600 MB.'] })
      continue
    }
    const r = await ingest(part.filename || 'archivo', data, entrega)
    resultados.push({ archivo: part.filename, ...r })
  }
  return { entrega, resultados }
})

/** Resuelve el archivo pedido dentro del espacio de trabajo, sin permitir salir de él. */
async function resolveFile(estado: string, id: string, tipo: string): Promise<string> {
  if (!ESTADOS.includes(estado as Estado)) throw bad('Estado desconocido.')
  if (estado === 'por_procesar') {
    if (tipo !== 'imagen') throw bad('Solo hay imagen.')
    const p = resolve(D.por_procesar, id)
    if (!p.startsWith(D.por_procesar + '/') || !/\.(jpe?g|png|webp)$/i.test(p) || !existsSync(p)) throw bad('No encontrado.', 404)
    return p
  }
  if (!id || id.includes('/') || id.includes('..')) throw bad('Id no válido.')
  const dir = join(D[estado as Estado], id)
  const names: Record<string, () => Promise<string | undefined>> = {
    imagen: async () => (await ls(dir)).find((f) => /^imagen\.(jpe?g|png|webp)$/i.test(f)),
    mejorada: async () => 'imagen_mejorada.jpg',
    docx: async () => 'documento.docx',
    md: async () => 'transcripcion.md',
    informe: async () => 'informe.json',
    pdf: async () => 'documento.docx',
  }
  if (!names[tipo]) throw bad('Tipo desconocido.')
  return names[tipo]().then((n) => {
    if (!n) throw bad('No encontrado.', 404)
    return join(dir, n)
  })
}

app.get<{ Querystring: { estado: string; id: string; tipo: string; descargar?: string; mini?: string } }>('/api/archivo', async (req, reply) => {
  const { estado, id, tipo } = req.query
  let p = await resolveFile(estado, id, tipo)
  if (!existsSync(p)) throw bad('No encontrado.', 404)
  if (req.query.mini && /\.(jpe?g|png|webp)$/i.test(p))
    return reply.header('Cache-Control', 'private, max-age=300').type('image/jpeg').send(await miniatura(p).catch(() => { throw bad('No se pudo generar la miniatura.', 500) }))
  if (tipo === 'pdf') p = await docxToPdf(p).catch(() => { throw bad('No se pudo generar el PDF (¿LibreOffice instalado?).', 500) })
  const name = `${safeId(id.split('/').pop() ?? id)}.${extOf(p)}`
  if (req.query.descargar) reply.header('Content-Disposition', `attachment; filename="${name}"`)
  return reply.header('Cache-Control', 'no-store').type(MIME[extOf(p)] ?? 'application/octet-stream').send(await readFile(p))
})

app.get<{ Querystring: { nombre: string; tipo: string; descargar?: string } }>('/api/entrega', async (req, reply) => {
  const { nombre, tipo } = req.query
  const dir = join(D.entregas, safeId(nombre ?? ''))
  const files: Record<string, string> = { docx: 'documento.docx', pdf: 'documento.docx', md: 'ensamblado.md', json: 'ensamblado.json' }
  if (!files[tipo]) throw bad('Tipo desconocido.')
  let p = join(dir, files[tipo])
  if (!existsSync(p)) throw bad('Aún no se ha ensamblado esta entrega.', 404)
  if (tipo === 'pdf') p = await docxToPdf(p).catch(() => { throw bad('No se pudo generar el PDF.', 500) })
  if (req.query.descargar) reply.header('Content-Disposition', `attachment; filename="${safeId(nombre)}.${extOf(p)}"`)
  return reply.header('Cache-Control', 'no-store').type(MIME[extOf(p)]).send(await readFile(p))
})

/** Pasa las fotos sueltas (sin entrega) a una entrega con ese nombre. */
app.post<{ Body: { entrega: string } }>('/api/agrupar', async (req) => {
  try {
    return await agruparSueltas(String(req.body?.entrega ?? ''))
  } catch (e) {
    throw bad(e instanceof Error ? e.message : 'No se pudo agrupar.')
  }
})

app.post<{ Body: { entrega: string; ordenOriginal?: boolean } }>('/api/ensamblar', async (req) => {
  if (!req.body?.entrega) throw bad('Falta la entrega.')
  try {
    return await ensamblar(req.body.entrega, { ordenOriginal: !!req.body.ordenOriginal })
  } catch (e) {
    throw bad(e instanceof Error ? e.message : 'No se pudo ensamblar.')
  }
})

// ───────── Estilo de la entrega ─────────

app.get('/api/estilos', async () => ({ presets: PRESETS, fuentes: FUENTES, paletas: PALETAS, limites: LIMITES }))

app.get<{ Querystring: { entrega: string } }>('/api/estilo', async (req) => {
  if (!req.query.entrega) throw bad('Falta la entrega.')
  return leerEstilo(req.query.entrega)
})

/** Propone un estilo derivado de la semilla (la misma semilla da el mismo estilo). No guarda nada. */
app.post<{ Body: { entrega: string; semilla?: string } }>('/api/estilo/variar', async (req) => {
  if (!req.body?.entrega) throw bad('Falta la entrega.')
  return variarEstilo(req.body.semilla?.trim() || req.body.entrega)
})

/** Lee un documento de ejemplo (DOCX o PDF) y propone un estilo a partir de él. No guarda nada. */
app.post('/api/estilo/extraer', async (req) => {
  const parte = await req.file({ limits: { fileSize: 40 * 1024 * 1024 } })
  if (!parte) throw bad('Falta el archivo de ejemplo.')
  const data = await parte.toBuffer()
  if (parte.file.truncated) throw bad('El ejemplo pesa más de 40 MB.')
  try {
    const r = await extraerFormato(parte.filename || 'ejemplo', data)
    const base = safeId(parte.filename || 'ejemplo').slice(0, 24)
    return { ...r, estilo: { ...r.estilo, nombre: `ejemplo ${base}` } }
  } catch (e) {
    throw bad(e instanceof Error ? e.message : 'No se pudo leer el ejemplo.')
  }
})

/** Guarda el estilo y rehace los documentos de la entrega a partir de las transcripciones guardadas. */
app.put<{ Body: { entrega: string; estilo: unknown } }>('/api/estilo', async (req) => {
  if (!req.body?.entrega) throw bad('Falta la entrega.')
  const estilo = await guardarEstilo(req.body.entrega, req.body.estilo)
  try {
    return { estilo, ensamblado: await regenerarEntrega(req.body.entrega) }
  } catch (e) {
    throw bad(e instanceof Error ? e.message : 'No se pudieron regenerar los documentos.', 500)
  }
})

// ───────── Editar y aprobar una hoja ya cerrada ─────────

function dirHoja(estado: string, id: string): string {
  if (estado !== 'procesadas' && estado !== 'revision') throw bad('Solo se editan hojas ya cerradas (procesadas o en revisión).')
  if (!id || id.includes('/') || id.includes('..')) throw bad('Id no válido.')
  const dir = join(D[estado], id)
  if (!existsSync(dir)) throw bad('No encontrada.', 404)
  return dir
}
const entregaDe = async (dir: string) => (await readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse).catch(() => ({}))).entrega ?? ''

app.put<{ Body: { estado: string; id: string; texto: string } }>('/api/transcripcion', async (req) => {
  const { estado, id, texto } = req.body ?? ({} as any)
  const dir = dirHoja(estado, id)
  try {
    return await guardarTranscripcion(dir, id, await entregaDe(dir), String(texto ?? ''))
  } catch (e) {
    throw bad(e instanceof Error ? e.message : 'No se pudo guardar.')
  }
})

app.get<{ Querystring: { estado: string; id: string } }>('/api/comentarios', async (req) => leerComentarios(dirHoja(req.query.estado, req.query.id)))

app.put<{ Body: { estado: string; id: string; comentarios: unknown } }>('/api/comentarios', async (req) => {
  const { estado, id, comentarios } = req.body ?? ({} as any)
  const dir = dirHoja(estado, id)
  try {
    const lista = normalizarComentarios(comentarios, await leerComentarios(dir))
    await guardarComentarios(dir, lista)
    return { total: lista.length, pendientes: lista.filter((c) => c.estado === 'pendiente').length }
  } catch (e) {
    throw bad(e instanceof Error ? e.message : 'No se pudieron guardar los comentarios.')
  }
})

app.post<{ Body: { estado: string; id: string } }>('/api/aprobar', async (req) => {
  const { estado, id } = req.body ?? ({} as any)
  const dir = dirHoja(estado, id)
  const informe = await aprobarHoja(dir, id)
  const entrega = await entregaDe(dir)
  return { metricas: informe.metricas, ensamblado: entrega ? await regenerarEntrega(entrega) : null }
})

// Puerto: UI_PORT, o 8080; si está ocupado, el siguiente libre.
const base = Number(process.env.UI_PORT ?? 8080)
for (let port = base; port < base + 20; port++) {
  try {
    await app.listen({ port, host: process.env.UI_HOST ?? '127.0.0.1' })
    console.log(`\nAlgeTra · entorno del agente:  http://localhost:${port}\n(Carpeta de trabajo: ${resolve(process.env.HARNESS_DIR ?? './trabajo')})\n`)
    break
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || port === base + 19) throw e
    console.log(`Puerto ${port} ocupado, probando ${port + 1}…`)
  }
}
