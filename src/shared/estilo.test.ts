import { describe, expect, it } from 'vitest'
import { FUENTES, LIMITES, PRESETS, normalizarEstilo, variarEstilo } from './estilo'
import { figureSvg, parseFigure } from './figure'

describe('normalizarEstilo', () => {
  it('sin datos devuelve el preset limpio', () => {
    expect(normalizarEstilo(undefined)).toEqual(PRESETS.limpio)
    expect(normalizarEstilo(null)).toEqual(PRESETS.limpio)
    expect(normalizarEstilo('basura')).toEqual(PRESETS.limpio)
  })
  it('recorta valores fuera de rango y rechaza tipografías raras', () => {
    const e = normalizarEstilo({ fuente: 'Comic Sans', tamano: 99, interlineado: 0, margenCm: -3, colorTitulos: 'rojo', grafica: { ancho: 500, grosor: 0, paleta: 'nada', cuadricula: 'x' } })
    expect(e.fuente).toBe('Calibri')
    expect(e.tamano).toBe(LIMITES.tamano[1])
    expect(e.interlineado).toBe(LIMITES.interlineado[0])
    expect(e.margenCm).toBe(LIMITES.margenCm[0])
    expect(e.colorTitulos).toBe('1F3864')
    expect(e.grafica).toMatchObject({ ancho: 100, grosor: 1.5, paleta: 'clasica', cuadricula: 'suave' })
  })
  it('es idempotente y todos los presets son válidos', () => {
    for (const p of Object.values(PRESETS)) expect(normalizarEstilo(p)).toEqual(p)
    const v = variarEstilo('x')
    expect(normalizarEstilo(v)).toEqual(v)
  })
})

describe('tipografía de los títulos', () => {
  it('el preset uv: Carta, Gill Sans MT 15 en títulos, Times New Roman 12, sin colores y actividad en hoja nueva', () => {
    const e = normalizarEstilo(PRESETS.uv)
    expect(e).toMatchObject({ papel: 'Carta', fuente: 'Times New Roman', tamano: 12, fuenteTitulos: 'Gill Sans MT', tamanoTitulos: 15, colorTitulos: '000000', saltoActividad: true })
    expect(e.grafica.paleta).toBe('mono')
  })
  it('es opcional: sin ella los títulos siguen a la del texto y los demás presets no cambian', () => {
    const e = normalizarEstilo(PRESETS.limpio)
    expect(e.fuenteTitulos).toBeUndefined()
    expect(e.tamanoTitulos).toBeUndefined()
  })
  it('rechaza tipografías raras y recorta el tamaño', () => {
    expect(normalizarEstilo({ fuenteTitulos: 'Comic Papyrus' }).fuenteTitulos).toBeUndefined()
    expect(normalizarEstilo({ tamanoTitulos: 99 }).tamanoTitulos).toBe(20)
    expect(normalizarEstilo({ tamanoTitulos: '' }).tamanoTitulos).toBeUndefined()
    expect(normalizarEstilo(normalizarEstilo(PRESETS.uv))).toEqual(normalizarEstilo(PRESETS.uv))
  })
})

describe('variarEstilo', () => {
  it('la misma semilla da siempre el mismo estilo', () => {
    expect(variarEstilo('entrega-1')).toEqual(variarEstilo('entrega-1'))
  })
  it('semillas distintas dan estilos distintos (casi siempre) y siempre válidos', () => {
    const firmas = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const e = variarEstilo(`entrega-${i}`)
      expect(FUENTES).toContain(e.fuente)
      expect(e.titulo).toBe('ninguno')
      expect(e.grafica.ancho).toBeGreaterThanOrEqual(LIMITES.ancho[0])
      firmas.add(JSON.stringify(e))
    }
    expect(firmas.size).toBeGreaterThan(30)
  })
  it('recuerda la semilla para poder reproducirlo', () => {
    expect(variarEstilo('abc').semilla).toBe('abc')
    expect(variarEstilo('abc').nombre).toBe('variado')
  })
})

describe('estilo de las gráficas', () => {
  const spec = (src: string) => {
    const p = parseFigure(src)
    if (!p.ok) throw new Error(p.error)
    return p.spec
  }
  const f = spec('{"tipo":"cartesiana","escala":"leida","x":[0,10],"y":[0,10],"cuadricula":true,"elementos":[{"t":"vector","a":[3,4],"etiqueta":"v"},{"t":"segmento","puntos":[[0,0],[5,5]]}]}')
  it('sin estilo conserva el aspecto de siempre', () => {
    const svg = figureSvg(f)
    expect(svg).toContain('#1f4e9c')
    expect(svg).toContain('stroke-width="2.4"')
    expect(svg).toContain('stroke="#d9dee7"')
  })
  it('la paleta, el grosor, la cuadrícula y las etiquetas cambian el dibujo', () => {
    const svg = figureSvg(f, { ancho: 60, paleta: 'viva', grosor: 3, cuadricula: 'completa', etiquetas: 18 })
    expect(svg).toContain('#e74c3c')
    expect(svg).not.toContain('#1f4e9c')
    expect(svg).toContain('stroke-width="3"')
    expect(svg).toContain('#aab3c2')
    expect(svg).toContain('font-size="18"')
  })
  it('cuadrícula "ninguna" no dibuja cuadrícula aunque la hoja la tuviera', () => {
    const svg = figureSvg(f, { ancho: 65, paleta: 'clasica', grosor: 2.4, cuadricula: 'ninguna', etiquetas: 15 })
    expect(svg).not.toContain('#d9dee7')
    expect(svg).not.toContain('#aab3c2')
  })
  it('los números de los ejes no se pueden ocultar con el estilo (son parte de lo que escribió el alumno)', () => {
    expect(figureSvg(f, { ancho: 65, paleta: 'mono', grosor: 2, cuadricula: 'ninguna', etiquetas: 14 })).toContain('>10<')
  })
})
