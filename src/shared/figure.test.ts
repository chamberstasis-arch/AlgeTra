import { describe, expect, it } from 'vitest'
import { compileExpr } from './expr'
import { figureSvg, parseFigure } from './figure'
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

describe('bloque grafica en el parser MMD', () => {
  it('mantiene el orden texto → gráfica → texto', () => {
    const b = parseMmd('Antes\n\n```grafica\n{"a":1}\n```\n\nDespués')
    expect(b.map((x) => x.t)).toEqual(['para', 'figure', 'para'])
  })
})
