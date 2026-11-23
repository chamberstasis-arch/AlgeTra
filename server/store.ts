import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Page, Run, RunSettings, RunSummary } from '../src/shared/types'
import { config } from './config'

export const newId = (prefix: string) => `${prefix}_${randomBytes(5).toString('hex')}`

const runs = new Map<string, Run>()
const writing = new Map<string, Promise<void>>()

const runDir = (id: string) => join(config.dataDir, 'runs', id)
export const imagePath = (runId: string, page: Page) => join(runDir(runId), 'images', `${page.id}${extFor(page.mime)}`)
const rawPath = (runId: string, pageId: string) => join(runDir(runId), 'raw', `${pageId}.json`)

export function extFor(mime: string) {
  return mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg'
}

export async function loadAll() {
  const root = join(config.dataDir, 'runs')
  if (!existsSync(root)) return
  for (const id of await readdir(root)) {
    try {
      const run = JSON.parse(await readFile(join(root, id, 'run.json'), 'utf8')) as Run
      runs.set(run.id, run)
    } catch {
      console.warn(`[store] no se pudo leer la prueba ${id}`)
    }
  }
}

/** Escritura atómica y serializada por prueba: nunca deja un JSON a medias. */
export function persist(run: Run): Promise<void> {
  const prev = writing.get(run.id) ?? Promise.resolve()
  const next = prev.then(async () => {
    const dir = runDir(run.id)
    await mkdir(dir, { recursive: true })
    const tmp = join(dir, 'run.json.tmp')
    await writeFile(tmp, JSON.stringify(run, null, 2))
    await rename(tmp, join(dir, 'run.json'))
  })
  writing.set(run.id, next.catch(() => {}))
  return next
}

export const listRuns = (): RunSummary[] =>
  [...runs.values()]
    .map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      pageCount: r.pages.length,
      doneCount: r.pages.filter((p) => p.status === 'done').length,
      errorCount: r.pages.filter((p) => p.status === 'error').length,
      reviewedCount: r.pages.filter((p) => p.review.reviewed).length,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/** Gasto estimado en Mathpix de todas las pruebas guardadas (cada intento real cuenta; el modo simulado no). */
export function estimatedSpendUsd(costPerCall: number): number {
  let calls = 0
  for (const run of runs.values()) for (const p of run.pages) if (!p.mock) calls += p.attempts
  return calls * costPerCall
}

export const getRun = (id: string) => runs.get(id)
export const allRuns = () => [...runs.values()]

export async function createRun(name: string, settings: RunSettings): Promise<Run> {
  const run: Run = { id: newId('run'), name, createdAt: new Date().toISOString(), settings, pages: [] }
  runs.set(run.id, run)
  await persist(run)
  return run
}

export async function deleteRun(id: string) {
  runs.delete(id)
  await writing.get(id)
  await rm(runDir(id), { recursive: true, force: true })
}

export async function addPage(run: Run, file: { filename: string; mime: string; data: Buffer }): Promise<Page> {
  const page: Page = {
    id: newId('pg'),
    order: run.pages.length ? Math.max(...run.pages.map((p) => p.order)) + 1 : 1,
    filename: file.filename,
    mime: file.mime,
    bytes: file.data.length,
    createdAt: new Date().toISOString(),
    status: 'queued',
    attempts: 0,
    review: { reviewed: false, tags: [], notes: '' },
  }
  await mkdir(join(runDir(run.id), 'images'), { recursive: true })
  await writeFile(imagePath(run.id, page), file.data)
  run.pages.push(page)
  return page
}

export async function removePage(run: Run, page: Page) {
  run.pages = run.pages.filter((p) => p.id !== page.id)
  await rm(imagePath(run.id, page), { force: true })
  await rm(rawPath(run.id, page.id), { force: true })
}

export const readImage = (runId: string, page: Page) => readFile(imagePath(runId, page))

export async function saveRaw(runId: string, pageId: string, raw: unknown) {
  await mkdir(join(runDir(runId), 'raw'), { recursive: true })
  await writeFile(rawPath(runId, pageId), JSON.stringify(raw, null, 2))
}

export const readRaw = async (runId: string, pageId: string) => JSON.parse(await readFile(rawPath(runId, pageId), 'utf8'))
