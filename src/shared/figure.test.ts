import { describe, expect, it } from 'vitest'
import { compileExpr } from './expr'
import { figureAlt, figureSvg, parseFigure } from './figure'
import { parseMmd } from './mmd'

describe('compileExpr', () => {
  it('evalúa expresiones con multiplicación implícita y potencias', () => {
    expect(compileExpr('2x^2 + 1')(3)).toBe(19)
    expect(compileExpr('-x**2')(3)).toBe(-9)
    expect(compileExpr('3(x+1)')(1)).toBe(6)
    expect(compileExpr('sin(pi/2)')(0)).toBeCloseTo(1)
  })
  it('rechaza símbolos desconocidos sin ejecutar código', () => {
    expect(() => compileExpr('process.exit(1)')).toThrow()
    expect(() => compileExpr('foo(x)')).toThrow(/desconocid/)
    expect(() => compileExpr('2 +')).toThrow()
  })
})

describe('parseFigure', () => {
  const ok = '{"tipo":"cartesiana","escala":"sin_valores","elementos":[{"t":"recta","m":2,"b":1},{"t":"vector","a":[3,2]}]}'
  it('acepta una gráfica válida y la dibuja', () => {
    const p = parseFigure(ok)
    expect(p.ok).toBe(true)
    if (p.ok) {
      const svg = figureSvg(p.spec)
      expect(svg).toMatch(/^<svg/)
      expect(svg).toContain('marker-end')
    }
  })
  it('no dibuja números de eje cuando la escala es sin_valores', () => {
    const p = parseFigure(ok)
    if (!p.ok) throw new Error('inválida')
    expect(figureSvg(p.spec)).not.toMatch(/text-anchor="end"/)
  })
  it('rotula la escala inferida', () => {
    const p = parseFigure(ok.replace('sin_valores', 'inferida'))
    if (!p.ok) throw new Error('inválida')
    expect(figureSvg(p.spec)).toMatch(/escala inferida/)
  })
  it('reporta errores útiles', () => {
    expect(parseFigure('no es json')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"cartesiana","escala":"x","elementos":[]}')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"cartesiana","escala":"leida","elementos":[{"t":"recta"}]}')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"cartesiana","escala":"leida","elementos":[{"t":"funcion","expr":"foo(x)"}]}')).toMatchObject({ ok: false })
  })
})

describe('gráficas en R3', () => {
  const ok = '{"tipo":"r3","escala":"leida","x":[-4,6],"y":[-4,6],"z":[-4,6],"elementos":[{"t":"vector","a":[3,2,4],"etiqueta":"v"},{"t":"punto","en":[1,1,1],"etiqueta":"P"},{"t":"plano","a":1,"b":1,"c":1,"d":6}]}'
  it('acepta una figura r3 válida y la dibuja', () => {
    const p = parseFigure(ok)
    expect(p.ok).toBe(true)
    if (p.ok) {
      const svg = figureSvg(p.spec)
      expect(svg).toMatch(/^<svg/)
      expect(svg).toContain('marker-end')
      expect(svg).toContain('fill-opacity="0.18"') // el plano recortado a la caja
    }
  })
  it('la proyección caballera produce un dibujo distinto a la isométrica', () => {
    const a = parseFigure(ok)
    const b = parseFigure(ok.replace('"tipo":"r3"', '"tipo":"r3","proyeccion":"caballera"'))
    if (!a.ok || !b.ok) throw new Error('inválida')
    expect(figureSvg(a.spec)).not.toEqual(figureSvg(b.spec))
  })
  it('sin_valores no rotula números; inferida se marca', () => {
    const sv = parseFigure(ok.replace('"leida"', '"sin_valores"'))
    const inf = parseFigure(ok.replace('"leida"', '"inferida"'))
    if (!sv.ok || !inf.ok) throw new Error('inválida')
    expect(figureSvg(sv.spec)).not.toContain('font-size="12"')
    expect(figureSvg(inf.spec)).toContain('escala inferida')
  })
  it('dibuja la rejilla isométrica y la oculta cuando corresponde', () => {
    const p = parseFigure(ok)
    if (!p.ok) throw new Error('inválida')
    expect(figureSvg(p.spec)).toContain('stroke="#d9dee7"')
    expect(figureSvg(p.spec, { ancho: 65, paleta: 'clasica', grosor: 2.4, cuadricula: 'ninguna', etiquetas: 15 })).not.toContain('stroke="#d9dee7"')
    const sinPapel = parseFigure(ok.replace('"tipo":"r3"', '"tipo":"r3","cuadricula":false'))
    if (!sinPapel.ok) throw new Error('inválida')
    expect(figureSvg(sinPapel.spec)).not.toContain('stroke="#d9dee7"')
  })
  it('las aristas ocultas punteadas se dibujan discontinuas', () => {
    const p = parseFigure('{"tipo":"r3","escala":"sin_valores","elementos":[{"t":"segmento","puntos":[[0,0,0],[2,2,2]],"punteado":true}]}')
    if (!p.ok) throw new Error('inválida')
    expect(figureSvg(p.spec)).toContain('stroke-dasharray')
  })
  it('reporta errores útiles', () => {
    expect(parseFigure('{"tipo":"r3","escala":"leida","elementos":[{"t":"punto","en":[1,2]}]}')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"r3","escala":"leida","elementos":[{"t":"plano","a":0,"b":0,"c":0}]}')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"r3","escala":"leida","proyeccion":"perspectiva","elementos":[{"t":"punto","en":[1,2,3]}]}')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"r3","escala":"leida","elementos":[{"t":"esfera"}]}')).toMatchObject({ ok: false })
    expect(parseFigure('{"tipo":"r3","escala":"x","elementos":[{"t":"punto","en":[1,2,3]}]}')).toMatchObject({ ok: false })
  })
  it('el texto alternativo describe la proyección', () => {
    const p = parseFigure(ok)
    if (!p.ok) throw new Error('inválida')
    expect(figureAlt(p.spec)).toContain('R3')
    expect(figureAlt(p.spec)).toContain('isométrica')
  })
})

describe('bloque grafica en el parser MMD', () => {
  it('mantiene el orden texto → gráfica → texto', () => {
    const b = parseMmd('Antes\n\n```grafica\n{"a":1}\n```\n\nDespués')
    expect(b.map((x) => x.t)).toEqual(['para', 'figure', 'para'])
  })
})
