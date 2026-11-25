import { describe, expect, it } from 'vitest'
import { contrastar, contrastarFiguras, sistemaAMatriz, verificarCadena } from './contraste'
import type { Exercise } from '../src/shared/types'
import { ocultarAuxiliares } from '../src/shared/mmd'

const ej = (statement: string, ref = 'act-07/1'): Exercise => ({ ref, number: ref.split('/')[1], statement, answerText: '', answers: [] })
const SIS = 'Resolver por Gauss-Jordan:\n$$\\begin{aligned}x + y &= 3 \\\\ 2x - y &= 0\\end{aligned}$$'

describe('contraste con el enunciado', () => {
  it('entiende un sistema como matriz aumentada', () => {
    const m = sistemaAMatriz('\\begin{aligned}a + b + c &= 4 \\\\ a + 2b - 3c &= -10\\end{aligned}')!
    expect(m.rows.map((r) => r.map((x) => Number(x.n) / Number(x.d)))).toEqual([[1, 1, 1, 4], [1, 2, -3, -10]])
  })
  it('acepta la matriz idéntica y señala la celda con signo cambiado', () => {
    const bien = '$$\\begin{bmatrix}1&1&3\\\\2&-1&0\\end{bmatrix}$$'
    const mal = '$$\\begin{bmatrix}1&1&3\\\\2&1&0\\end{bmatrix}$$'
    expect(contrastar(bien, [ej(SIS)])[0].problemas).toEqual([])
    expect(contrastar(mal, [ej(SIS)])[0].problemas.join(' ')).toMatch(/celda \(2,2\): escrito 1, enunciado -1/)
  })
  it('no exige matriz cuando el método no es matricial', () => {
    expect(contrastar('$$x=1$$', [ej('Busque la solución:\n$$\\begin{aligned}x + y &= 3 \\\\ 2x - y &= 0\\end{aligned}$$')])[0].problemas).toEqual([])
  })
  it('los puntos del enunciado pueden estar escritos o como columna', () => {
    const e = ej('Figura con $P_{1}(4, 7)$ y $P_{2}(1, 2)$. Graficar.')
    const t = '$P_1=(4,7)$ y $$\\begin{bmatrix}9\\\\9\\end{bmatrix}$$ ```grafica\n{}\n```'
    expect(contrastar(t, [e])[0].problemas.join(' ')).toMatch(/P2\(1,2\)/)
    expect(contrastar(t, [e])[0].problemas.join(' ')).not.toMatch(/P1/)
  })
})

describe('cadena de operaciones entre renglones', () => {
  const M = (a: number[][]) => `$$\\begin{bmatrix}${a.map((r) => r.join('&')).join('\\\\')}\\end{bmatrix}$$`
  it('acepta una cadena correcta, con operaciones seguidas y fracciones', () => {
    const t = [M([[1, 2], [3, 4]]), '$$R_2 \\rightarrow R_2 - 3R_1$$', M([[1, 2], [0, -2]]), '$$R_2 \\rightarrow -\\frac{1}{2} R_2$$', M([[1, 2], [0, 1]]), '$$R_1 \\rightarrow R_1 - 2R_2$$', M([[1, 0], [0, 1]])].join('\n')
    expect(verificarCadena(t)).toEqual([])
  })
  it('señala la celda que no sigue de la operación', () => {
    const t = [M([[1, 2], [3, 4]]), '$$R_2 \\to R_2 - 3R_1$$', M([[1, 2], [0, 2]])].join('\n')
    expect(verificarCadena(t).join(' ')).toMatch(/\(2,2\): escrito 2, esperado -2/)
  })
  it('intercambio de renglones', () => {
    expect(verificarCadena([M([[1, 2], [3, 4]]), '$$R_1 \\leftrightarrow R_2$$', M([[3, 4], [1, 2]])].join('\n'))).toEqual([])
  })
})

