import multipart from '@fastify/multipart'
import Fastify from 'fastify'
import { ERROR_TAGS, type AppConfig, type ErrorTag, type PageRating, type Run } from '../src/shared/types'
import { buildDocx } from './docx'
import { config, mathpixMode } from './config'
import { runChecks } from './checks'
import { corpusDir, findExercises, loadCorpus } from './corpus'
import { enqueue, resumeInterrupted } from './queue'
import { buildReport, reportToMarkdown } from './report'
import * as store from './store'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const RATINGS: PageRating[] = ['perfect', 'minor', 'major', 'unusable']

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 2 * 1024 * 1024 })
await app.register(multipart, { limits: { fileSize: config.maxUploadBytes, files: 60 } })

const notFound = (msg: string) => Object.assign(new Error(msg), { statusCode: 404 })
const badRequest = (msg: string) => Object.assign(new Error(msg), { statusCode: 400 })

function runOr404(id: string): Run {
  const run = store.getRun(id)
  if (!run) throw notFound('Prueba no encontrada.')
  return run
}
function pageOr404(run: Run, id: string) {
  const page = run.pages.find((p) => p.id === id)
  if (!page) throw notFound('Página no encontrada.')
  return page
}

app.get('/api/config', async (): Promise<AppConfig> => ({
  mathpix: mathpixMode(),
  concurrency: config.mathpix.concurrency,
  costPerImageUsd: config.mathpix.costPerImageUsd,
}))

app.get('/api/runs', async () => store.listRuns())

app.post<{ Body: { name?: string; documentLayout?: boolean } }>('/api/runs', async (req) => {
  const name = (req.body?.name ?? '').trim() || `Prueba ${new Date().toLocaleString('es')}`
  return store.createRun(name.slice(0, 120), { documentLayout: req.body?.documentLayout ?? true })
})

app.get<{ Params: { id: string } }>('/api/runs/:id', async (req) => runOr404(req.params.id))

app.patch<{ Params: { id: string }; Body: { name?: string } }>('/api/runs/:id', async (req) => {
  const run = runOr404(req.params.id)
  if (typeof req.body?.name === 'string' && req.body.name.trim()) run.name = req.body.name.trim().slice(0, 120)
  await store.persist(run)
  return run
})

app.delete<{ Params: { id: string } }>('/api/runs/:id', async (req, reply) => {
  runOr404(req.params.id)
  await store.deleteRun(req.params.id)
  return reply.code(204).send()
})

// Carga de 1 o N imágenes: cada archivo se encola en cuanto se guarda.
app.post<{ Params: { id: string } }>('/api/runs/:id/pages', async (req) => {
  const run = runOr404(req.params.id)
  const added: string[] = []
  const rejected: { filename: string; reason: string }[] = []
  for await (const part of req.parts()) {
    if (part.type !== 'file') continue
    const data = await part.toBuffer()
    if (part.file.truncated) {
      rejected.push({ filename: part.filename, reason: 'Excede el tamaño máximo (12 MB).' })
      continue
    }
    if (!ALLOWED_MIME.has(part.mimetype)) {
      rejected.push({ filename: part.filename, reason: `Formato no admitido (${part.mimetype}). Usa JPEG, PNG o WebP.` })
      continue
    }
    const page = await store.addPage(run, { filename: part.filename || 'imagen', mime: part.mimetype, data })
    added.push(page.id)
  }
  await store.persist(run)
  added.forEach((id) => enqueue(run.id, id))
  return { added, rejected }
})

app.get<{ Params: { id: string; pid: string } }>('/api/runs/:id/pages/:pid/image', async (req, reply) => {
  const run = runOr404(req.params.id)
  const page = pageOr404(run, req.params.pid)
  return reply.header('Cache-Control', 'private, max-age=3600').type(page.mime).send(await store.readImage(run.id, page))
})

app.get<{ Params: { id: string; pid: string } }>('/api/runs/:id/pages/:pid/raw', async (req) => {
  const run = runOr404(req.params.id)
  pageOr404(run, req.params.pid)
  try {
    return await store.readRaw(run.id, req.params.pid)
  } catch {
    throw notFound('Aún no hay respuesta bruta para esta página.')
  }
})

app.post<{ Params: { id: string; pid: string } }>('/api/runs/:id/pages/:pid/retry', async (req) => {
  const run = runOr404(req.params.id)
  const page = pageOr404(run, req.params.pid)
  if (page.status === 'queued' || page.status === 'processing') throw badRequest('La página ya está en proceso.')
  page.status = 'queued'
  page.error = undefined
  await store.persist(run)
  enqueue(run.id, page.id)
  return page
})

app.delete<{ Params: { id: string; pid: string } }>('/api/runs/:id/pages/:pid', async (req, reply) => {
  const run = runOr404(req.params.id)
  await store.removePage(run, pageOr404(run, req.params.pid))
  await store.persist(run)
  return reply.code(204).send()
})

