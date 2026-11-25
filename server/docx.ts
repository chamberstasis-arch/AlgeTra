import JSZip from 'jszip'
import { normalizarEstilo, PRESETS, type Estilo } from '../src/shared/estilo'
import { parseMmd, type Block, type Inline } from '../src/shared/mmd'
import { renderFigure } from './figures'
import { latexToOmml } from './omml'

export interface DocxPage {
  title: string
  text: string
}

export interface DocxOptions {
  title: string
  subtitle?: string
  pages: DocxPage[]
  /** Muestra el encabezado "Página N" antes de cada transcripción. */
  pageHeaders: boolean
  /** Presentación. Sin él, se conserva el aspecto de siempre (con título), para los llamadores que no lo usan. */
  estilo?: Estilo
}

export interface FormulaIssue {
  page: string
  latex: string
  error: string
}

export interface DocxResult {
  buffer: Buffer
  formulas: number
  failed: FormulaIssue[]
}

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const textRun = (text: string, rpr = '') =>
  text ? `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>` : ''

/** Aspecto histórico: el preset limpio con el título impreso. */
const ESTILO_LEGADO: Estilo = { ...PRESETS.limpio, titulo: 'entrega' }

/** Renglón que abre un inciso o numeral: "a)", "(b)", "1.", "2)", "iv)". */
const INCISO_RE = /^\s*\(?(?:[a-zA-Z]\)|(?:\d{1,2}|[ivxIVX]{1,4})[).])(?:\s|$)/

const PAPEL = { A4: { w: 11906, h: 16838 }, Carta: { w: 12240, h: 15840 } } as const

