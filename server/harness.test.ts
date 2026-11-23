import { describe, expect, it } from 'vitest'
import { runChecks } from './checks'
import { dollarBalance, lintTranscription, parseMarkers, safeId } from './harness'

describe('parseMarkers', () => {
  it('separa ejercicios y dudas, y quita los comentarios del cuerpo', () => {
    const m = parseMarkers('<!-- ejercicio: act-01/1, act-01/2 -->\nHola $x$\n<!-- DUDA: ¿5 o 6? -->\n<!-- tachado: nada -->')
    expect(m.refs).toEqual(['act-01/1', 'act-01/2'])
    expect(m.doubts).toEqual(['¿5 o 6?'])
    expect(m.body).toBe('Hola $x$')
  })
})

describe('dollarBalance', () => {
  it('detecta $ sin cerrar e ignora \\$', () => {
    expect(dollarBalance('$a$ y $$b$$')).toEqual({ display: 2, inline: 2 })
    expect(dollarBalance('cuesta \\$5 y $a')).toEqual({ display: 0, inline: 1 })
  })
})

describe('lintTranscription', () => {
  const body = '$$A+B=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}+\\begin{pmatrix}5&6\\\\7&8\\end{pmatrix}=\\begin{pmatrix}6&8\\\\10&13\\end{pmatrix}$$'
  it('marca la celda aritmética incorrecta como error', () => {
    const m = parseMarkers(body)
    const l = lintTranscription(m, runChecks(m.body, []), [])
    expect(l.errors.join(' ')).toMatch(/aritmética no cuadra/)
    expect(l.errors.join(' ')).toMatch(/celda \(2,2\)/)
  })
  it('[?], dudas y gráficas obligan a revisión pero no impiden cerrar', () => {
    const m = parseMarkers('Texto [?]\n[Gráfica: recta]\n<!-- DUDA: x -->')
    const l = lintTranscription(m, null, [])
    expect(l.errors).toEqual([])
    expect(l.needsReview).toHaveLength(3)
  })
  it('una fórmula no convertible es error', () => {
    const l = lintTranscription(parseMarkers('$x$'), null, [{ latex: '\\foo', error: 'x' }])
    expect(l.errors[0]).toMatch(/no se puede convertir/)
  })
})

describe('safeId', () => {
  it('normaliza nombres de archivo', () => {
    expect(safeId('Hoja 1 (act1).jpg')).toBe('Hoja_1_act1')
    expect(safeId('Álgebra ñandú.PNG')).toBe('Algebra_nandu')
  })
})
