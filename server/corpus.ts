import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseActivity } from '../src/shared/corpus'
import type { Activity, Exercise } from '../src/shared/types'

export const corpusDir = resolve(process.env.CORPUS_DIR ?? './corpus/actividades')

/** Se lee del disco en cada llamada: editar un .md se refleja al recargar, sin reiniciar. */
export async function loadCorpus(): Promise<Activity[]> {
  let files: string[]
  try {
    files = (await readdir(corpusDir)).filter((f) => f.toLowerCase().endsWith('.md')).sort()
  } catch {
    return []
  }
  const out: Activity[] = []
  const seen = new Set<string>()
  for (const f of files) {
    const act = parseActivity(await readFile(join(corpusDir, f), 'utf8'), f)
    if (seen.has(act.id)) act.warnings.push(`El id "${act.id}" ya existe en otro archivo.`)
    seen.add(act.id)
    out.push(act)
  }
  return out
}

export async function findExercises(refs: string[]): Promise<Exercise[]> {
  const acts = await loadCorpus()
  const all = new Map(acts.flatMap((a) => a.exercises.map((e) => [e.ref, e] as const)))
  return refs.flatMap((r) => (all.has(r) ? [all.get(r)!] : []))
}
