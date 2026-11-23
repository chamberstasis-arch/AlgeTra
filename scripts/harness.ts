// Herramientas locales del agente de transcripción. No llaman a ningún servicio externo.
// Uso: pnpm harness <estado|siguiente|actividades|validar|cerrar|reabrir|aprobar|ensamblar|medir|aprender> [...]
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { comparePage } from '../src/shared/metrics'
import { runChecks } from '../server/checks'
import { findExercises, loadCorpus } from '../server/corpus'
import { buildDocx } from '../server/docx'
import { isArithmeticError, lintTranscription, parseMarkers, safeId } from '../server/harness'
import { D, ROOT, GUIA_CALIDAD, analyzeImage, enhanceImage, ensamblar, ensureDirs, listHojas, ls, natural } from '../server/workspace'

const LEARN = resolve('harness/APRENDIZAJES.md')
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

await ensureDirs()

/** Localiza una hoja por id en las carpetas indicadas. */
function find(id: string | undefined, dirs: string[]) {
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
    const hojas = await listHojas()
    for (const e of ['por_procesar', 'en_proceso', 'procesadas', 'revision'] as const) {
      const hs = hojas.filter((h) => h.estado === e)
      console.log(`${e.padEnd(13)} ${String(hs.length).padStart(3)}  ${hs.slice(0, 8).map((h) => h.id).join(', ')}${hs.length > 8 ? ' …' : ''}`)
    }
    const ent = [...new Set(hojas.map((h) => h.entrega).filter(Boolean))]
    if (ent.length) console.log(`\nEntregas: ${ent.join(', ')}`)
    break
  }

  case 'siguiente': {
    const hojas = await listHojas()
    const working = hojas.filter((h) => h.estado === 'en_proceso')
    if (working.length) die(`Ya tienes una hoja en proceso: "${working[0].id}". Termínala con "pnpm harness cerrar ${working[0].id}" antes de tomar otra.`)
    const pend = hojas.filter((h) => h.estado === 'por_procesar').sort((a, b) => natural(a.entrega, b.entrega) || natural(a.archivo, b.archivo))
    if (!pend.length) die('No hay imágenes en por_procesar. Trabajo terminado.', 3)
    const h = pend[0]
    const stem = safeId(h.archivo)
    let id = h.entrega ? `${safeId(h.entrega)}__${stem}` : stem
    for (let n = 2; hojas.some((x) => x.estado !== 'por_procesar' && x.id === id); n++) id = `${h.entrega ? safeId(h.entrega) + '__' : ''}${stem}-${n}`
    const orden = hojas.filter((x) => x.entrega === h.entrega && x.estado !== 'por_procesar').length + 1
    const dir = join(D.en_proceso, id)
    await mkdir(dir, { recursive: true })
    const img = join(dir, `imagen${extname(h.archivo).toLowerCase()}`)
    await rename(h.imagen, img)
    const calidad = await analyzeImage(img)
    const mejorada = join(dir, 'imagen_mejorada.jpg')
    const hasEnh = (await enhanceImage(img, mejorada)) && !!calidad?.banderas.length
    await writeFile(join(dir, 'meta.json'), JSON.stringify({ id, entrega: h.entrega, archivoOriginal: h.archivo, orden, calidad, tomadaEn: new Date().toISOString() }, null, 2))
    console.log(`Hoja tomada: ${id}${h.entrega ? `   (entrega "${h.entrega}", hoja ${orden})` : ''}`)
    console.log(`Imagen para mirar: ${img}`)
    if (hasEnh) console.log(`Copia mejorada (contraste/enfoque), mírala también: ${mejorada}`)
    if (calidad) {
      console.log(`Calidad: ${calidad.nivel.toUpperCase()}  (${calidad.ancho}×${calidad.alto}, nitidez ${calidad.nitidez}, brillo ${calidad.brillo})`)
      for (const b of calidad.banderas) console.log(`  ! ${GUIA_CALIDAD[b] ?? b}`)
    }
    console.log(`Escribe tu transcripción en: ${join(dir, 'transcripcion.md')}`)
    console.log(`Quedan ${pend.length - 1} por procesar.`)
    console.log(`Antes de empezar, ¿leíste ${LEARN}? Contiene correcciones de la persona que supervisa.`)
    break
  }

  case 'actividades': {
    // Solo enunciados: las respuestas esperadas las usa el validador y el agente no debe verlas.
    const filtro = positional.join(' ').toLowerCase()
    const acts = await loadCorpus()
    if (!acts.length) die('La base de actividades está vacía (corpus/actividades).', 3)
    for (const a of acts) {
      const exs = a.exercises.filter((e) => !filtro || `${a.id} ${a.title} ${e.statement}`.toLowerCase().includes(filtro))
      if (!exs.length) continue
      console.log(`\n${a.id} — ${a.title}`)
      for (const e of exs) console.log(`  ${e.ref}: ${e.statement.replace(/\s+/g, ' ').slice(0, 240)}`)
    }
    break
  }

  case 'validar': {
    const { dir } = find(positional[0], [D.en_proceso])
    const v = await validate(dir)
    console.log(`Validación de ${positional[0]}`)
    printLint(v.lint, v.m.doubts)
    console.log(v.lint.errors.length ? '\nRESULTADO: corrige los errores y vuelve a validar.' : '\nRESULTADO: sin errores. Puedes cerrar.')
    process.exit(v.lint.errors.length ? 1 : 0)
    break
  }

  case 'cerrar': {
    const { dir } = find(positional[0], [D.en_proceso])
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
    const target = join(toReview ? D.revision : D.procesadas, id)
    const meta = await readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse).catch(() => ({}))
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
          entrega: meta.entrega ?? '',
          orden: meta.orden,
          calidad: meta.calidad?.nivel ?? null,
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
    const { dir } = find(positional[0], [D.procesadas, D.revision])
    if ((await ls(D.en_proceso)).length) die('Ya hay una hoja en proceso. Ciérrala primero.')
    await rename(dir, join(D.en_proceso, positional[0]))
    console.log(`Reabierta: ${positional[0]}. Edita su transcripcion.md, valida y cierra de nuevo.`)
    break
  }

  case 'aprobar': {
    const { dir } = find(positional[0], [D.procesadas, D.revision])
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

  case 'ensamblar': {
    const entrega = positional[0]
    if (!entrega) die('Uso: pnpm harness ensamblar <entrega> [--orden-original]', 2)
    const r = await ensamblar(entrega, { ordenOriginal: flags.has('--orden-original') })
    console.log(`Entrega "${entrega}": ${r.hojas} hoja(s), ${r.formulas} fórmula(s)`)
    console.log('Orden: ' + r.orden.map((o) => `${o.ej}${o.inciso ? o.inciso : ''}(h${o.hoja})`).join(' → '))
    if (r.faltantes.length) console.log(`Ejercicios de la base que NO aparecen: ${r.faltantes.join(', ')}`)
    if (r.pendientes.por_procesar + r.pendientes.en_proceso) console.log(`Aún pendientes de esta entrega: ${r.pendientes.por_procesar} por procesar, ${r.pendientes.en_proceso} en proceso.`)
    for (const x of r.requierenRevision) console.log(`  ! ${x}`)
    for (const f of r.fallos) console.log(`  ✘ ${f.latex}: ${f.error}`)
    console.log(`Documento: ${join(D.entregas, safeId(entrega), 'documento.docx')}`)
    break
  }

  case 'medir': {
    const rows: { id: string; m: ReturnType<typeof comparePage> }[] = []
    let total = 0
    for (const h of (await listHojas()).filter((x) => x.estado === 'procesadas' || x.estado === 'revision')) {
      total++
      const inf = h.informe as { aprobada?: boolean; metricas?: ReturnType<typeof comparePage> } | null
      if (inf?.aprobada && inf.metricas) rows.push({ id: h.id, m: inf.metricas })
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
    console.log('Uso: pnpm harness <estado|siguiente|actividades [texto]|validar <id>|cerrar <id> [--revision] [--revisado] [--nota "…"]|reabrir <id>|aprobar <id>|ensamblar <entrega> [--orden-original]|medir|aprender "texto">')
    process.exit(cmd ? 2 : 0)
}
