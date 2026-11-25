// Extrae los «tokens de diseño» de un documento de ejemplo (DOCX o PDF) para proponer un Estilo.
//
// Es DETERMINISTA y no usa ningún modelo: un ejemplo hecho por una IA (p. ej. exportado de Gemini) suele traer
// formato directo, fuentes sueltas y cosas inconsistentes, así que nunca se toma el primer valor que aparece: cada
// token es el valor MÁS FRECUENTE ponderado por cantidad de texto, y lo que no se puede asegurar se reporta como
// incierto en vez de inventarse. La propuesta no se guarda sola: la persona la ve, la ajusta y la aplica.
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { DOMParser } from '@xmldom/xmldom'
import JSZip from 'jszip'
import { FUENTES, PRESETS, normalizarEstilo, type Estilo } from '../src/shared/estilo'

const run = promisify(execFile)

export interface PropuestaFormato {
  estilo: Estilo
  /** Lo que se pudo leer del ejemplo, en lenguaje llano. */
  detectado: string[]
  /** Lo que no se pudo asegurar (se dejó el valor por defecto). */
  incierto: string[]
  origen: string
}

// ───────── Utilidades ─────────

/** Valor más frecuente de un conjunto ponderado. */
function moda<T>(pesos: Map<T, number>): { valor: T; share: number } | null {
  let best: T | null = null
  let bw = 0
  let total = 0
  for (const [k, w] of pesos) {
    total += w
    if (w > bw) {
      best = k
      bw = w
    }
  }
  return best === null ? null : { valor: best, share: bw / total }
}
const suma = <T>(m: Map<T, number>, k: T, w: number) => m.set(k, (m.get(k) ?? 0) + w)

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Equivalencias de fuentes de sustitución o de la web con las que admitimos. */
const ALIAS: Record<string, (typeof FUENTES)[number]> = {
  liberationserif: 'Times New Roman', times: 'Times New Roman', timesnewromanps: 'Times New Roman', tinos: 'Times New Roman', nimbusroman: 'Times New Roman',
  liberationsans: 'Arial', helvetica: 'Arial', arimo: 'Arial', nimbussans: 'Arial', googlesans: 'Arial', productsans: 'Arial', roboto: 'Arial', opensans: 'Arial', inter: 'Arial', segoeui: 'Arial', lato: 'Arial',
  notosans: 'Arial', notoserif: 'Times New Roman', carlito: 'Calibri', calibrilight: 'Calibri', caladea: 'Cambria', gelasio: 'Georgia', dejavusans: 'Verdana', bitstreamverasans: 'Verdana',
  cambriamath: 'Cambria', palatino: 'Palatino Linotype', bookantiquaps: 'Book Antiqua', garamondpremrpro: 'Garamond',
}
const SERIF_HINT = /serif|garamond|palatino|bookman|minion|baskerville|didot|century|schoolbook|antiqua|times|cambria|georgia|merriweather/i

/** Fuente admitida más cercana a la del ejemplo. */
export function fuenteCercana(nombre: string): { fuente: string; exacta: boolean } {
  const limpio = nombre.replace(/^[A-Z]{6}\+/, '').replace(/[-,](Bold|Italic|Oblique|Regular|BoldItalic|Light|Medium|Semibold).*$/i, '').trim()
  const exacta = FUENTES.find((f) => norm(f) === norm(limpio))
  if (exacta) return { fuente: exacta, exacta: true }
  const alias = ALIAS[norm(limpio)]
  if (alias) return { fuente: alias, exacta: norm(alias) === norm(limpio) }
  const serif = SERIF_HINT.test(limpio) && !/sans/i.test(limpio)
  return { fuente: serif ? 'Times New Roman' : 'Calibri', exacta: false }
}

const PAPELES = (w: number, h: number): 'A4' | 'Carta' | null => {
  const [a, b] = w < h ? [w, h] : [h, w]
  if (Math.abs(a - 595) < 20 && Math.abs(b - 842) < 25) return 'A4'
  if (Math.abs(a - 612) < 20 && Math.abs(b - 792) < 25) return 'Carta'
  return null
}

const cm = (pt: number) => Math.round((pt / 28.3465) * 10) / 10
const espaciadoDe = (despuesPt: number): Estilo['espaciado'] => (despuesPt < 2.25 ? 'compacto' : despuesPt >= 4 ? 'amplio' : 'normal')

// ───────── DOCX ─────────

