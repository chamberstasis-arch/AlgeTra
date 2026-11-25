// Herramientas locales del agente de transcripción. No llaman a ningún servicio externo.
// Uso: pnpm harness <estado|siguiente|actividades|validar|cerrar|reabrir|aprobar|ensamblar|formato|contrastar|figuras|resolver|depurar|comentarios|atender|medir|aprender> [...]
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { comparePage } from '../src/shared/metrics'
import { runChecks, summarize } from '../server/checks'
import { findExercises, loadCorpus } from '../server/corpus'
import { buildDocx } from '../server/docx'
import { extraerFormato } from '../server/formato'
import { contrastar, estructuraIntercalada, contrastarFiguras, verificarCadena } from '../server/contraste'
import { renderFigure } from '../server/figures'
import { resolver } from '../server/resolver'
import { guardarComentarios, leerComentarios, ubicar } from '../server/comentarios'
import { checkExpectedAnswer } from '../src/shared/linalg'
import { corpusDir } from '../server/corpus'
import { ACT_VECTORES, depurarTexto, isArithmeticError, lintTranscription, revisarFormato, parseMarkers, safeId } from '../server/harness'
import { PRESETS, variarEstilo } from '../src/shared/estilo'
import { D, ROOT, GUIA_CALIDAD, conLock, agruparSueltas, analyzeImage, aprobarHoja, docxHoja, enhanceImage, ensamblar, ensamblarSiCompleta, ensureDirs, ingest, guardarEstilo, leerEstilo, listHojas, ls, natural, normalizarOrientacion, regenerarEntrega } from '../server/workspace'

