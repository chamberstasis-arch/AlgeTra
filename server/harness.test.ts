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

import { orderSegments, splitSegments } from './harness'

describe('ensamblado por ejercicio e inciso', () => {
  const pagina1 = '<!-- ejercicio: act-03/2 -->\nEj 2 texto\n<!-- inciso: b -->\nInciso b\n<!-- inciso: a -->\nInciso a'
  const pagina2 = 'continuación sin marca\n<!-- ejercicio: act-03/10 -->\nEj 10\n<!-- ejercicio: act-03/1 -->\nEj 1'
  const segs = [...splitSegments(pagina1, 1), ...splitSegments(pagina2, 2)]

  it('ordena por ejercicio (numérico) e inciso y deja la continuación con su ejercicio', () => {
    const t = orderSegments(segs).map((s) => s.text.trim())
    // La continuación sin marca sigue a lo último escrito antes de ella (el inciso a de la hoja 1).
    expect(t).toEqual(['Ej 1', 'Ej 2 texto', 'Inciso a', 'continuación sin marca', 'Inciso b', 'Ej 10'])
  })
  it('respeta el orden original si se pide', () => {
    const t = orderSegments(segs, true).map((s) => s.text.trim())
    expect(t).toEqual(['Ej 2 texto', 'Inciso b', 'Inciso a', 'continuación sin marca', 'Ej 10', 'Ej 1'])
  })
  it('conserva el orden interno de texto y gráficas dentro de un segmento', () => {
    const s = splitSegments('<!-- ejercicio: a/1 -->\ntexto 1\n```grafica\n{}\n```\ntexto 2\n```grafica\n{}\n```', 1)
    expect(s).toHaveLength(1)
    expect(s[0].text.indexOf('texto 1')).toBeLessThan(s[0].text.indexOf('texto 2'))
    expect((s[0].text.match(/```grafica/g) ?? []).length).toBe(2)
  })
  it('las dudas del agente no pasan al texto ensamblado', () => {
    const s = splitSegments('<!-- ejercicio: a/1 -->\nhola <!-- DUDA: x --> mundo', 1)
    expect(s[0].text).not.toMatch(/DUDA/)
  })
})
