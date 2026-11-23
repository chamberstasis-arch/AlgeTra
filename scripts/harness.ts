// Herramientas locales del agente de transcripción. No llaman a ningún servicio externo.
// Uso: pnpm harness <estado|siguiente|validar|cerrar|reabrir|aprobar|medir|aprender> [...]
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, readdir, rename, stat, writeFile, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { comparePage } from '../src/shared/metrics'
import { runChecks } from '../server/checks'
import { findExercises } from '../server/corpus'
import { buildDocx } from '../server/docx'
import { isArithmeticError, lintTranscription, parseMarkers, safeId } from '../server/harness'

const ROOT = resolve(process.env.HARNESS_DIR ?? './trabajo')
const D = {
  por: join(ROOT, 'por_procesar'),
  en: join(ROOT, 'en_proceso'),
  ok: join(ROOT, 'procesadas'),
  rev: join(ROOT, 'revision'),
}
const LEARN = resolve('harness/APRENDIZAJES.md')
const IMG = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const LIMIT = 3.5 * 1024 * 1024

const [cmd, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const opt = (n: string) => {
  const i = rest.indexOf(`--${n}`)
  return i >= 0 ? rest[i + 1] : undefined
}
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--nota'].includes(rest[i - 1])))
const die = (msg: string, code = 1): never => {
  console.error(msg)
  process.exit(code)
}
const ls = async (dir: string) => (existsSync(dir) ? (await readdir(dir)).filter((f) => !f.startsWith('.')) : [])
const natural = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true })

for (const d of Object.values(D)) await mkdir(d, { recursive: true })

/** Localiza una hoja por id en la carpeta indicada. */
async function find(id: string | undefined, dirs: string[]) {
  if (!id) return die('Falta el id de la hoja.', 2)
  for (const d of dirs) if (existsSync(join(d, id))) return { dir: join(d, id), parent: d }
  return die(`No existe la hoja "${id}" en ${dirs.map((d) => d.split('/').pop()).join(' / ')}.`)
}

async function validate(dir: string) {
  const src = await readFile(join(dir, 'transcripcion.md'), 'utf8').catch(() => die('No existe transcripcion.md en la carpeta de la hoja. Escríbelo primero.'))
  const m = parseMarkers(src)
  const exercises = m.refs.length ? await findExercises(m.refs) : []
  const unknown = m.refs.filter((r) => !exercises.some((e) => e.ref === r))
  const checks = m.body.trim() ? runChecks(m.body, exercises) : null
  const docx = await buildDocx({ title: 'validación', pages: [{ title: 'p', text: m.body }], pageHeaders: false })
  const lint = lintTranscription(m, checks, docx.failed)
  if (unknown.length) lint.errors.push(`Ejercicio(s) que no existen en la base: ${unknown.join(', ')}.`)
  return { m, checks, docx, lint, exercises }
}

function printLint(l: Awaited<ReturnType<typeof validate>>['lint'], doubts: string[]) {
  if (l.errors.length) console.log(`\nERRORES (${l.errors.length}):\n` + l.errors.map((e) => `  ✘ ${e}`).join('\n'))
  if (l.needsReview.length) console.log(`\nREQUIEREN REVISIÓN HUMANA:\n` + l.needsReview.map((e) => `  ! ${e}`).join('\n'))
  if (doubts.length) console.log(`\nDUDAS DECLARADAS:\n` + doubts.map((d) => `  ? ${d}`).join('\n'))
  console.log('\n' + l.info.map((i) => `  · ${i}`).join('\n'))
}

