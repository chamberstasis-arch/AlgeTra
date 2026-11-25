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

describe('aritmética escalar (raíces, divisiones, potencias)', () => {
  const st = (l: string) => checkEquation(l).status
  it('verifica las cuentas de una hoja de magnitud', () => {
    expect(st(String.raw`|v| = \sqrt{4^2 + (-2)^2 + 1^2}`)).toBe('unverifiable') // |v| es un símbolo
    expect(st(String.raw`\sqrt{4^2 + (-2)^2 + 1^2} = \sqrt{16+4+1} = \sqrt{21}`)).toBe('ok')
    expect(st(String.raw`\sqrt{3^2} = \sqrt{9} = 3`)).toBe('ok')
    expect(st(String.raw`\cos(\alpha) = 0/3 = 0`)).toBe('ok')
    expect(st(String.raw`\frac{4}{\sqrt{16+4+1}} = 4/\sqrt{21}`)).toBe('ok')
  })
  it('detecta un dígito mal leído', () => {
    expect(st(String.raw`\sqrt{16+4+1} = \sqrt{22}`)).toBe('inconsistent')
    expect(st(String.raw`\sqrt{1+25+4} = \sqrt{29}`)).toBe('inconsistent')
    expect(st(String.raw`\sqrt{36+49} = \sqrt{85}`)).toBe('ok')
    expect(st(String.raw`3^2 + 4^2 = 26`)).toBe('inconsistent')
  })
  it('acepta un decimal que es redondeo o truncamiento, y rechaza uno que no lo es', () => {
    expect(st(String.raw`\sqrt{21} = 4.58`)).toBe('ok') // truncado
    expect(st(String.raw`\sqrt{21} = 4.583`)).toBe('ok') // redondeado
    expect(st(String.raw`\sqrt{21} = 4.4`)).toBe('inconsistent')
    expect(st(String.raw`\frac{1}{3} = 0.33`)).toBe('ok')
    expect(st(String.raw`\frac{1}{3} = 0.34`)).toBe('inconsistent')
  })
  it('no divide entre cero ni inventa con símbolos', () => {
    expect(st(String.raw`1/0 = 0`)).toBe('unverifiable')
    expect(st(String.raw`x^2 = 4`)).toBe('unverifiable')
    expect(st(String.raw`\sqrt{-4} = 2`)).toBe('unverifiable')
  })
})

describe('vectores', () => {
  const st = (l: string) => checkEquation(l).status
  it('suma, resta y escalar en forma i, j, k y en tupla', () => {
    expect(st(String.raw`(2i - 3j + 4k) + (-2i - 3j + 5k) = -6j + 9k`)).toBe('ok')
    expect(st(String.raw`3(1, 2) - (2, 1) = (1, 5)`)).toBe('ok')
    expect(st(String.raw`3(1, 2) - (2, 1) = (1, 4)`)).toBe('inconsistent')
    expect(st(String.raw`2\mathbf{i} + 3\mathbf{j} = (2, 3)`)).toBe('ok') // R² y R³ con k=0
  })
  it('producto punto y su desarrollo', () => {
    expect(st(String.raw`u \cdot w = 2(1) + (-3)(-7) + 4(3) = 2 + 21 + 12 = 35`)).toBe('ok')
    expect(st(String.raw`(2, -3, 4) \cdot (1, -7, 3) = 35`)).toBe('ok')
    expect(st(String.raw`(2, -3, 4) \cdot (1, -7, 3) = 36`)).toBe('inconsistent')
    expect(st(String.raw`(3i - 2j)\cdot(i + 5j) = 3 - 10 = -7`)).toBe('ok')
  })
  it('producto cruz, también como determinante simbólico', () => {
    expect(st(String.raw`(i - 2j) \times 3k = -6i - 3j`)).toBe('ok')
    expect(st(String.raw`(i - 2j) \times 3k = -6i + 3j`)).toBe('inconsistent')
    expect(st(String.raw`\begin{vmatrix} i & j & k \\ 1 & -2 & 0 \\ 0 & 0 & 3 \end{vmatrix} = -6i - 3j`)).toBe('ok')
    expect(st(String.raw`\begin{vmatrix} i & j & k \\ 1 & -2 & 0 \\ 0 & 0 & 3 \end{vmatrix} = -6i + 3j`)).toBe('inconsistent')
  })
  it('norma de un vector', () => {
    expect(st(String.raw`|3i + 4j| = 5`)).toBe('ok')
    expect(st(String.raw`\|(1, 5, 2)\| = \sqrt{1 + 25 + 4} = \sqrt{30}`)).toBe('ok')
    expect(st(String.raw`\left|4i - 2j + k\right| = \sqrt{21}`)).toBe('ok')
    expect(st(String.raw`|3i + 4j| = 6`)).toBe('inconsistent')
  })
  it('un vector contra un escalar no se compara (k puede ser una variable)', () => {
    expect(st(String.raw`3k = 6`)).toBe('unverifiable')
    expect(st(String.raw`2k + 3 = 7`)).toBe('unverifiable')
    expect(st(String.raw`ku = 6`)).toBe('unverifiable')
  })
  it('la respuesta esperada puede ser un radical o un vector', () => {
    expect(checkExpectedAnswer(String.raw`\sqrt{21}`, String.raw`$$|v| = \sqrt{16+4+1} = \sqrt{21}$$`).status).toBe('found')
    expect(checkExpectedAnswer('(-6, -3, 0)', String.raw`$$u \times v = -6i - 3j$$`).status).toBe('found')
    expect(checkExpectedAnswer('(-6, 3, 0)', String.raw`$$u \times v = -6i - 3j$$`).status).not.toBe('found')
  })
})