type El = Element
const kids = (e: El, tag: string): El[] => Array.from(e.childNodes as unknown as ArrayLike<Node>).filter((n): n is El => n.nodeType === 1 && (n as El).tagName === tag)
const kid = (e: El | null | undefined, tag: string): El | null => (e ? kids(e, tag)[0] ?? null : null)
const attr = (e: El | null | undefined, name: string): string | null => (e && e.getAttribute(name)) || null
const all = (e: Document | El, tag: string): El[] => Array.from(e.getElementsByTagName(tag) as unknown as ArrayLike<El>)

interface PropsRun {
  fuente?: string
  sz?: number
  color?: string
  negrita?: boolean
}
interface PropsPar {
  jc?: string
  line?: number
  lineRule?: string
  after?: number
  before?: number
}

function leerRpr(rpr: El | null, tema: Record<string, string>): PropsRun {
  if (!rpr) return {}
  const f = kid(rpr, 'w:rFonts')
  let fuente = attr(f, 'w:ascii') ?? attr(f, 'w:hAnsi') ?? undefined
  const th = attr(f, 'w:asciiTheme') ?? attr(f, 'w:hAnsiTheme')
  if (!fuente && th) fuente = tema[/major/i.test(th) ? 'major' : 'minor']
  const sz = attr(kid(rpr, 'w:sz'), 'w:val')
  const color = attr(kid(rpr, 'w:color'), 'w:val')
  const b = kid(rpr, 'w:b')
  return {
    ...(fuente ? { fuente } : {}),
    ...(sz ? { sz: Number(sz) / 2 } : {}),
    ...(color && color !== 'auto' ? { color: color.toUpperCase() } : {}),
    ...(b ? { negrita: attr(b, 'w:val') !== '0' && attr(b, 'w:val') !== 'false' } : {}),
  }
}
function leerPpr(ppr: El | null): PropsPar {
  if (!ppr) return {}
  const sp = kid(ppr, 'w:spacing')
  const out: PropsPar = {}
  const jc = attr(kid(ppr, 'w:jc'), 'w:val')
  if (jc) out.jc = jc
  if (sp) {
    // Solo lo que el párrafo dice explícitamente: lo demás se hereda del estilo.
    const line = attr(sp, 'w:line')
    const after = attr(sp, 'w:after')
    const before = attr(sp, 'w:before')
    if (line !== null) {
      out.line = Number(line)
      out.lineRule = attr(sp, 'w:lineRule') ?? 'auto'
    }
    if (after !== null) out.after = Number(after)
    if (before !== null) out.before = Number(before)
  }
  return out
}