export function buildDocx(opts: DocxOptions): Promise<DocxResult> {
  const E = normalizarEstilo(opts.estilo ?? ESTILO_LEGADO)
  const paper = PAPEL[E.papel]
  const margen = Math.round(E.margenCm * 567) // twips
  const textoPx = (paper.w - 2 * margen) / 15 // 1 px a 96 dpi = 15 twips
  const sz = Math.round(E.tamano * 2) // medios puntos
  const fe = E.espaciado === 'compacto' ? 0.5 : E.espaciado === 'amplio' ? 1.6 : 1
  const tw = (n: number) => Math.round(n * fe) // espacio vertical en twips, según el estilo
  let actividades = 0
  let formulas = 0
  const failed: FormulaIssue[] = []
  let currentPage = ''
  const media: { name: string; data: Buffer }[] = []
  const EMU = 9525 // por píxel lógico a 96 dpi

  /** Si una fórmula no se puede convertir, se conserva el LaTeX visible y resaltado: nunca se pierde. */
  const fallback = (latex: string, display: boolean) =>
    `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:highlight w:val="yellow"/></w:rPr><w:t xml:space="preserve">${esc(display ? `$$${latex}$$` : `$${latex}$`)}</w:t></w:r>`

  const math = (latex: string, display: boolean): string => {
    formulas++
    const res = latexToOmml(latex, display)
    if (res.ok) return res.xml
    failed.push({ page: currentPage, latex, error: res.error })
    return fallback(latex, display)
  }

  const inlines = (xs: Inline[], bold = false) =>
    xs
      .map((i) => (i.t === 'math' ? math(i.latex, false) : textRun(i.text, i.bold || bold ? '<w:b/>' : '')))
      .join('')

  /** Una gráfica se incrusta como imagen en su posición exacta; si falla, queda el JSON visible y resaltado. */
  const figure = (source: string): string => {
    const res = renderFigure(source, E.grafica)
    if (!res.ok) {
      failed.push({ page: currentPage, latex: 'gráfica', error: res.error })
      return `<w:p><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:highlight w:val="yellow"/></w:rPr><w:t xml:space="preserve">${esc(`[Gráfica no válida: ${res.error}]`)}</w:t></w:r></w:p>`
    }
    const n = media.length + 1
    media.push({ name: `fig${n}.png`, data: res.png })
    const anchoPx = (textoPx * E.grafica.ancho) / 100
    const cx = Math.round(anchoPx * EMU)
    const cy = Math.round((anchoPx / res.width) * res.height * EMU)
    const alt = esc(`${res.alt} ${source.replace(/\s+/g, ' ').slice(0, 1500)}`).replace(/"/g, '&quot;')
    return (
      `<w:p><w:pPr><w:keepNext/><w:spacing w:before="${tw(80)}" w:after="${tw(160)}"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
      `<wp:docPr id="${n}" name="Gráfica ${n}" descr="${alt}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="fig${n}.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="rIdFig${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
    )
  }

  const block = (b: Block): string => {
    switch (b.t) {
      case 'figure':
        return figure(b.source)
      case 'display': {
        const res = latexToOmml(b.latex, true)
        formulas++
        if (res.ok) {
          const jc = E.ecuaciones === 'centradas' ? 'center' : 'left'
          const ind = jc === 'left' ? '<w:ind w:left="340"/>' : ''
          const xml = res.xml.replace('<m:oMathPara>', `<m:oMathPara><m:oMathParaPr><m:jc m:val="${jc}"/></m:oMathParaPr>`)
          return `<w:p><w:pPr><w:spacing w:before="0" w:after="${tw(50)}"/>${ind}<w:jc w:val="${jc}"/></w:pPr>${xml}</w:p>`
        }
        failed.push({ page: currentPage, latex: b.latex, error: res.error })
        return `<w:p>${fallback(b.latex, true)}</w:p>`
      }
      case 'para': {
        if (b.heading) {
          const salto = b.heading === 1 && E.saltoActividad && actividades++ > 0 ? '<w:pageBreakBefore/>' : ''
          return `<w:p><w:pPr><w:pStyle w:val="Heading${Math.min(b.heading, 3)}"/>${salto}</w:pPr>${inlines(b.inlines)}</w:p>`
        }
        // Un renglón que abre un inciso ("a)", "1.") deja más aire arriba y se queda junto a lo que sigue;
        // el resto de renglones va apretado, como en la libreta.
        const primero = b.inlines[0]
        const abre = primero?.t === 'text' && INCISO_RE.test(primero.text)
        const ppr = abre ? `<w:pPr><w:keepNext/><w:spacing w:before="${tw(200)}"/></w:pPr>` : ''
        return `<w:p>${ppr}${inlines(b.inlines)}</w:p>`
      }
      case 'table': {
        // Tablas de valores compactas: letra más chica, sin aire entre renglones y anchas solo lo que su contenido pide.
        const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
          .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>`)
          .join('')
        // Ancho de cada columna según su contenido más largo (tablas de valores: números cortos, columnas angostas).
        const largo = (c: (typeof b.rows)[number][number]) => c.reduce((n, i) => n + (i.t === 'math' ? i.latex.replace(/\\[a-z]+|[{}^_]/g, '').length : i.text.length), 0)
        const ncol = Math.max(...b.rows.map((r) => r.length))
        const ancho = Array.from({ length: ncol }, (_, j) => Math.min(3200, Math.max(560, Math.max(...b.rows.map((r) => (r[j] ? largo(r[j]) : 0))) * 130 + 260)))
        const rows = b.rows
          .map(
            (r) =>
              `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r
                .map((c, j) => `<w:tc><w:tcPr><w:tcW w:w="${ancho[j] ?? 1000}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TablaCelda"/></w:pPr>${inlines(c)}</w:p></w:tc>`)
                .join('')}</w:tr>`,
          )
          .join('')
        const mar = (l: string, v: number) => `<w:${l} w:w="${v}" w:type="dxa"/>`
        return (
          `<w:tbl><w:tblPr><w:tblW w:w="${ancho.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblInd w:w="${E.ecuaciones === 'izquierda' ? 340 : 0}" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders>` +
          `<w:tblLayout w:type="autofit"/><w:tblCellMar>${mar('top', 15)}${mar('left', 100)}${mar('bottom', 15)}${mar('right', 100)}</w:tblCellMar></w:tblPr><w:tblGrid>${ancho.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>` +
          `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>`
        )
      }
    }
  }

  const body: string[] = []
  if (E.titulo === 'entrega') {
    body.push(`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${textRun(opts.title)}</w:p>`)
    if (opts.subtitle) body.push(`<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr>${textRun(opts.subtitle)}</w:p>`)
  }

  opts.pages.forEach((page, idx) => {
    currentPage = page.title
    if (idx > 0) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    if (opts.pageHeaders)
      body.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${textRun(`Página ${idx + 1} · ${page.title}`)}</w:p>`)
    const blocks = parseMmd(page.text)
    if (!blocks.length) body.push(`<w:p>${textRun('(sin contenido transcrito)', '<w:i/><w:color w:val="808080"/>')}</w:p>`)
    for (const b of blocks) body.push(block(b))
  })

  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body.join('')}` +
    `<w:sectPr>${E.numeracion ? '<w:footerReference w:type="default" r:id="rIdFtr1"/>' : ''}<w:pgSz w:w="${paper.w}" w:h="${paper.h}"/><w:pgMar w:top="${margen}" w:right="${margen}" w:bottom="${margen}" w:left="${margen}" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>` +
    '</w:body></w:document>'

  const f = E.fuente
  const h = (k: number) => Math.round(sz * k)
  const color = E.colorTitulos
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}" w:cs="${f}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="${tw(60)}" w:line="${Math.round(E.interlineado * 240)}" w:lineRule="auto"/>${E.alinear === 'justificado' ? '<w:jc w:val="both"/>' : ''}</w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="TablaCelda"><w:name w:val="Tabla celda"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="${Math.max(16, Math.round(sz * 0.8))}"/><w:szCs w:val="${Math.max(16, Math.round(sz * 0.8))}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${h(1.67)}"/><w:szCs w:val="${h(1.67)}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/><w:jc w:val="left"/></w:pPr><w:rPr><w:color w:val="666666"/><w:sz w:val="${h(0.92)}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${tw(360)}" w:after="${tw(120)}"/><w:jc w:val="left"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${h(1.25)}"/><w:szCs w:val="${h(1.25)}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:jc w:val="left"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${h(1.17)}"/><w:szCs w:val="${h(1.17)}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:jc w:val="left"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${h(1.08)}"/><w:szCs w:val="${h(1.08)}"/></w:rPr></w:style>
</w:styles>`
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`

  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${E.numeracion ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}</Types>`,
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${E.numeracion ? '<Relationship Id="rIdFtr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : ''}${media.map((m, i) => `<Relationship Id="rIdFig${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`,
  )
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title)}</dc:title><dc:creator>AlgeTra</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
  )
  zip.file('word/styles.xml', styles)
  if (E.numeracion) zip.file('word/footer1.xml', footer)
  zip.file('word/document.xml', document)
  for (const m of media) zip.file(`word/media/${m.name}`, m.data)

  return zip
    .generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    .then((buffer) => ({ buffer, formulas, failed }))
}