switch (cmd) {
  case 'estado': {
    for (const [k, d] of Object.entries(D)) {
      const items = await ls(d)
      console.log(`${k.padEnd(4)} ${d.split('/').pop()!.padEnd(14)} ${String(items.length).padStart(3)}  ${items.slice(0, 8).join(', ')}${items.length > 8 ? ' …' : ''}`)
    }
    break
  }

  case 'siguiente': {
    const working = await ls(D.en)
    if (working.length) die(`Ya tienes una hoja en proceso: "${working[0]}". Termínala con "pnpm harness cerrar ${working[0]}" antes de tomar otra.`)
    const files = (await ls(D.por)).filter((f) => IMG.has(extname(f).toLowerCase())).sort(natural)
    if (!files.length) die('No hay imágenes en por_procesar (jpg, png o webp). Trabajo terminado.', 3)
    const file = files[0]
    let id = safeId(file)
    for (let n = 2; existsSync(join(D.ok, id)) || existsSync(join(D.rev, id)); n++) id = `${safeId(file)}-${n}`
    const dir = join(D.en, id)
    await mkdir(dir, { recursive: true })
    const ext = extname(file).toLowerCase()
    const img = join(dir, `imagen${ext}`)
    await rename(join(D.por, file), img)
    let view = img
    if ((await stat(img)).size > LIMIT) {
      const small = join(dir, 'imagen_reducida.jpg')
      try {
        execFileSync('magick', [img, '-auto-orient', '-resize', '3000x3000>', '-quality', '85', small], { stdio: 'ignore' })
        view = small
      } catch {
        console.warn('Aviso: la imagen es muy grande y no se pudo reducir (falta ImageMagick).')
      }
    }
    await writeFile(join(dir, 'meta.json'), JSON.stringify({ id, archivoOriginal: file, tomadaEn: new Date().toISOString() }, null, 2))
    console.log(`Hoja tomada: ${id}`)
    console.log(`Imagen para mirar: ${view}`)
    console.log(`Escribe tu transcripción en: ${join(dir, 'transcripcion.md')}`)
    console.log(`Quedan ${files.length - 1} por procesar.`)
    console.log(`Antes de empezar, ¿leíste ${LEARN}? Contiene correcciones de la persona que supervisa.`)
    break
  }

  case 'validar': {
    const { dir } = await find(positional[0], [D.en])
    const v = await validate(dir)
    console.log(`Validación de ${positional[0]}`)
    printLint(v.lint, v.m.doubts)
    console.log(v.lint.errors.length ? '\nRESULTADO: corrige los errores y vuelve a validar.' : '\nRESULTADO: sin errores. Puedes cerrar.')
    process.exit(v.lint.errors.length ? 1 : 0)
    break
  }

  case 'cerrar': {
    const { dir } = await find(positional[0], [D.en])
    const id = positional[0]
    const v = await validate(dir)
    const blocking = v.lint.errors.filter((e) => !(isArithmeticError(e) && flags.has('--revisado')))
    if (blocking.length) {
      printLint(v.lint, v.m.doubts)
      const onlyArith = v.lint.errors.every(isArithmeticError)
      die(
        '\nNo se puede cerrar.' +
          (onlyArith
            ? ' Si ya reexaminaste la imagen y la aritmética del alumno realmente no cuadra, cierra con --revisado.'
            : ' Corrige los errores y vuelve a validar.'),
      )
    }
    const toReview = flags.has('--revision') || v.lint.needsReview.length > 0
    const target = join(toReview ? D.rev : D.ok, id)
    await writeFile(join(dir, 'transcripcion.original.md'), await readFile(join(dir, 'transcripcion.md'), 'utf8'))
    const docx = await buildDocx({
      title: id,
      subtitle: `Transcripción del agente · ${new Date().toLocaleDateString('es')}`,
      pages: [{ title: id, text: v.m.body }],
      pageHeaders: false,
    })
    await writeFile(join(dir, 'documento.docx'), docx.buffer)
    await writeFile(
      join(dir, 'informe.json'),
      JSON.stringify(
        {
          id,
          cerradaEn: new Date().toISOString(),
          destino: toReview ? 'revision' : 'procesadas',
          nota: opt('nota') ?? '',
          aritmeticaRevisadaPorAgente: flags.has('--revisado'),
          ejercicios: v.m.refs,
          dudas: v.m.doubts,
          requierenRevision: v.lint.needsReview,
          formulas: docx.formulas,
          aritmetica: v.checks?.consistency
            ? { verificadas: v.checks.consistency.verified, inconsistentes: v.checks.consistency.inconsistent, noVerificables: v.checks.consistency.unverifiable }
            : null,
          respuestas: v.checks?.exercises.map((e) => ({ ref: e.ref, estado: e.status })) ?? [],
          aprobada: false,
        },
        null,
        2,
      ),
    )
    await rename(dir, target)
    console.log(`Cerrada: ${id} → ${toReview ? 'revision' : 'procesadas'}`)
    if (toReview) console.log(v.lint.needsReview.map((r) => `  ! ${r}`).join('\n'))
    console.log(`Documento: ${join(target, 'documento.docx')}`)
    break
  }

  case 'reabrir': {
    const { dir } = await find(positional[0], [D.ok, D.rev])
    if ((await ls(D.en)).length) die('Ya hay una hoja en proceso. Ciérrala primero.')
    await rename(dir, join(D.en, positional[0]))
    console.log(`Reabierta: ${positional[0]}. Edita su transcripcion.md, valida y cierra de nuevo.`)
    break
  }

  case 'aprobar': {
    const { dir } = await find(positional[0], [D.ok, D.rev])
    const informe = JSON.parse(await readFile(join(dir, 'informe.json'), 'utf8'))
    const original = await readFile(join(dir, 'transcripcion.original.md'), 'utf8')
    const current = await readFile(join(dir, 'transcripcion.md'), 'utf8')
    const mo = parseMarkers(original)
    const mc = parseMarkers(current)
    informe.metricas = comparePage(mo.body, mc.body)
    informe.aprobada = true
    informe.aprobadaEn = new Date().toISOString()
    const docx = await buildDocx({ title: positional[0], subtitle: `Transcripción revisada · ${new Date().toLocaleDateString('es')}`, pages: [{ title: positional[0], text: mc.body }], pageHeaders: false })
    await writeFile(join(dir, 'documento.docx'), docx.buffer)
    await writeFile(join(dir, 'informe.json'), JSON.stringify(informe, null, 2))
    const m = informe.metricas
    console.log(`Aprobada: ${positional[0]} · fórmulas exactas ${m.equations.exact}/${m.equations.total} · error de tokens ${(m.mathTokenErrorRate * 100).toFixed(1)} % · ${m.unchanged ? 'sin correcciones' : 'corregida por la persona'}`)
    console.log('DOCX regenerado con tu versión.')
    break
  }

  case 'medir': {
    const rows: { id: string; m: ReturnType<typeof comparePage>; ans: string[] }[] = []
    let total = 0
    for (const d of [D.ok, D.rev])
      for (const id of await ls(d)) {
        total++
        const p = join(d, id, 'informe.json')
        if (!existsSync(p)) continue
        const inf = JSON.parse(await readFile(p, 'utf8'))
        if (inf.aprobada && inf.metricas) rows.push({ id, m: inf.metricas, ans: (inf.respuestas ?? []).map((r: { estado: string }) => r.estado) })
      }
    const sum = (f: (m: (typeof rows)[number]['m']) => number) => rows.reduce((n, r) => n + f(r.m), 0)
    const eq = sum((m) => m.equations.total)
    const ex = sum((m) => m.equations.exact)
    const pct = (x: number) => `${(x * 100).toFixed(1)} %`
    const out = [
      '# Medición del agente',
      '',
      `Hojas cerradas: ${total} · aprobadas por la persona (cuentan): ${rows.length}`,
      '',
      rows.length
        ? [
            `- Fórmulas exactas: ${ex} de ${eq} (${eq ? pct(ex / eq) : '—'})`,
            `- Error medio de tokens LaTeX: ${pct(sum((m) => m.mathTokenErrorRate) / rows.length)}`,
            `- CER medio del texto: ${pct(sum((m) => m.textCer) / rows.length)}`,
            `- Hojas sin ninguna corrección: ${rows.filter((r) => r.m.unchanged).length} de ${rows.length}`,
          ].join('\n')
        : 'Aún no hay hojas aprobadas: la referencia es tu corrección, así que ejecuta "pnpm harness aprobar <id>" tras revisar cada una.',
      '',
      '| Hoja | Fórmulas exactas | Error tokens | Sin correcciones |',
      '| --- | --- | --- | --- |',
      ...rows.map((r) => `| ${r.id} | ${r.m.equations.exact}/${r.m.equations.total} | ${pct(r.m.mathTokenErrorRate)} | ${r.m.unchanged ? 'sí' : 'no'} |`),
      '',
      'Con pocas hojas las cifras son orientativas.',
    ].join('\n')
    await writeFile(join(ROOT, 'metricas.md'), out + '\n')
    console.log(out)
    break
  }

  case 'aprender': {
    const text = positional.join(' ').trim()
    if (!text) die('Uso: pnpm harness aprender "regla o corrección"', 2)
    await appendFile(LEARN, `- (${new Date().toISOString().slice(0, 10)}) ${text}\n`)
    console.log('Anotado en harness/APRENDIZAJES.md. El agente lo leerá al empezar cada sesión.')
    break
  }

  default:
    console.log('Uso: pnpm harness <estado|siguiente|validar <id>|cerrar <id> [--revision] [--revisado] [--nota "…"]|reabrir <id>|aprobar <id>|medir|aprender "texto">')
    process.exit(cmd ? 2 : 0)
}