export async function extraerDeDocx(data: Buffer): Promise<PropuestaFormato> {
  const zip = await JSZip.loadAsync(data)
  const texto = async (n: string) => (await zip.file(n)?.async('string')) ?? ''
  const parse = (xml: string) => new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document
  const docXml = await texto('word/document.xml')
  if (!docXml) throw new Error('No parece un DOCX válido (falta word/document.xml).')
  const doc = parse(docXml)
  const sty = parse((await texto('word/styles.xml')) || '<w:styles xmlns:w="x"/>')
  const themeXml = await texto('word/theme/theme1.xml')
  const tema: Record<string, string> = {}
  if (themeXml) {
    tema.major = /<a:majorFont>\s*<a:latin typeface="([^"]*)"/.exec(themeXml)?.[1] ?? ''
    tema.minor = /<a:minorFont>\s*<a:latin typeface="([^"]*)"/.exec(themeXml)?.[1] ?? ''
  }

  // Estilos y valores por defecto del documento.
  const defaults = kid(sty.documentElement, 'w:docDefaults')
  const defR = leerRpr(kid(kid(defaults, 'w:rPrDefault'), 'w:rPr'), tema)
  const defP = leerPpr(kid(kid(defaults, 'w:pPrDefault'), 'w:pPr'))
  const estilos = new Map<string, { nombre: string; base: string | null; r: PropsRun; p: PropsPar }>()
  for (const s of all(sty, 'w:style')) {
    if (attr(s, 'w:type') !== 'paragraph') continue
    estilos.set(attr(s, 'w:styleId') ?? '', {
      nombre: attr(kid(s, 'w:name'), 'w:val') ?? '',
      base: attr(kid(s, 'w:basedOn'), 'w:val'),
      r: leerRpr(kid(s, 'w:rPr'), tema),
      p: leerPpr(kid(s, 'w:pPr')),
    })
  }
  const defaultStyle = [...all(sty, 'w:style')].find((s) => attr(s, 'w:default') === '1' && attr(s, 'w:type') === 'paragraph')
  const idNormal = attr(defaultStyle ?? null, 'w:styleId') ?? 'Normal'
  const resolver = (id: string | null) => {
    const cadena: string[] = []
    for (let cur = id ?? idNormal, i = 0; cur && estilos.has(cur) && i < 10; cur = estilos.get(cur)!.base ?? '', i++) cadena.unshift(cur)
    let r: PropsRun = { ...defR }
    let p: PropsPar = { ...defP }
    for (const c of cadena) {
      r = { ...r, ...estilos.get(c)!.r }
      p = { ...p, ...estilos.get(c)!.p }
    }
    return { r, p, nombre: estilos.get(id ?? idNormal)?.nombre ?? '' }
  }

  const fuentes = new Map<string, number>()
  const tamanos = new Map<number, number>()
  const jcs = new Map<string, number>()
  const lineas = new Map<number, number>()
  const despues = new Map<number, number>()
  const colores = new Map<string, number>()
  let eqCentro = 0
  let eqIzq = 0
  let eqTotal = 0
  let encabezados = 0
  let encabezadosConSalto = 0
  let parrafosTexto = 0
  let formulasComoTexto = 0
  const body = kid(doc.documentElement, 'w:body')
  const pars = body ? all(body, 'w:p') : []
  let saltoPrevio = false
  for (const p of pars) {
    const ppr = kid(p, 'w:pPr')
    const idEstilo = attr(kid(ppr, 'w:pStyle'), 'w:val')
    const { r: rEst, p: pEst, nombre } = resolver(idEstilo)
    const pp = { ...pEst, ...leerPpr(ppr) }
    const esTitulo = /^(heading|t[ií]tulo|title|subtitle|subt[ií]tulo)/i.test(nombre) || kid(ppr, 'w:outlineLvl') !== null
    const runs = kids(p, 'w:r')
    const textoP = runs.map((r) => all(r, 'w:t').map((t) => t.textContent ?? '').join('')).join('')
    const conSalto = kid(ppr, 'w:pageBreakBefore') !== null || runs.some((r) => all(r, 'w:br').some((b) => attr(b, 'w:type') === 'page'))

    if (all(p, 'm:oMathPara').length) {
      eqTotal++
      const j = attr(kid(kid(all(p, 'm:oMathPara')[0], 'm:oMathParaPr'), 'm:jc'), 'm:val') ?? attr(kid(ppr, 'w:jc'), 'w:val') ?? 'center'
      if (j === 'left') eqIzq++
      else eqCentro++
    }
    if (esTitulo) {
      encabezados++
      if (conSalto || saltoPrevio) encabezadosConSalto++
      for (const r of runs) {
        const c = { ...rEst, ...leerRpr(kid(r, 'w:rPr'), tema) }.color
        if (c) suma(colores, c, Math.max(1, (r.textContent ?? '').length))
      }
    } else if (textoP.trim().length >= 3) {
      parrafosTexto++
      if (/\\(frac|sqrt|begin|vec)\b|\$\$?[^$]+\$\$?/.test(textoP)) formulasComoTexto++
      const peso = textoP.length
      if (pp.jc) suma(jcs, pp.jc, peso)
      else suma(jcs, 'left', peso)
      if (pp.line && (pp.lineRule ?? 'auto') === 'auto') suma(lineas, Math.round((pp.line / 240) * 20) / 20, peso)
      suma(despues, pp.after ?? 0, peso)
      for (const r of runs) {
        const t = all(r, 'w:t').map((x) => x.textContent ?? '').join('')
        if (!t.trim()) continue
        const props = { ...rEst, ...leerRpr(kid(r, 'w:rPr'), tema) }
        if (props.fuente) suma(fuentes, props.fuente, t.length)
        if (props.sz) suma(tamanos, props.sz, t.length)
      }
    }
    saltoPrevio = textoP.trim() === '' && conSalto
  }

  const detectado: string[] = []
  const incierto: string[] = []
  const e: Record<string, unknown> = { nombre: 'ejemplo' }

  const f = moda(fuentes)
  if (f) {
    const c = fuenteCercana(f.valor)
    e.fuente = c.fuente
    detectado.push(c.exacta ? `Tipografía: ${c.fuente}` : `Tipografía del ejemplo: ${f.valor} (no está entre las admitidas; se usa ${c.fuente}, la más parecida)`)
    if (f.share < 0.7) incierto.push(`El ejemplo mezcla tipografías (${[...fuentes.keys()].slice(0, 4).join(', ')}); se tomó la más usada (${Math.round(f.share * 100)} % del texto).`)
  } else incierto.push('No se encontró la tipografía del texto.')
  const t = moda(tamanos)
  if (t) {
    e.tamano = t.valor
    detectado.push(`Tamaño de texto: ${t.valor} pt`)
  } else incierto.push('No se encontró el tamaño del texto.')
  const l = moda(lineas)
  if (l) {
    e.interlineado = l.valor
    detectado.push(`Interlineado: ${l.valor}`)
  } else incierto.push('No se encontró el interlineado (se deja el predeterminado).')
  const d = moda(despues)
  if (d) {
    e.espaciado = espaciadoDe(d.valor / 20)
    detectado.push(`Espacio entre párrafos: ${d.valor / 20} pt (${e.espaciado})`)
  }
  const j = moda(jcs)
  if (j) {
    e.alinear = j.valor === 'both' || j.valor === 'distribute' ? 'justificado' : 'izquierda'
    detectado.push(`Alineación del texto: ${e.alinear}`)
  }
  const col = moda(colores)
  if (col) {
    e.colorTitulos = col.valor
    detectado.push(`Color de títulos: #${col.valor}`)
  } else if (encabezados) detectado.push('Títulos en negro / color automático')
  if (eqTotal) {
    e.ecuaciones = eqIzq > eqCentro ? 'izquierda' : 'centradas'
    detectado.push(`Ecuaciones ${e.ecuaciones === 'izquierda' ? 'a la izquierda' : 'centradas'}`)
  } else {
    incierto.push(
      formulasComoTexto > 2
        ? 'Las ecuaciones del ejemplo están escritas como texto, no como ecuaciones de Word: no se puede leer su alineación (los documentos de AlgeTra sí las llevan nativas).'
        : 'El ejemplo no trae ecuaciones de Word: no se puede leer su alineación.',
    )
  }
  if (encabezados >= 2) {
    e.saltoActividad = encabezadosConSalto / (encabezados - 1) >= 0.5
    detectado.push(e.saltoActividad ? 'Cada título empieza en hoja nueva' : 'Los títulos siguen a continuación (sin salto de hoja)')
  }

  const sect = all(doc, 'w:sectPr').pop()
  const pgSz = kid(sect, 'w:pgSz')
  const pgMar = kid(sect, 'w:pgMar')
  if (pgSz) {
    const p = PAPELES(Number(attr(pgSz, 'w:w')) / 20, Number(attr(pgSz, 'w:h')) / 20)
    if (p) {
      e.papel = p
      detectado.push(`Papel: ${p}`)
    } else incierto.push('Tamaño de papel poco común: se deja A4.')
  }
  if (pgMar) {
    const lados = ['w:left', 'w:right', 'w:top', 'w:bottom'].map((a) => Number(attr(pgMar, a)) / 20).filter((x) => x > 0)
    if (lados.length) {
      e.margenCm = cm(lados.reduce((a, b) => a + b, 0) / lados.length)
      detectado.push(`Márgenes: ${e.margenCm} cm`)
      if (Math.max(...lados) - Math.min(...lados) > 20) incierto.push('Los márgenes del ejemplo son distintos entre sí; AlgeTra usa uno igual en los cuatro lados (se promedió).')
    }
  }
  const pies = await Promise.all(Object.keys(zip.files).filter((n) => /^word\/footer\d*\.xml$/.test(n)).map(texto))
  e.numeracion = pies.some((x) => /\bPAGE\b/.test(x))
  detectado.push(e.numeracion ? 'Número de página al pie' : 'Sin número de página')

  return { estilo: normalizarEstilo({ ...PRESETS.limpio, ...e }), detectado, incierto, origen: 'DOCX' }
}