const LEARN = resolve('harness/APRENDIZAJES.md')
const [cmd, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const opt = (n: string) => {
  const i = rest.indexOf(`--${n}`)
  return i >= 0 ? rest[i + 1] : undefined
}
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--nota', '--entrega', '--preset', '--desde'].includes(rest[i - 1])))
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

/** Toma la siguiente hoja (exclusiva para este agente) y muestra lo que necesita para transcribirla. */
async function tomarSiguiente(desdeCerrar = false): Promise<void> {
  // Varios agentes pueden pedir hoja a la vez: elegir y mover la hoja ocurre bajo un candado, así que nunca
  // dos agentes reciben la misma. El trabajo pesado (calidad, copia mejorada) va fuera del candado.
  const tomada = await conLock(async () => {
    let hojas = await listHojas()
    let pend = hojas.filter((h) => h.estado === 'por_procesar').sort((a, b) => natural(a.entrega, b.entrega) || natural(a.archivo, b.archivo))
    if (!pend.length) return null
    let aviso = ''
    if (!pend[0].entrega) {
      // Fotos sueltas: sin entrega no habría documento final. Se agrupan solas en una entrega con la fecha de hoy.
      const d = new Date()
      const nombre = `entrega-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      const g = await agruparSueltas(nombre)
      aviso = `Las hojas no tenían entrega: se agruparon (${g.movidas}) en la entrega "${g.entrega}" para obtener un solo documento al final.`
      hojas = await listHojas()
      pend = hojas.filter((x) => x.estado === 'por_procesar').sort((a, b) => natural(a.entrega, b.entrega) || natural(a.archivo, b.archivo))
    }
    const h = pend[0]
    const stem = safeId(h.archivo)
    let id = h.entrega ? `${safeId(h.entrega)}__${stem}` : stem
    for (let n = 2; hojas.some((x) => x.estado !== 'por_procesar' && x.id === id); n++) id = `${h.entrega ? safeId(h.entrega) + '__' : ''}${stem}-${n}`
    const orden = hojas.filter((x) => x.entrega === h.entrega && x.estado !== 'por_procesar').length + 1
    const dir = join(D.en_proceso, id)
    await mkdir(dir, { recursive: true })
    const img = join(dir, `imagen${extname(h.archivo).toLowerCase()}`)
    await rename(h.imagen, img)
    // La marca de la hoja se escribe ya, dentro del candado: así la siguiente petición cuenta bien el orden.
    await writeFile(join(dir, 'meta.json'), JSON.stringify({ id, entrega: h.entrega, archivoOriginal: h.archivo, orden, tomadaEn: new Date().toISOString() }, null, 2))
    return { id, dir, img, orden, entrega: h.entrega, archivo: h.archivo, quedan: pend.length - 1, enOtras: hojas.filter((x) => x.estado === 'en_proceso').length, aviso }
  })
  if (!tomada) {
    if (desdeCerrar) return console.log('No quedan hojas por procesar.')
    die('No hay imágenes en por_procesar. Trabajo terminado.', 3)
  }
  const { id, dir, img, orden, entrega, quedan, enOtras, aviso } = tomada!
  if (aviso) console.log(aviso)
  await normalizarOrientacion(img)
  const calidad = await analyzeImage(img)
  const mejorada = join(dir, 'imagen_mejorada.jpg')
  const hasEnh = (await enhanceImage(img, mejorada)) && !!calidad?.banderas.length
  const meta = await readFile(join(dir, 'meta.json'), 'utf8').then(JSON.parse)
  await writeFile(join(dir, 'meta.json'), JSON.stringify({ ...meta, calidad }, null, 2))
  console.log(`Hoja tomada: ${id}${entrega ? `   (entrega "${entrega}", hoja ${orden})` : ''}`)
  console.log(`Imagen para mirar: ${img}`)
  if (hasEnh) console.log(`Copia mejorada (contraste/enfoque), mírala también: ${mejorada}`)
  if (calidad) {
    console.log(`Calidad: ${calidad.nivel.toUpperCase()}  (${calidad.ancho}×${calidad.alto}, nitidez ${calidad.nitidez}, brillo ${calidad.brillo})`)
    for (const b of calidad.banderas) console.log(`  ! ${GUIA_CALIDAD[b] ?? b}`)
  }
  console.log(`Escribe tu transcripción en: ${join(dir, 'transcripcion.md')}`)
  console.log(`Quedan ${quedan} por procesar${enOtras ? ` (y hay ${enOtras} en proceso por otros agentes: no las toques)` : ''}.`)
  console.log(`Cuando termines, ciérrala por su id: pnpm harness cerrar ${id}`)
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
    await tomarSiguiente()
    break
  }

  case 'importar': {
    // pnpm harness importar <archivo|carpeta>... [--entrega nombre]   (imágenes, PDF, DOCX o ZIP con ellos)
    const entrega = opt('entrega') ?? ''
    const rutas = positional.filter((x) => x !== entrega)
    if (!rutas.length) die('Uso: pnpm harness importar <archivo.zip|.pdf|imagen>... [--entrega nombre]', 2)
    let n = 0
    for (const r of rutas) {
      if (!existsSync(r)) { console.log(`  ✘ ${r}: no existe`); continue }
      const res = await ingest(basename(r), await readFile(r), entrega)
      n += res.guardadas.length
      for (const a of res.avisos) console.log(`  ⚠ ${a}`)
    }
    console.log(`${n} imagen(es) en por_procesar${entrega ? ` (entrega "${entrega}")` : ''}.`)
    break
  }

  case 'agrupar': {
    // pnpm harness agrupar <entrega>   — pasa las fotos sueltas de por_procesar a esa entrega
    if (!positional[0]) die('Uso: pnpm harness agrupar <nombre-de-entrega>', 2)
    const g = await agruparSueltas(positional[0])
    console.log(`${g.movidas} imagen(es) movidas a la entrega "${g.entrega}".`)
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
    const docx = await docxHoja(dir, id, meta.entrega ?? '')
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
    const completa = await conLock(() => ensamblarSiCompleta(meta.entrega ?? ''))
    if (completa) {
      console.log(`\nEntrega "${completa.entrega}" completa: ${completa.hojas} hoja(s) ensambladas en un solo documento, por actividad.`)
      console.log(`Documento: ${join(D.entregas, safeId(completa.entrega), 'documento.docx')}`)
      for (const x of completa.requierenRevision) console.log(`  ! ${x}`)
    }
    if (flags.has('--siguiente')) {
      console.log('\n──────── Siguiente hoja ────────')
      await tomarSiguiente(true)
    }
    break
  }

  case 'reabrir': {
    const { dir } = find(positional[0], [D.procesadas, D.revision])
    await rename(dir, join(D.en_proceso, positional[0]))
    console.log(`Reabierta: ${positional[0]}. Edita su transcripcion.md, valida y cierra de nuevo.`)
    break
  }

  case 'aprobar': {
    const { dir } = find(positional[0], [D.procesadas, D.revision])
    const informe = await aprobarHoja(dir, positional[0])
    const m = informe.metricas
    console.log(`Aprobada: ${positional[0]} · fórmulas exactas ${m.equations.exact}/${m.equations.total} · error de tokens ${(m.mathTokenErrorRate * 100).toFixed(1)} % · ${m.unchanged ? 'sin correcciones' : 'corregida por la persona'}`)
    console.log('DOCX regenerado con tu versión.')
    break
  }

  case 'estilo': {
    // pnpm harness estilo <entrega> [--preset nombre | --variar [semilla]]   (sin opciones: muestra el estilo actual)
    const entrega = positional[0]
    if (!entrega) die(`Uso: pnpm harness estilo <entrega> [--preset ${Object.keys(PRESETS).join('|')} | --variar [semilla] | --desde ejemplo.docx|.pdf]`, 2)
    const preset = opt('preset')
    const desde = opt('desde')
    if (desde) {
      if (!existsSync(desde)) die(`No existe el archivo de ejemplo: ${desde}`)
      const r = await extraerFormato(basename(desde), await readFile(desde)).catch((e) => die(e.message))
      console.log(`Leído de ${basename(desde)} (${r.origen}):\n` + r.detectado.map((x) => `  · ${x}`).join('\n'))
      if (r.incierto.length) console.log('No se pudo asegurar:\n' + r.incierto.map((x) => `  ? ${x}`).join('\n'))
      await guardarEstilo(entrega, { ...r.estilo, nombre: `ejemplo ${safeId(basename(desde)).slice(0, 24)}` })
    } else if (preset) {
      if (!PRESETS[preset]) die(`Preset desconocido. Opciones: ${Object.keys(PRESETS).join(', ')}.`)
      await guardarEstilo(entrega, PRESETS[preset])
    } else if (flags.has('--variar')) {
      const semilla = positional[1] ?? entrega
      await guardarEstilo(entrega, variarEstilo(semilla))
    }
    const e = await leerEstilo(entrega)
    console.log(JSON.stringify(e, null, 2))
    if (preset || desde || flags.has('--variar')) {
      const r = await regenerarEntrega(entrega)
      console.log(r ? `Documentos regenerados (${r.hojas} hoja(s)); no se volvió a procesar nada.` : 'Estilo guardado. Se aplicará al ensamblar la entrega.')
    }
    break
  }

  case 'comentarios': {
    // pnpm harness comentarios <entrega|id>: comentarios pendientes que dejó la persona en la revisión por renglones.
    // El agente atiende SOLO esos renglones (mira la foto ahí), edita la transcripción y marca `atender`.
    if (!positional[0]) die('Uso: pnpm harness comentarios <entrega|id>', 2)
    const hojas = (await listHojas()).filter((h) => h.dir && (h.entrega === positional[0] || h.id === positional[0]))
    let pend = 0
    for (const h of hojas) {
      const lista = (await leerComentarios(h.dir!)).filter((c) => c.estado === 'pendiente')
      if (!lista.length) continue
      const lineas = (await readFile(join(h.dir!, 'transcripcion.md'), 'utf8').catch(() => '')).split('\n')
      pend += lista.length
      console.log(`\n${h.id}  (${h.estado})  carpeta: ${h.dir}`)
      for (const c of lista) {
        const l = ubicar(c, lineas)
        console.log(`  #${c.id} renglón ${l}: ${(lineas[l - 1] ?? '').trim().slice(0, 110)}\n      → ${c.texto}`)
      }
    }
    console.log(pend ? `\n${pend} comentario(s) pendiente(s). Tras atender cada uno: pnpm harness atender <id> <n|todos> [--nota "qué hiciste"] y luego pnpm harness cerrar <id>.` : 'Sin comentarios pendientes.')
    break
  }

  case 'atender': {
    // pnpm harness atender <id> <n,n|todos> [--nota "…"]: marca comentarios como resueltos.
    const h = (await listHojas()).find((x) => x.id === positional[0] && x.dir)
    if (!h || !positional[1]) die('Uso: pnpm harness atender <id> <n,n|todos> [--nota "…"]', 2)
    const lista = await leerComentarios(h!.dir!)
    const ids = positional[1] === 'todos' ? lista.map((c) => c.id) : positional[1].split(',').map(Number)
    const nota = rest[rest.indexOf('--nota') + 1]
    let n = 0
    for (const c of lista) if (ids.includes(c.id) && c.estado === 'pendiente') (c.estado = 'resuelto'), (c.respuesta = flags.has('--nota') ? nota : c.respuesta), n++
    await guardarComentarios(h!.dir!, lista)
    console.log(`${n} comentario(s) marcados como resueltos en ${h!.id}.`)
    break
  }

  case 'depurar': {
    // pnpm harness depurar <entrega> [--aplicar]: sumas a dos pisos → bloque aux (fuera del documento) y vectores
    // unitarios i, j, k en negrita recta. Sin --aplicar solo cuenta lo que cambiaría.
    if (!positional[0]) die('Uso: pnpm harness depurar <entrega> [--aplicar]', 2)
    const hojas = (await listHojas()).filter((h) => h.entrega === positional[0] && (h.estado === 'procesadas' || h.estado === 'revision') && h.dir)
    let cambiadas = 0
    for (const h of hojas) {
      const f = join(h.dir!, 'transcripcion.md')
      const antes = await readFile(f, 'utf8')
      const acts = [...antes.matchAll(/ejercicio:\s*act-(\d+)/g)].map((m) => Number(m[1]))
      const vect = acts.length > 0 && acts.every((a) => ACT_VECTORES.has(a))
      const despues = depurarTexto(antes, { unitarios: vect })
      if (despues === antes) continue
      cambiadas++
      const aux = (despues.match(/```aux/g) ?? []).length - (antes.match(/```aux/g) ?? []).length
      console.log(`  ${h.id.replace(/^.*__/, '')}: ${aux ? `${aux} suma(s) auxiliar(es) apartada(s)` : ''}${aux && vect ? '; ' : ''}${vect ? 'vectores unitarios normalizados' : ''}`)
      if (flags.has('--aplicar')) {
        await writeFile(join(h.dir!, 'transcripcion.antes-de-depurar.md'), antes)
        await writeFile(f, despues)
      }
    }
    if (flags.has('--aplicar') && cambiadas) {
      await regenerarEntrega(positional[0])
      console.log(`Aplicado a ${cambiadas} hoja(s); documentos regenerados.`)
    } else console.log(`${cambiadas} hoja(s) cambiarían.${cambiadas ? ' Usa --aplicar para escribirlo.' : ''}`)
    break
  }

  case 'resolver': {
    // pnpm harness resolver [--escribir]: resuelve todos los ejercicios de la base con los métodos del curso.
    // Con --escribir añade "**Respuesta:**" a cada ejercicio (así el verificador compara resultados finales) y deja el
    // procedimiento en corpus/soluciones/. Estas respuestas NO se muestran a quien transcribe.
    const { readdir } = await import('node:fs/promises')
    const acts = await loadCorpus()
    let n = 0
    let sin = 0
    for (const a of acts) {
      const file = join(corpusDir, a.file)
      let src = await readFile(file, 'utf8')
      const sol: string[] = [`# ${a.id} — ${a.title}`, '', 'Resolución de referencia (no mostrar a quien transcribe).', '']
      for (const e of a.exercises) {
        const s = resolver(a.id, e.number, e.statement)
        if (!s) { sin++; console.log(`  sin solución: ${e.ref}`); continue }
        n++
        let texto = s.respuesta.replace(/\$\$?/g, '')
        if (s.formulas.some((f) => texto.trim() === f)) texto = ''
        const bloque = `**Respuesta:** ${texto}${s.formulas.length ? '\n' + s.formulas.map((f) => `$$${f}$$`).join('\n') : ''}`
        sol.push(`## Ejercicio ${e.number}`, '', ...s.procedimiento.map((p) => `$$${p}$$`), '', bloque, '')
        const re = new RegExp(`(## Ejercicio ${e.number}\\s*\\n[\\s\\S]*?)(?:\\n\\s*\\*\\*Respuestas?:\\*\\*[\\s\\S]*?)?(?=\\n## Ejercicio |$)`)
        src = src.replace(re, (_m, enun: string) => `${enun.replace(/\s+$/, '')}\n\n${bloque}\n`)
      }
      if (flags.has('--escribir')) {
        await writeFile(file, src.replace(/\n+$/, '\n'))
        await mkdir(join(corpusDir, '..', 'soluciones'), { recursive: true })
        await writeFile(join(corpusDir, '..', 'soluciones', a.file), sol.join('\n') + '\n')
      }
    }
    void readdir
    console.log(`${n} ejercicio(s) resueltos, ${sin} sin solución.${flags.has('--escribir') ? ' Escrito en corpus/actividades y corpus/soluciones.' : ' (vista previa; usa --escribir para guardar)'}`)
    break
  }

  case 'contrastar': {
    // pnpm harness contrastar <entrega>: lista de trabajo para la revisión contra el enunciado (sin mirar fotos).
    // Agrupa las hojas por actividad, así una matriz o un punto que está en otra hoja de la misma actividad no da falso aviso.
    if (!positional[0]) die('Uso: pnpm harness contrastar <entrega>', 2)
    const hojas = (await listHojas()).filter((h) => h.entrega === positional[0] && (h.estado === 'procesadas' || h.estado === 'revision') && h.dir)
    if (!hojas.length) die(`No hay hojas cerradas de la entrega "${positional[0]}".`)
    const porAct = new Map<string, { ids: string[]; refs: Set<string>; texto: string }>()
    const lista: { id: string; texto: string; refs: string[] }[] = []
    for (const h of hojas) {
      const texto = await readFile(join(h.dir!, 'transcripcion.md'), 'utf8')
      const refs = parseMarkers(texto).refs
      lista.push({ id: h.id, texto, refs })
      for (const a of new Set(refs.map((r) => r.split('/')[0]))) {
        const g = porAct.get(a) ?? { ids: [], refs: new Set<string>(), texto: '' }
        g.ids.push(h.id.replace(/^.*__/, ''))
        refs.filter((r) => r.startsWith(a + '/')).forEach((r) => g.refs.add(r))
        g.texto += '\n' + texto
        porAct.set(a, g)
      }
    }
    let total = 0
    const porHoja = new Map<string, Set<string>>()
    const marca = (id: string, motivo: string) => porHoja.set(id, (porHoja.get(id) ?? new Set()).add(motivo))
    for (const [a, g] of [...porAct].sort((x, y) => natural(x[0], y[0]))) {
      const ex = await findExercises([...g.refs])
      const res = contrastar(g.texto, ex).filter((r) => r.problemas.length)
      if (!res.length) continue
      total += res.length
      for (const id of g.ids) marca(id, 'datos del enunciado')
      console.log(`\n${a}  (hojas ${g.ids.join(', ')})`)
      for (const r of res) for (const pr of r.problemas) console.log(`  ✘ ${r.ref}: ${pr}`)
    }
    console.log('\n── Operaciones entre renglones (cada matriz debe seguir de la anterior) ──')
    for (const l of lista) {
      const v = verificarCadena(l.texto)
      if (!v.length) continue
      total += v.length
      marca(l.id.replace(/^.*__/, ''), 'operaciones')
      console.log(`\n${l.id.replace(/^.*__/, '')}`)
      for (const x of v) console.log(`  ✘ ${x}`)
    }
    console.log('\n── Estructura (columnas o pasos intercalados en un mismo renglón) ──')
    for (const l of lista) {
      const e = estructuraIntercalada(l.texto)
      if (!e.length) continue
      total += e.length
      marca(l.id.replace(/^.*__/, ''), 'estructura')
      console.log(`\n${l.id.replace(/^.*__/, '')}`)
      for (const x of e) console.log(`  ! ${x}`)
    }
    console.log('\n── Resultado final (sin mostrar el valor esperado; se compara con la resolución de referencia) ──')
    const estados = { found: 0, mismatch: 0, 'not-found': 0, unverifiable: 0 }
    for (const [a, g] of [...porAct].sort((x, y) => natural(x[0], y[0]))) {
      for (const e of await findExercises([...g.refs])) {
        const st = summarize(e.answers.map((r) => checkExpectedAnswer(r, g.texto).status))
        estados[st]++
        if (st !== 'mismatch' && st !== 'not-found') continue
        total++
        const donde = lista.filter((l) => l.refs.includes(e.ref)).map((l) => l.id.replace(/^.*__/, ''))
        donde.forEach((id) => marca(id, 'resultado final'))
        console.log(`  ${st === 'mismatch' ? '✘' : '!'} ${e.ref} (hoja ${donde.join(', ')}): ${st === 'mismatch' ? 'hay un valor parecido pero distinto del esperado; revisa dígitos y signos del resultado' : 'no aparece el resultado esperado; revisa si falta el resultado o está mal leído'}`)
      }
    }
    console.log(`  (coinciden ${estados.found}, distintos ${estados.mismatch}, no encontrados ${estados['not-found']}, sin verificar ${estados.unverifiable}; un resultado distinto puede ser error del alumno: la foto manda)`)
    console.log('\n── Figuras y flechas ──')
    for (const l of lista) {
      const hay = (l.texto.match(/```grafica/g) ?? []).length
      if (hay) marca(l.id.replace(/^.*__/, ''), `${hay} figura(s)`)
      const f = contrastarFiguras(l.texto)
      if (!f.length) continue
      total += f.length
      console.log(`\n${l.id.replace(/^.*__/, '')}`)
      for (const x of f) console.log(`  ! ${x}`)
    }
    console.log('\n── Hojas a revisar ──')
    for (const [id, m] of [...porHoja].sort((x, y) => natural(x[0], y[0]))) console.log(`  ${id}  [${[...m].join(', ')}]`)
    console.log(`\n${total} observación(es) en ${porHoja.size} hoja(s). Cada una dice dónde volver a mirar la foto; ninguna se corrige sola.`)
    break
  }

  case 'figuras': {
    // pnpm harness figuras <id>: dibuja las figuras de la hoja como PNG para compararlas con la foto.
    const { dir } = find(positional[0], [D.en_proceso, D.procesadas, D.revision])
    const texto = await readFile(join(dir, 'transcripcion.md'), 'utf8')
    await mkdir(join(dir, 'figuras'), { recursive: true })
    let n = 0
    for (const m of texto.matchAll(/```grafica\s*\n([\s\S]*?)```/g)) {
      n++
      const r = renderFigure(m[1])
      if (!r.ok) { console.log(`Figura ${n}: ${r.error}`); continue }
      const out = join(dir, 'figuras', `figura-${String(n).padStart(2, '0')}.png`)
      await writeFile(out, r.png)
      console.log(`Figura ${n}: ${out}`)
    }
    if (!n) console.log('La hoja no tiene figuras dibujadas.')
    break
  }

  case 'formato': {
    // pnpm harness formato <entrega>: revisión de formato del documento ensamblado (solo texto).
    if (!positional[0]) die('Uso: pnpm harness formato <entrega>', 2)
    const f = join(D.entregas, safeId(positional[0]), 'ensamblado.md')
    if (!existsSync(f)) die(`No hay documento ensamblado de "${positional[0]}". Ejecuta: pnpm harness ensamblar ${positional[0]}`)
    const probs = revisarFormato(await readFile(f, 'utf8'))
    console.log(probs.length ? probs.map((x) => `  ! ${x}`).join('\n') : 'Formato sin observaciones.')
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
    console.log('Uso: pnpm harness <estado|siguiente|actividades [texto]|importar <zip|pdf|img>... [--entrega n]|agrupar <entrega>|validar <id>|cerrar <id> [--revision] [--revisado] [--nota "…"]|reabrir <id>|aprobar <id>|estilo <entrega> [--preset p|--variar [semilla]|--desde ejemplo.docx|pdf]|ensamblar <entrega> [--orden-original]|medir|aprender "texto">')
    process.exit(cmd ? 2 : 0)
}
