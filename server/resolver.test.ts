import { describe, expect, it } from 'vitest'
import { R, det, inversa, raizTex, resolver, resolverSistema, rref, tex } from './resolver'
import { checkExpectedAnswer } from '../src/shared/linalg'

const M = (rows: number[][]) => rows.map((r) => r.map((x) => R(x)))

describe('resolver (referencia)', () => {
  it('sistema con solución única, sin solución e infinitas', () => {
    expect(resolverSistema(M([[1, -3, 4], [-4, 2, 6]]), ['x', 'y']).texto).toBe('x = -\\frac{13}{5},\\ y = -\\frac{11}{5}')
    expect(resolverSistema(M([[1, 1, 1], [1, 1, 2]]), ['x', 'y']).tipo).toBe('ninguna')
    expect(resolverSistema(M([[1, -1, 2], [2, -2, 4]]), ['x', 'y']).texto).toContain('x = 2+t')
  })
  it('determinante, inversa y rango', () => {
    expect(tex(det(M([[2, 3], [-1, 2]])))).toBe('7')
    expect(inversa(M([[1, 2], [2, 4]]))).toBeNull()
    expect(rref(M([[1, 2], [2, 4]])).pivotes).toEqual([0])
  })
  it('raíces simplificadas', () => {
    expect(raizTex(R(32))).toBe('4\\sqrt{2}')
    expect(raizTex(R(9))).toBe('3')
  })
  it('resuelve ejercicios del enunciado y la respuesta es evaluable por el verificador', () => {
    const e = '$u = 2i - 3j; v = i + j$. Calcule la proyección de u sobre v.'
    expect(resolver('act-22', '1', e)).not.toBeNull()
    const s = resolver('act-12', '1', 'Realice el producto matricial indicado:\n$$\\begin{pmatrix} 2 & 3 \\\\ -1 & 2 \\end{pmatrix} \\begin{pmatrix} 4 & 1 \\\\ 0 & 6 \\end{pmatrix}$$')!
    expect(s.formulas[0]).toBe('\\begin{pmatrix}8 & 20 \\\\ -4 & 11\\end{pmatrix}')
    expect(checkExpectedAnswer(s.formulas[0], '$$\\begin{pmatrix}8&20\\\\-4&11\\end{pmatrix}$$').status).toBe('found')
  })
})
