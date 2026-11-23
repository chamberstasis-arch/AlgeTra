import JSZip from 'jszip'
import { parseMmd, type Block, type Inline } from '../src/shared/mmd'
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
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const textRun = (text: string, rpr = '') =>
  text ? `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>` : ''

export function buildDocx(opts: DocxOptions): Promise<DocxResult> {
  let formulas = 0
  const failed: FormulaIssue[] = []
  let currentPage = ''

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

  const block = (b: Block): string => {
    switch (b.t) {
      case 'display': {
        const res = latexToOmml(b.latex, true)
        formulas++
        if (res.ok) return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${res.xml}</w:p>`
        failed.push({ page: currentPage, latex: b.latex, error: res.error })
        return `<w:p>${fallback(b.latex, true)}</w:p>`
      }
      case 'para': {
        const style = b.heading ? `<w:pPr><w:pStyle w:val="Heading${Math.min(b.heading + 1, 3)}"/></w:pPr>` : ''
        return `<w:p>${style}${inlines(b.inlines)}</w:p>`
      }
      case 'table': {
        const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
          .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`)
          .join('')
        const rows = b.rows
          .map(
            (r) =>
              `<w:tr>${r.map((c) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p>${inlines(c)}</w:p></w:tc>`).join('')}</w:tr>`,
          )
          .join('')
        return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${border}</w:tblBorders></w:tblPr>${rows}</w:tbl><w:p/>`
      }
    }
  }

  const body: string[] = []
  body.push(`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${textRun(opts.title)}</w:p>`)
  if (opts.subtitle) body.push(`<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr>${textRun(opts.subtitle)}</w:p>`)

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
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>'

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="666666"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
</w:styles>`

  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  )
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title)}</dc:title><dc:creator>AlgeTra</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`,
  )
  zip.file('word/styles.xml', styles)
  zip.file('word/document.xml', document)

  return zip
    .generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    .then((buffer) => ({ buffer, formulas, failed }))
}
