// El extractor se prueba «de ida y vuelta»: un documento hecho con un estilo conocido debe devolver ese estilo.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { afterAll, describe, expect, it } from 'vitest'
import { PRESETS, normalizarEstilo } from '../src/shared/estilo'
import { buildDocx } from './docx'
import { extraerFormato, fuenteCercana } from './formato'

const TEXTO =
  '# Actividad 1\n\n' +
  Array.from({ length: 36 }, (_, i) => `a) Sea $x_${i}$ un vector del espacio vectorial real que cumple la condición ${'muy '.repeat(i % 5)}${'bien '.repeat((i * 3) % 4)}pedida en el enunciado de la actividad número ${i} del cuaderno de trabajo y sus ${'otras '.repeat(i % 3)}notas.\n$$x_${i}+1=${i + 1}$$`).join('\n\n') +
  '\n\n# Actividad 2\n\nOtro texto de la segunda actividad, suficientemente largo para pesar en la estadística.\n$$y=2$$'
const hacer = (e: ReturnType<typeof normalizarEstilo>) => buildDocx({ title: 't', pages: [{ title: 'p', text: TEXTO }], pageHeaders: false, estilo: e })

describe('fuenteCercana', () => {
  it('reconoce las admitidas, las sustitutas de LibreOffice y clasifica lo desconocido', () => {
    expect(fuenteCercana('Calibri')).toEqual({ fuente: 'Calibri', exacta: true })
    expect(fuenteCercana('ABCDEF+LiberationSerif-Bold').fuente).toBe('Times New Roman')
    expect(fuenteCercana('Carlito').fuente).toBe('Calibri')
    expect(fuenteCercana('Google Sans').fuente).toBe('Arial')
    expect(fuenteCercana('Merriweather')).toEqual({ fuente: 'Times New Roman', exacta: false })
    expect(fuenteCercana('Quirky Display')).toEqual({ fuente: 'Calibri', exacta: false })
  })
})

describe('extracción desde DOCX', () => {
  for (const nombre of ['limpio', 'cuaderno', 'formal', 'compacto'] as const) {
    it(`recupera el estilo «${nombre}»`, async () => {
      const original = PRESETS[nombre]
      const r = await extraerFormato('e.docx', (await hacer(original)).buffer)
      const e = r.estilo
      expect(e.fuente).toBe(original.fuente)
      expect(e.tamano).toBe(original.tamano)
      expect(e.interlineado).toBeCloseTo(original.interlineado, 2)
      expect(e.margenCm).toBeCloseTo(original.margenCm, 1)
      expect(e.papel).toBe(original.papel)
      expect(e.alinear).toBe(original.alinear)
      expect(e.ecuaciones).toBe(original.ecuaciones)
      expect(e.espaciado).toBe(original.espaciado)
      expect(e.numeracion).toBe(original.numeracion)
      expect(e.colorTitulos).toBe(original.colorTitulos)
      expect(r.origen).toBe('DOCX')
    })
  }
  it('detecta papel Carta y el salto de hoja entre actividades', async () => {
    const o = normalizarEstilo({ papel: 'Carta', saltoActividad: true })
    const e = (await extraerFormato('e.docx', (await hacer(o)).buffer)).estilo
    expect(e.papel).toBe('Carta')
    expect(e.saltoActividad).toBe(true)
  })
  it('un DOCX sin ecuaciones de Word lo dice en lugar de adivinar', async () => {
    const r = await buildDocx({ title: 't', pages: [{ title: 'p', text: 'Solo texto, sin ninguna fórmula, pero largo para contar en las estadísticas del documento.' }], pageHeaders: false, estilo: PRESETS.limpio })
    const x = await extraerFormato('e.docx', r.buffer)
    expect(x.incierto.join(' ')).toMatch(/no trae ecuaciones de Word/)
  })
  it('rechaza lo que no es un DOCX y los formatos sin información fiable', async () => {
    await expect(extraerFormato('e.docx', Buffer.from('nada'))).rejects.toThrow()
    await expect(extraerFormato('foto.png', Buffer.from('x'))).rejects.toThrow(/foto o captura/)
    await expect(extraerFormato('e.zip', Buffer.from('x'))).rejects.toThrow(/no admitido/)
  })
})