interface ReviewBody {
  editedText?: string
  reviewed?: boolean
  rating?: PageRating | null
  tags?: ErrorTag[]
  notes?: string
  exerciseRefs?: string[]
}

app.patch<{ Params: { id: string; pid: string }; Body: ReviewBody }>('/api/runs/:id/pages/:pid/review', async (req) => {
  const run = runOr404(req.params.id)
  const page = pageOr404(run, req.params.pid)
  const b = req.body ?? {}
  const r = page.review
  if (typeof b.editedText === 'string') r.editedText = b.editedText
  if (b.rating === null) r.rating = undefined
  else if (b.rating !== undefined) {
    if (!RATINGS.includes(b.rating)) throw badRequest('Valoración inválida.')
    r.rating = b.rating
  }
  if (b.tags) r.tags = b.tags.filter((t) => (ERROR_TAGS as readonly string[]).includes(t))
  if (typeof b.notes === 'string') r.notes = b.notes.slice(0, 2000)
  if (Array.isArray(b.exerciseRefs)) r.exerciseRefs = b.exerciseRefs.filter((x) => typeof x === 'string').slice(0, 20)
  if (typeof b.reviewed === 'boolean') {
    if (b.reviewed && page.text === undefined) throw badRequest('No se puede revisar una página sin transcripción.')
    r.reviewed = b.reviewed
    r.reviewedAt = b.reviewed ? new Date().toISOString() : undefined
  }
  await store.persist(run)
  return page
})

// ---------- corpus de actividades y verificación ----------

app.get('/api/corpus', async () => ({ dir: corpusDir, activities: await loadCorpus() }))

// Verifica un texto (el que se está editando) contra los ejercicios elegidos. No guarda nada.
app.post<{ Body: { text?: string; exerciseRefs?: string[] } }>('/api/checks', async (req) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : ''
  if (text.length > 200_000) throw badRequest('Texto demasiado largo.')
  const exercises = await findExercises(Array.isArray(req.body?.exerciseRefs) ? req.body.exerciseRefs : [])
  return runChecks(text, exercises)
})

// ---------- exportación ----------

function exportPages(run: Run, query: { source?: string; pages?: string }) {
  const useReviewed = query.source !== 'original'
  const wanted = query.pages ? new Set(query.pages.split(',')) : null
  return [...run.pages]
    .sort((a, b) => a.order - b.order)
    .filter((p) => p.text !== undefined && (!wanted || wanted.has(p.id)))
    .map((p) => ({
      title: p.filename,
      text: useReviewed ? (p.review.editedText ?? p.text!) : p.text!,
    }))
}

const safeName = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'transcripcion'

app.get<{ Params: { id: string }; Querystring: { source?: string; pages?: string; headers?: string } }>(
  '/api/runs/:id/export.docx',
  async (req, reply) => {
    const run = runOr404(req.params.id)
    const pages = exportPages(run, req.query)
    if (!pages.length) throw badRequest('No hay páginas transcritas para exportar.')
    const source = req.query.source === 'original' ? 'Transcripción original de Mathpix' : 'Transcripción revisada'
    const result = await buildDocx({
      title: run.name,
      subtitle: `${source} · ${pages.length} página(s) · ${new Date().toLocaleDateString('es')}`,
      pages,
      pageHeaders: req.query.headers !== '0',
    })
    return reply
      .header('Content-Disposition', `attachment; filename="${safeName(run.name)}.docx"`)
      .header('X-AlgeTra-Formulas', String(result.formulas))
      .header('X-AlgeTra-Formulas-Failed', String(result.failed.length))
      .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .send(result.buffer)
  },
)

// Vista previa de qué fórmulas no se pueden convertir a ecuación de Word.
app.get<{ Params: { id: string }; Querystring: { source?: string; pages?: string } }>(
  '/api/runs/:id/export-check',
  async (req) => {
    const run = runOr404(req.params.id)
    const result = await buildDocx({ title: run.name, pages: exportPages(run, req.query), pageHeaders: false })
    return { formulas: result.formulas, failed: result.failed }
  },
)

app.get<{ Params: { id: string } }>('/api/runs/:id/report.json', async (req) => buildReport(runOr404(req.params.id)))
app.get<{ Params: { id: string } }>('/api/runs/:id/report.md', async (req, reply) => {
  const run = runOr404(req.params.id)
  return reply
    .header('Content-Disposition', `attachment; filename="informe-${safeName(run.name)}.md"`)
    .type('text/markdown; charset=utf-8')
    .send(reportToMarkdown(await buildReport(run)))
})

app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
  const status = err.statusCode ?? 500
  if (status >= 500) req.log.error(err)
  reply.code(status).send({ error: status >= 500 ? 'Error interno del servidor.' : err.message })
})

await store.loadAll()
resumeInterrupted()
await app.listen({ port: config.port, host: config.host })
app.log.info(`Mathpix: ${mathpixMode()} · concurrencia ${config.mathpix.concurrency} · datos en ${config.dataDir}`)
