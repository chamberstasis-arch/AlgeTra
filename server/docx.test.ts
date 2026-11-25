import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { PRESETS, normalizarEstilo, type Estilo } from '../src/shared/estilo'
import { buildDocx } from './docx'

const TEXTO = 'Texto del alumno\n\n$$x^2+1=5$$\n\n```grafica\n{"tipo":"cartesiana","escala":"leida","x":[0,10],"y":[0,10],"elementos":[{"t":"vector","a":[3,4]}]}\n```\n'
const partes = async (buf: Buffer) => {
  const z = await JSZip.loadAsync(buf)
  const get = async (n: string) => (await z.file(n)?.async('string')) ?? ''
  return { doc: await get('word/document.xml'), styles: await get('word/styles.xml'), types: await get('[Content_Types].xml'), rels: await get('word/_rels/document.xml.rels'), footer: await get('word/footer1.xml') }
}
const build = (estilo?: Parameters<typeof buildDocx>[0]['estilo']) => buildDocx({ title: 'ENTREGA-X', subtitle: 'sub', pages: [{ title: 'p', text: TEXTO }], pageHeaders: false, estilo })

describe('DOCX con estilo', () => {
  it('sin estilo conserva el título (comportamiento histórico)', async () => {
    expect((await partes((await build()).buffer)).doc).toContain('ENTREGA-X')
  })
  it('el preset limpio no imprime el nombre interno de la entrega', async () => {
    expect((await partes((await build(PRESETS.limpio)).buffer)).doc).not.toContain('ENTREGA-X')
  })
  it('aplica tipografía, tamaño, interlineado, márgenes y papel', async () => {
    const e = normalizarEstilo({ fuente: 'Georgia', tamano: 11, interlineado: 1.5, margenCm: 3, papel: 'Carta', alinear: 'justificado', colorTitulos: 'AA0000', titulo: 'entrega' })
    const p = await partes((await build(e)).buffer)
    expect(p.styles).toContain('w:ascii="Georgia"')
    expect(p.styles).toContain('<w:sz w:val="22"/>')
    expect(p.styles).toContain('w:line="360"')
    expect(p.styles).toContain('<w:jc w:val="both"/>')
    expect(p.styles).toContain('w:val="AA0000"')
    expect(p.doc).toContain('w:w="12240" w:h="15840"')
    expect(p.doc).toContain('w:top="1701"') // 3 cm
    expect(p.doc).toContain('ENTREGA-X')
  })
  it('las ecuaciones siguen siendo nativas (OMML) con cualquier estilo', async () => {
    for (const e of [PRESETS.limpio, PRESETS.formal, normalizarEstilo({ ecuaciones: 'izquierda' })]) {
      const r = await build(e)
      expect(r.failed).toEqual([])
      expect((await partes(r.buffer)).doc).toContain('<m:oMath')
    }
  })
  it('alinea las ecuaciones según el estilo', async () => {
    expect((await partes((await build(normalizarEstilo({ ecuaciones: 'izquierda' }))).buffer)).doc).toContain('<w:jc w:val="left"/></w:pPr><m:oMathPara>')
    expect((await partes((await build(normalizarEstilo({ ecuaciones: 'centradas' }))).buffer)).doc).toContain('<w:jc w:val="center"/></w:pPr><m:oMathPara><m:oMathParaPr><m:jc m:val="center"/>')
  })
  it('por defecto las ecuaciones van a la izquierda (como en la libreta), no centradas', async () => {
    const d = (await partes((await build(PRESETS.limpio)).buffer)).doc
    expect(d).toContain('<m:oMathParaPr><m:jc m:val="left"/>')
    expect(d).not.toContain('m:val="center"')
  })
  it('numeración de página: pie con campo PAGE solo si se pide', async () => {
    const con = await partes((await build(PRESETS.formal)).buffer)
    expect(con.footer).toContain('PAGE')
    expect(con.doc).toContain('footerReference')
    expect(con.types).toContain('footer1.xml')
    expect(con.rels).toContain('rIdFtr1')
    const sin = await partes((await build(PRESETS.limpio)).buffer)
    expect(sin.footer).toBe('')
    expect(sin.doc).not.toContain('footerReference')
  })
  it('el ancho de la gráfica sigue al estilo y respeta la proporción', async () => {
    const ancho = (d: string) => Number(/<wp:extent cx="(\d+)"/.exec(d)?.[1])
    const a = ancho((await partes((await build(normalizarEstilo({ grafica: { ancho: 40 } }))).buffer)).doc)
    const b = ancho((await partes((await build(normalizarEstilo({ grafica: { ancho: 80 } }))).buffer)).doc)
    expect(b / a).toBeCloseTo(2, 1)
  })
  it('incrusta una figura r3 como imagen con su proyección en el texto alternativo', async () => {
    const texto = 'Vector en el espacio\n\n```grafica\n{"tipo":"r3","escala":"sin_valores","proyeccion":"caballera","elementos":[{"t":"vector","a":[2,1,3],"etiqueta":"v"}]}\n```\n'
    const r = await buildDocx({ title: 'T', subtitle: 's', pages: [{ title: 'p', text: texto }], pageHeaders: false })
    expect(r.failed).toEqual([])
    const p = await partes(r.buffer)
    expect(p.doc).toContain('<w:drawing>')
    expect(p.doc).toContain('R3')
    expect(p.rels).toContain('rIdFig1')
  })

  describe('formato UV (títulos Gill Sans MT 15 negritas, texto Times New Roman 12)', () => {
    const dos = '# Actividad 1\n\nTexto $$a=1$$\n\n# Actividad 2\n\n$$b=2$$'
    const mk = async (estilo?: Estilo) => partes((await buildDocx({ title: 'T', pages: [{ title: 'p', text: dos }], pageHeaders: false, estilo })).buffer)
    it('los títulos llevan su tipografía y tamaño; el texto, la suya', async () => {
      const { styles, doc } = await mk(normalizarEstilo(PRESETS.uv))
      expect(styles).toMatch(/<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman"[^>]*\/><w:sz w:val="24"\/>/)
      expect(styles).toMatch(/w:styleId="Heading1">.*?<w:rFonts w:ascii="Gill Sans MT"[^>]*\/><w:b\/><w:color w:val="000000"\/><w:sz w:val="30"\/>/)
      expect(doc.match(/<w:pageBreakBefore\/>/g)).toHaveLength(1) // la actividad 2 va en hoja nueva; la 1 no
    })
    it('sin tipografía de títulos, nada cambia respecto al estilo de siempre', async () => {
      const { styles } = await mk(normalizarEstilo(PRESETS.limpio))
      expect(styles).not.toContain('Gill Sans MT')
      expect(styles).toMatch(/w:styleId="Heading1">.*?<w:b\/>/)
    })
  })

  describe('separación entre renglones e incisos', () => {
    const texto = '# Actividad 3\n\na) $x$\n$$x=1$$\n$$x=2$$\n\nb) $y$\n$$y=1$$\n\nTexto suelto'
    const doc = async (e: Estilo) => (await partes((await buildDocx({ title: 'T', pages: [{ title: 'p', text: texto }], pageHeaders: false, estilo: e })).buffer)).doc
    it('el espacio grande solo va antes de cada inciso; los renglones del desarrollo van apretados', async () => {
      const d = await doc(PRESETS.limpio)
      expect(d.match(/<w:keepNext\/><w:spacing w:before="200"\/>/g)).toHaveLength(2) // a) y b)
      expect(d.match(/w:before="0" w:after="50"/g)).toHaveLength(3) // las tres ecuaciones
      expect(d).not.toContain('w:after="120"')
    })
    it('el espaciado del estilo escala el aire entre incisos', async () => {
      expect(await doc(normalizarEstilo({ espaciado: 'amplio' }))).toContain('w:before="320"')
      expect(await doc(normalizarEstilo({ espaciado: 'compacto' }))).toContain('w:before="100"')
    })
    it('"# Actividad N" es un título de verdad y "cada actividad en hoja nueva" parte desde la segunda', async () => {
      const dos = '# Actividad 1\n\n$$a=1$$\n\n# Actividad 2\n\n$$b=2$$'
      const mk = async (saltoActividad: boolean) => (await partes((await buildDocx({ title: 'T', pages: [{ title: 'p', text: dos }], pageHeaders: false, estilo: normalizarEstilo({ saltoActividad }) })).buffer)).doc
      const sin = await mk(false)
      expect(sin).toContain('<w:pStyle w:val="Heading1"/>')
      expect(sin).not.toContain('pageBreakBefore')
      expect((await mk(true)).match(/pageBreakBefore/g)).toHaveLength(1)
    })
  })
  it('una respuesta recuadrada sale como recuadro nativo de Word', async () => {
    const r = await buildDocx({ title: 'T', pages: [{ title: 'p', text: '$$x = \\boxed{3}$$' }], pageHeaders: false, estilo: PRESETS.limpio })
    expect(r.failed).toEqual([])
    expect((await partes(r.buffer)).doc).toContain('<m:borderBox>')
  })
})

describe('limpieza de formato del documento', () => {
  const con = (text: string) => buildDocx({ title: 't', pages: [{ title: 'p', text }], pageHeaders: false, estilo: PRESETS.limpio })
  it('una tabla de barras sale como tabla de Word, sin barras sueltas', async () => {
    const p = await partes((await con('Datos\n\n| $x$ | $y_1$ |\n|---|---|\n| 4 | 3 |\n| 3 | 2 |\n\nFin')).buffer)
    expect(p.doc).toContain('<w:tbl>')
    expect((p.doc.match(/<w:tr>/g) ?? []).length).toBe(3)
    expect(p.doc).not.toContain('|---|')
  })
  it('las tablas son compactas: rejilla con anchos por contenido, estilo de celda chico y sin espacio entre renglones', async () => {
    const p = await partes((await con('| $x$ | $y_1$ |\n|---|---|\n| 4 | 3 |')).buffer)
    expect(p.doc).toMatch(/<w:tblGrid><w:gridCol w:w="\d+"\/><w:gridCol w:w="\d+"\/><\/w:tblGrid>/)
    expect(p.doc).toContain('<w:pStyle w:val="TablaCelda"/>')
    expect(p.styles).toMatch(/w:styleId="TablaCelda"[\s\S]*?w:after="0"/)
    expect(p.styles).toMatch(/w:styleId="TablaCelda"[\s\S]*?<w:sz w:val="(?:1[6-9]|2[0-2])"\/>/)
    expect(Number(/<w:tblW w:w="(\d+)"/.exec(p.doc)![1])).toBeLessThan(3000)
  })
  it('los espacios de \\qquad dentro de una fórmula se escriben como texto normal (no se colapsan)', async () => {
    const p = await partes((await con('$$a=1 \\qquad b=2$$')).buffer)
    expect(p.doc).toMatch(/<m:nor\/>[\s\S]*?<m:t xml:space="preserve">  <\/m:t>/)
  })
  it('una fórmula que termina en "=" no deja un operando vacío', async () => {
    const r = await con('$$x + 1 =$$')
    expect(r.failed).toEqual([])
    const p = await partes(r.buffer)
    expect(p.doc).toMatch(/=<\/m:t>[\s\S]*?<m:t xml:space="preserve"> <\/m:t>/)
  })
})