describe('un DOCX hecho a mano, como los que exporta una IA', () => {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
  const arma = async (cuerpo: string, styles: string, theme = '') => {
    const z = new JSZip()
    z.file('word/document.xml', `<w:document ${W}><w:body>${cuerpo}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`)
    z.file('word/styles.xml', `<w:styles ${W}>${styles}</w:styles>`)
    if (theme) z.file('word/theme/theme1.xml', theme)
    return z.generateAsync({ type: 'nodebuffer' })
  }
  const p = (t: string, rpr = '', ppr = '') => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t>${t}</w:t></w:r></w:p>`
  it('resuelve la fuente del tema, los valores por defecto de Word y toma el formato mayoritario', async () => {
    const theme = '<a:theme xmlns:a="x"><a:fontScheme><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme></a:theme>'
    const styles =
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="278" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="0F4761"/><w:sz w:val="40"/></w:rPr></w:style>'
    const cuerpo =
      p('Actividad 1', '', '<w:pStyle w:val="Heading1"/>') +
      p('Este es un párrafo normal bastante largo del documento de ejemplo con muchas palabras.') +
      p('Otro párrafo normal también largo, escrito con la tipografía por defecto del documento.') +
      p('un fragmento corto', '<w:rFonts w:ascii="Arial"/>')
    const r = await extraerFormato('ia.docx', await arma(cuerpo, styles, theme))
    expect(r.estilo.fuente).toBe('Aptos')
    expect(r.estilo.tamano).toBe(12)
    expect(r.estilo.interlineado).toBeCloseTo(1.15, 1)
    expect(r.estilo.espaciado).toBe('amplio') // 8 pt entre párrafos, el valor por defecto de Word
    expect(r.estilo.papel).toBe('Carta')
    expect(r.estilo.margenCm).toBeCloseTo(2.5, 1)
    expect(r.estilo.colorTitulos).toBe('0F4761')
    expect(r.estilo.numeracion).toBe(false)
  })
  it('una fuente que no admitimos se reporta y se sustituye por la más parecida', async () => {
    const styles = '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Merriweather"/><w:sz w:val="22"/></w:rPr></w:style>'
    const r = await extraerFormato('ia.docx', await arma(p('Texto suficientemente largo para que cuente en la estadística del documento.'), styles))
    expect(r.estilo.fuente).toBe('Times New Roman')
    expect(r.detectado.join(' ')).toMatch(/Merriweather/)
  })
})

describe('extracción desde PDF', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'algetra-fmt-test-'))
  afterAll(() => rmSync(tmp, { recursive: true, force: true }))
  const aPdf = async (e: ReturnType<typeof normalizarEstilo>) => {
    const docx = join(tmp, 'e.docx')
    writeFileSync(docx, (await hacer(e)).buffer)
    execFileSync('soffice', [`-env:UserInstallation=file://${tmp}/lo`, '--headless', '--convert-to', 'pdf', '--outdir', tmp, docx], { timeout: 120_000 })
    return readFileSync(join(tmp, 'e.pdf'))
  }
  it('recupera tipografía, tamaño, papel, alineación y número de página de un PDF', async () => {
    const o = PRESETS.formal // Times 12, justificado, A4, con número de página
    const r = await extraerFormato('e.pdf', await aPdf(o))
    expect(r.estilo.fuente).toBe('Times New Roman')
    expect(r.estilo.tamano).toBe(12)
    expect(r.estilo.papel).toBe('A4')
    expect(r.estilo.alinear).toBe('justificado')
    expect(r.estilo.numeracion).toBe(true)
    expect(r.estilo.margenCm).toBeGreaterThan(2.6)
    expect(r.estilo.margenCm).toBeLessThan(3.4)
    expect(r.incierto.join(' ')).toMatch(/PDF/)
  }, 60_000)
  it('sin número de página y alineado a la izquierda, también', async () => {
    const r = await extraerFormato('e.pdf', await aPdf(PRESETS.cuaderno))
    expect(['Verdana', 'Arial', 'Calibri']).toContain(r.estilo.fuente) // LibreOffice sustituye Verdana por otra sans
    expect(r.estilo.alinear).toBe('izquierda')
    expect(r.estilo.numeracion).toBe(false)
  }, 60_000)
  it('un PDF sin texto seleccionable da un error claro', async () => {
    await expect(extraerFormato('e.pdf', Buffer.from('%PDF-1.4\n%%EOF'))).rejects.toThrow()
  })
})