// ───────── PDF ─────────

interface Frag {
  top: number
  left: number
  width: number
  height: number
  font: string
  len: number
  page: number
}

export async function extraerDePdf(data: Buffer): Promise<PropuestaFormato> {
  const dir = await mkdtemp(join(tmpdir(), 'algetra-fmt-'))
  try {
    const pdf = join(dir, 'e.pdf')
    await writeFile(pdf, data)
    const { stdout } = await run('pdftohtml', ['-xml', '-zoom', '1', '-i', '-l', '12', '-stdout', pdf], { maxBuffer: 64 * 1024 * 1024, timeout: 60_000 })
    const xml = new DOMParser({ onError: () => {} }).parseFromString(stdout, 'text/xml') as unknown as Document
    const paginas = all(xml, 'page')
    if (!paginas.length) throw new Error('No se pudo leer el PDF.')
    const specs = new Map<string, { size: number; family: string; color: string }>()
    for (const p of paginas) for (const s of all(p, 'fontspec')) specs.set(attr(s, 'id')!, { size: Number(attr(s, 'size')), family: attr(s, 'family') ?? '', color: (attr(s, 'color') ?? '#000000').toUpperCase() })
    const frags: Frag[] = []
    const dims = new Map<number, { w: number; h: number }>()
    for (const p of paginas) {
      const n = Number(attr(p, 'number'))
      const w = Number(attr(p, 'width'))
      const h = Number(attr(p, 'height'))
      dims.set(n, { w, h })
      for (const t of all(p, 'text')) {
        const len = (t.textContent ?? '').replace(/\s+/g, '').length
        if (!len) continue
        frags.push({ top: Number(attr(t, 'top')), left: Number(attr(t, 'left')), width: Number(attr(t, 'width')), height: Number(attr(t, 'height')), font: attr(t, 'font')!, len, page: n })
      }
    }
    const detectado: string[] = []
    const incierto: string[] = []
    const e: Record<string, unknown> = { nombre: 'ejemplo' }

    // Texto de cuerpo = la tipografía+tamaño con más caracteres (se ignoran fuentes de símbolos).
    const pesos = new Map<string, number>()
    for (const f of frags) {
      const s = specs.get(f.font)
      if (!s || /symbol|math|cmsy|cmmi|cmex/i.test(s.family)) continue
      suma(pesos, `${fuenteBase(s.family)}|${s.size}`, f.len)
    }
    const cuerpo = moda(pesos)
    if (!cuerpo) throw new Error('El PDF no tiene texto seleccionable (¿es un escaneo?). Expórtalo a PDF desde Word o pásalo como DOCX.')
    const [famCuerpo, szCuerpo] = cuerpo.valor.split('|')
    const c = fuenteCercana(famCuerpo)
    e.fuente = c.fuente
    e.tamano = Number(szCuerpo)
    detectado.push(c.exacta ? `Tipografía: ${c.fuente}` : `Tipografía del ejemplo: ${famCuerpo} (se usa ${c.fuente}, la más parecida)`)
    detectado.push(`Tamaño de texto: ${szCuerpo} pt`)
    const fam = new Set([...pesos.keys()].map((k) => k.split('|')[0]))
    if (cuerpo.share < 0.6 && fam.size > 2) incierto.push('El ejemplo mezcla varias tipografías o tamaños; se tomó el más usado.')

    const pag = moda(new Map([...dims.values()].map((d) => [`${d.w}x${d.h}`, 1])))!
    const [pw, ph] = pag.valor.split('x').map(Number)
    const papel = PAPELES(pw, ph)
    if (papel) {
      e.papel = papel
      detectado.push(`Papel: ${papel}`)
    }

    const esCuerpo = (f: Frag) => {
      const s = specs.get(f.font)
      return !!s && `${fuenteBase(s.family)}|${s.size}` === cuerpo.valor
    }
    // Líneas de texto de cuerpo: se agrupan los fragmentos con casi la misma altura.
    const porPagina = new Map<number, Frag[]>()
    for (const f of frags.filter(esCuerpo)) (porPagina.get(f.page) ?? porPagina.set(f.page, []).get(f.page)!).push(f)
    const lineasTxt: { page: number; top: number; left: number; right: number }[] = []
    for (const [page, fs] of porPagina) {
      fs.sort((a, b) => a.top - b.top || a.left - b.left)
      let cur: { top: number; left: number; right: number } | null = null
      for (const f of fs) {
        if (cur && Math.abs(f.top - cur.top) <= 3) {
          cur.left = Math.min(cur.left, f.left)
          cur.right = Math.max(cur.right, f.left + f.width)
        } else {
          if (cur) lineasTxt.push({ page, ...cur })
          cur = { top: f.top, left: f.left, right: f.left + f.width }
        }
      }
      if (cur) lineasTxt.push({ page, ...cur })
    }
    const lefts = lineasTxt.map((l) => l.left).sort((a, b) => a - b)
    const rights = lineasTxt.map((l) => l.right).sort((a, b) => a - b)
    const q = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.floor(xs.length * p)))]
    if (lefts.length >= 5) {
      const izq = q(lefts, 0.1)
      const der = pw - q(rights, 0.95)
      e.margenCm = cm((izq + der) / 2)
      detectado.push(`Márgenes: ≈ ${e.margenCm} cm`)
      const ancho = pw - izq - der
      // Solo renglones casi de ancho completo: la última línea de un párrafo nunca llega al margen aunque esté justificado.
      const largas = lineasTxt.filter((l) => l.right - l.left > 0.85 * ancho)
      if (largas.length >= 5) {
        const alineadas = largas.filter((l) => Math.abs(l.right - q(rights, 0.95)) <= 2).length
        e.alinear = alineadas / largas.length >= 0.6 ? 'justificado' : 'izquierda'
        detectado.push(`Alineación del texto: ${e.alinear}`)
      }
    } else incierto.push('Hay muy poco texto para medir márgenes y alineación.')

    // Interlineado y espacio entre párrafos, a partir de la distancia entre renglones consecutivos.
    const pasos: number[] = []
    for (const [page] of porPagina) {
      const ls = lineasTxt.filter((l) => l.page === page).sort((a, b) => a.top - b.top)
      for (let i = 1; i < ls.length; i++) {
        const dy = ls[i].top - ls[i - 1].top
        if (dy > 0.8 * Number(szCuerpo) && dy < 4 * Number(szCuerpo)) pasos.push(dy)
      }
    }
    if (pasos.length >= 8) {
      pasos.sort((a, b) => a - b)
      const paso = pasos[Math.floor(pasos.length * 0.3)] // renglón dentro de un párrafo
      const inter = Math.round((paso / (Number(szCuerpo) * 1.2)) * 20) / 20
      e.interlineado = inter
      detectado.push(`Interlineado: ≈ ${inter}`)
      const grandes = pasos.filter((p) => p > paso * 1.35).length / pasos.length
      e.espaciado = grandes > 0.35 ? 'amplio' : grandes < 0.08 ? 'compacto' : 'normal'
      incierto.push('Interlineado y espaciado se estimaron midiendo el PDF (la medida depende de la tipografía): revísalos.')
    }

    // Títulos: tamaño mayor o negrita con color propio.
    const colTit = new Map<string, number>()
    for (const f of frags) {
      const s = specs.get(f.font)
      if (s && s.color !== '#000000' && (s.size > Number(szCuerpo) || /bold|negrita/i.test(s.family))) suma(colTit, s.color.slice(1), f.len)
    }
    const ct = moda(colTit)
    if (ct) {
      e.colorTitulos = ct.valor
      detectado.push(`Color de títulos: #${ct.valor}`)
    }

    // Número de página: un número suelto abajo, en la mayoría de las páginas.
    const pies = new Set<number>()
    for (const p of paginas) {
      const n = Number(attr(p, 'number'))
      const h = dims.get(n)!.h
      for (const t of all(p, 'text')) if (Number(attr(t, 'top')) > h * 0.9 && /^\s*\d{1,3}\s*$/.test(t.textContent ?? '')) pies.add(n)
    }
    e.numeracion = pies.size >= Math.max(1, paginas.length * 0.6)
    detectado.push(e.numeracion ? 'Número de página al pie' : 'Sin número de página')
    incierto.push('De un PDF no se puede saber si las ecuaciones están centradas; se deja la alineación predeterminada. Con el DOCX original se lee todo con más precisión.')

    return { estilo: normalizarEstilo({ ...PRESETS.limpio, ...e }), detectado, incierto, origen: 'PDF' }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const fuenteBase = (family: string) => family.replace(/^[A-Z]{6}\+/, '').replace(/[-,](Bold|Italic|Oblique|Regular|BoldItalic|Light|Medium|Semibold).*$/i, '')

// ───────── Entrada ─────────

export async function extraerFormato(nombre: string, data: Buffer): Promise<PropuestaFormato> {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'docx') return extraerDeDocx(data)
  if (ext === 'pdf') return extraerDePdf(data)
  if (['doc', 'odt', 'rtf'].includes(ext)) throw new Error('Guarda el ejemplo como DOCX o PDF y vuelve a subirlo.')
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext))
    throw new Error('De una foto o captura no se pueden leer con certeza las tipografías ni los márgenes. Pide el archivo original (DOCX) o expórtalo a PDF.')
  throw new Error('Formato no admitido: usa un DOCX o un PDF.')
}