describe('símbolos definidos en la misma hoja', () => {
  const t = (...eqs: string[]) => checkTranscription(eqs.map((e) => `$$${e}$$`).join('\n\n'))
  const kinds = (r: ReturnType<typeof t>) => r.checks.map((c) => c.status)
  it('comprueba |v| contra el vector que la hoja definió', () => {
    expect(kinds(t(String.raw`v = 4i - 2j + k`, String.raw`|v| = \sqrt{16+4+1} = \sqrt{21}`))).toEqual(['unverifiable', 'ok'])
    // un dígito mal leído en el vector: la raíz ya no cuadra
    const bad = t(String.raw`v = 4i - 2j + 3k`, String.raw`|v| = \sqrt{16+4+1} = \sqrt{21}`)
    expect(kinds(bad)).toEqual(['unverifiable', 'inconsistent'])
  })
  it('producto punto y suma de matrices con símbolos', () => {
    expect(kinds(t(String.raw`u = 2i - 3j + 4k`, String.raw`w = i - 7j + 3k`, String.raw`u \cdot w = 2(1) + (-3)(-7) + 4(3) = 35`))).toEqual(['unverifiable', 'unverifiable', 'ok'])
    expect(kinds(t(`A = ${M('1&2;3&4')}`, `B = ${M('5&6;7&8')}`, `A + B = ${M('6&8;10&12')}`))).toEqual(['unverifiable', 'unverifiable', 'ok'])
    expect(kinds(t(`A = ${M('1&2;3&4')}`, `B = ${M('5&6;7&8')}`, `A + B = ${M('6&8;10&13')}`)).pop()).toBe('inconsistent')
  })
  it('redefinir un símbolo no es una contradicción', () => {
    expect(kinds(t(String.raw`v = 3j`, String.raw`v = 4i - 2j + k`, String.raw`|v| = \sqrt{21}`))).toEqual(['unverifiable', 'unverifiable', 'ok'])
  })
  it('una redefinición no evaluable borra el valor anterior', () => {
    expect(kinds(t(String.raw`v = 3j`, String.raw`v = ai + bj`, String.raw`|v| = 3`)).pop()).toBe('unverifiable')
  })
  it('las incógnitas (x, y, z) no se arrastran de un ejercicio a otro', () => {
    expect(kinds(t(String.raw`x = 3`, String.raw`x + 2 = 6`)).pop()).toBe('unverifiable')
  })
})

describe('respuestas recuadradas por el alumno', () => {
  it('el recuadro no impide verificar: se compara el valor de dentro', () => {
    expect(checkEquation('2+3=\\boxed{5}').status).toBe('ok')
    expect(checkEquation('2+3=\\boxed{6}').status).toBe('inconsistent')
    expect(checkEquation('\\boxed{2+3=5}').status).toBe('ok')
    expect(checkEquation('2+3=\\fbox{\\frac{10}{2}}').status).toBe('ok')
  })
  it('conserva la ecuación original en el resultado', () => {
    expect(checkEquation('2+3=\\boxed{5}').latex).toBe('2+3=\\boxed{5}')
  })
})