describe('contraste de figuras', () => {
  const fig = (els: string) => `\`\`\`grafica\n{"tipo":"cartesiana","escala":"sin_valores","elementos":[${els}]}\n\`\`\``
  it('detecta una flecha cuya etiqueta no coincide con lo dibujado', () => {
    expect(contrastarFiguras(fig('{"t":"vector","a":[2,-3],"etiqueta":"u(2,3)"}')).join(' ')).toMatch(/dibujado en \(2,-3\)/)
  })
  it('una etiqueta coincidente no da aviso y 3D con coordenadas tampoco', () => {
    expect(contrastarFiguras(fig('{"t":"vector","a":[2,3],"etiqueta":"u(2,3)"}'))).toEqual([])
    expect(contrastarFiguras('```grafica\n{"tipo":"r3","escala":"inferida","elementos":[{"t":"vector","a":[6,7,0],"etiqueta":"(6,7,0)"}]}\n```')).toEqual([])
  })
  it('avisa de flechas sin referencias y de vectores de longitud cero', () => {
    expect(contrastarFiguras(fig('{"t":"vector","a":[2,3]}')).join(' ')).toMatch(/sin coordenadas/)
    expect(contrastarFiguras(fig('{"t":"vector","de":[1,1],"a":[1,1],"etiqueta":"(1,1)"}')).join(' ')).toMatch(/longitud cero/)
  })
})

import { estructuraIntercalada } from './contraste'
describe('estructura intercalada', () => {
  it('una progresión de 3 pasos en un renglón es normal; 4 o más bloques se señalan', () => {
    expect(estructuraIntercalada('$$2x-y=3 \\qquad -y=3-2x \\qquad y=-3+2x$$')).toEqual([])
    expect(estructuraIntercalada('$$a=1 \\qquad b=2 \\qquad c=3 \\qquad d=4$$')).toHaveLength(1)
  })
})

describe('las cuentas aparte (bloques aux) no se verifican', () => {
  // Fragmento real de una hoja: tras la operación R_3 → R_3+3R_2 viene la cuenta a dos pisos (aux) y luego la matriz.
  const aux = (cuerpo: string) => '```aux\n$$' + cuerpo + '$$\n```'
  const A0 = '$$\\left[\\begin{array}{ccc|c} 1 & 1 & -1 & 0 \\\\ 2 & -4 & 3 & 0 \\\\ -5 & 13 & -10 & 0 \\end{array}\\right]$$'
  const A1 = '$$\\left[\\begin{array}{ccc|c} 1 & 1 & -1 & 0 \\\\ 0 & -6 & 5 & 0 \\\\ 0 & 18 & -15 & 0 \\end{array}\\right]$$'
  const A2 = '$$\\left[\\begin{array}{ccc|c} 1 & 1 & -1 & 0 \\\\ 0 & -6 & 5 & 0 \\\\ 0 & 0 & 0 & 0 \\end{array}\\right]$$'
  const t = [
    A0, '$$R_2 \\to R_2-2R_1$$', aux('\\begin{array}{crrrr} & 2 & -4 & 3 & 0 \\\\ - & 2 & 2 & -2 & 0 \\\\ \\hline & 0 & -6 & 5 & 0 \\end{array}'),
    '$$R_3 \\to R_3+5R_1$$', aux('\\begin{array}{crrrr} & -5 & 13 & -10 & 0 \\\\ + & 5 & 5 & -5 & 0 \\\\ \\hline & 0 & 18 & -15 & 0 \\end{array}'),
    A1, '$$R_3 \\to R_3+3R_2$$', aux('\\begin{array}{rrrr} 0 & 18 & -15 & 0 \\\\ 0 & -18 & 15 & 0 \\\\ \\hline 0 & 0 & 0 & 0 \\end{array}'), A2,
  ].join('\n')

  it('con el bloque aux a la vista se marcaba una "diferencia" que no existe; oculto, la cadena cuadra', () => {
    expect(verificarCadena(t).join(' ')).toMatch(/Línea \d+/) // el defecto
    expect(verificarCadena(ocultarAuxiliares(t))).toEqual([])
  })
  it('ocultar conserva los números de renglón del archivo', () => {
    const o = ocultarAuxiliares(t)
    expect(o.split('\n').length).toBe(t.split('\n').length)
    expect(o).not.toContain('hline')
    expect(o.split('\n')[0]).toBe(t.split('\n')[0])
  })
})
