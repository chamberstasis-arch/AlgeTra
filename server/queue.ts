import { config, mathpixMode } from './config'
import { OcrError, ocrImage } from './mathpix'
import { allRuns, estimatedSpendUsd, getRun, persist, readImage, saveRaw } from './store'

interface Job {
  runId: string
  pageId: string
}

const pending: Job[] = []
let active = 0

export function enqueue(runId: string, pageId: string) {
  if (pending.some((j) => j.pageId === pageId)) return
  pending.push({ runId, pageId })
  pump()
}

/** Tras un reinicio, las páginas que estaban en cola o procesando vuelven a la cola. */
export function resumeInterrupted() {
  for (const run of allRuns())
    for (const page of run.pages)
      if (page.status === 'queued' || page.status === 'processing') {
        page.status = 'queued'
        enqueue(run.id, page.id)
      }
}

function pump() {
  while (active < config.mathpix.concurrency && pending.length) {
    const job = pending.shift()!
    active++
    process(job)
      .catch((err) => console.error('[queue]', err))
      .finally(() => {
        active--
        pump()
      })
  }
}

async function process({ runId, pageId }: Job) {
  const run = getRun(runId)
  const page = run?.pages.find((p) => p.id === pageId)
  if (!run || !page) return // se eliminó mientras esperaba

  page.status = 'processing'
  page.error = undefined
  await persist(run)

  try {
    const { budgetUsd, costPerImageUsd } = config.mathpix
    if (mathpixMode() === 'ready' && budgetUsd > 0 && estimatedSpendUsd(costPerImageUsd) >= budgetUsd) {
      throw new OcrError(
        'budget_exceeded',
        `Se alcanzó el tope de gasto estimado (US$ ${budgetUsd}). Sube MATHPIX_BUDGET_USD en .env para continuar.`,
        false,
      )
    }
    const image = await readImage(run.id, page)
    const result = await ocrImage(
      { image, mime: page.mime, filename: page.filename, settings: run.settings },
      () => {
        page.attempts++
      },
    )
    page.text = result.text
    page.meta = result.meta
    page.latencyMs = result.latencyMs
    page.mock = result.mock
    page.processedAt = new Date().toISOString()
    page.status = 'done'
    await saveRaw(run.id, page.id, result.raw)
  } catch (err) {
    page.status = 'error'
    page.error =
      err instanceof OcrError
        ? err.toPageError()
        : { code: 'internal_error', message: err instanceof Error ? err.message : 'Error inesperado.', retryable: true }
    if (err instanceof OcrError && err.raw) await saveRaw(run.id, page.id, err.raw).catch(() => {})
  }
  if (getRun(run.id)) await persist(run)
}
