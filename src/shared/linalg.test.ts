import { describe, expect, it } from 'vitest'
import { checkEquation, checkExpectedAnswer, checkTranscription, evaluateLatex, parseNumber, valueToString } from './linalg'

const M = (rows: string) => `\\begin{pmatrix}${rows.replace(/;/g, ' \\\\ ')}\\end{pmatrix}`

describe('parseNumber', () => {
  it('entiende enteros, decimales y fracciones', () => {
    expect(parseNumber('-3')).toEqual({ n: -3n, d: 1n })
    expect(parseNumber('0.5')).toEqual({ n: 1n, d: 2n })
    expect(parseNumber('\\frac{2}{4}')).toEqual({ n: 1n, d: 2n })
    expect(parseNumber('-\\frac{1}{3}')).toEqual({ n: -1n, d: 3n })
    expect(parseNumber('x')).toBeNull()
  })
})

describe('checkEquation', () => {
  it('acepta una suma de matrices correcta', () => {
    const c = checkEquation(String.raw`${M('1&2;3&4')}+${M('5&6;7&8')}=${M('6&8;10&12')}`)
    expect(c.status).toBe('ok')
  })
  it('señala la celda cuando un dígito está mal leído', () => {
    const c = checkEquation(String.raw`${M('1&2;3&4')}+${M('5&6;7&8')}=${M('6&8;10&13')}`)
    expect(c.status).toBe('inconsistent')
    expect(c.cells).toEqual([{ row: 2, col: 2, left: '12', right: '13' }])
  })
  it('maneja resta, escalar y producto', () => {
    expect(checkEquation(String.raw`2${M('1&0;0&1')}-${M('1&1;1&1')}=${M('1&-1;-1&1')}`).status).toBe('ok')
    expect(checkEquation(String.raw`${M('1&2;3&4')}${M('0&1;1&0')}=${M('2&1;4&3')}`).status).toBe('ok')
    expect(checkEquation(String.raw`${M('1&2;3&4')}\cdot${M('1&0;0&1')}=${M('1&2;3&4')}`).status).toBe('ok')
  })
  it('acepta array con \\left( \\right) como lo emite Mathpix', () => {
    const arr = (r: string) => `\\left(\\begin{array}{ll}${r.replace(/;/g, ' \\\\ ')}\\end{array}\\right)`
    expect(checkEquation(String.raw`${arr('1&2;3&4')}+${arr('1&1;1&1')}=${arr('2&3;4&5')}`).status).toBe('ok')
  })
  it('calcula determinantes, transpuestas y fracciones', () => {
    expect(checkEquation(String.raw`\begin{vmatrix}1&2\\3&4\end{vmatrix}=-2`).status).toBe('ok')
    expect(checkEquation(String.raw`\det${M('1&2;3&4')}=1\cdot4-2\cdot3=-2`).status).toBe('ok')
    expect(checkEquation(String.raw`${M('1&2;3&4')}^{T}=${M('1&3;2&4')}`).status).toBe('ok')
    expect(checkEquation(String.raw`\frac{1}{2}${M('2&4;6&8')}=${M('1&2;3&4')}`).status).toBe('ok')
  })
  it('trata \\left|…\\right| como determinante (así lo emite Mathpix)', () => {
    const d = String.raw`\left|\begin{array}{ll}1 & 2 \\ 3 & 4\end{array}\right|`
    expect(checkEquation(`${d}=1\\cdot4-2\\cdot3=-2`).status).toBe('ok')
    expect(checkEquation(`${d}=-3`).status).toBe('inconsistent')
    expect(checkEquation(String.raw`\operatorname{det}\left(\begin{array}{ll}1 & 2 \\ 3 & 4\end{array}\right)=-2`).status).toBe('ok')
  })
  it('detecta dimensiones incompatibles', () => {
    const c = checkEquation(String.raw`${M('1&2;3&4')}+${M('1&2&3')}=${M('1&2;3&4')}`)
    expect(c.status).not.toBe('ok')
  })
  it('no inventa: con variables es no verificable', () => {
    expect(checkEquation(String.raw`A+B=${M('1&2;3&4')}`).status).toBe('unverifiable')
    expect(checkEquation(String.raw`x=3`).status).toBe('unverifiable')
  })
})

describe('checkExpectedAnswer', () => {
  const expected = M('6&8;10&12')
  it('encuentra la respuesta aunque el método y el orden varíen', () => {
    const text = String.raw`Sumo entrada por entrada: $$${M('1&2;3&4')}+${M('5&6;7&8')}=${M('1+5&2+6;3+7&4+8')}=${expected}$$`
    expect(checkExpectedAnswer(expected, text).status).toBe('found')
  })
  it('informa la celda cuando difiere', () => {
    const r = checkExpectedAnswer(expected, String.raw`$$${M('1&2;3&4')}+${M('5&6;7&8')}=${M('6&8;10&13')}$$`)
    expect(r.status).toBe('mismatch')
    expect(r.detail).toContain('(2,2)')
  })
  it('respuesta de referencia simbólica es no verificable', () => {
    expect(checkExpectedAnswer('\\lambda=2', 'x').status).toBe('unverifiable')
  })
})

describe('checkTranscription', () => {
  it('cuenta verificadas, inconsistentes y no verificables', () => {
    const r = checkTranscription(String.raw`$$${M('1&1')}+${M('1&1')}=${M('2&2')}$$

$$${M('1&1')}+${M('1&1')}=${M('2&3')}$$

$$x=y$$`)
    expect([r.verified, r.inconsistent, r.unverifiable]).toEqual([1, 1, 1])
  })
  it('evaluateLatex devuelve la matriz', () => {
    const r = evaluateLatex(M('1&-\\frac{1}{2};3&4'))
    expect(r.ok && valueToString(r.value)).toBe('[1, -1/2 ; 3, 4]')
  })
})
