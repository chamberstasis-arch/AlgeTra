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
  it('avisa (sin bloquear) la celda aritmética incorrecta', () => {
    const m = parseMarkers(body)
    const l = lintTranscription(m, runChecks(m.body, []), [])
    expect(l.errors).toEqual([])
    expect(l.needsReview.join(' ')).toMatch(/aritmética no cuadra/)
    expect(l.needsReview.join(' ')).toMatch(/celda \(2,2\)/)
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

describe('sellos', () => {
  const lint = (src: string) => lintTranscription(parseMarkers(src), null, [])
  it('una nota que menciona el sello bloquea el cierre', () => {
    expect(lint('$$x=1$$ <!-- hay un sello rojo de revisión -->').errors.join()).toMatch(/sello/i)
    expect(lint('$$x=1$$ <!-- DUDA: bajo el sello, ¿1 o 7? -->').errors.join()).toMatch(/sello/i)
  })
  it('hablar de la zona ilegible está permitido', () => {
    expect(lint('$$x=1$$ <!-- DUDA: zona ilegible, ¿1 o 7? -->').errors).toEqual([])
  })
  it('parseMarkers expone todas las notas', () => {
    expect(parseMarkers('a <!-- ejercicio: act-01/1 --> b <!-- nota --> c').comments).toEqual(['ejercicio: act-01/1', 'nota'])
  })
})

import { componerCuerpo, quitarEncabezado, tituloActividad } from './harness'

describe('título de actividad y encabezado de la hoja', () => {
  it('act-24 → "Actividad 24" (sin ceros ni notas)', () => {
    expect(tituloActividad('act-24')).toBe('Actividad 24')
    expect(tituloActividad('act-03')).toBe('Actividad 3')
  })
  it('quita el renglón de fecha y "Actividad N" del alumno, en cualquier orden', () => {
    expect(quitarEncabezado('16/10/2026 Actividad 17\n\n<!-- nota -->\n<!-- ejercicio: act-17/1 -->\nSea $u$')).toBe('\n<!-- nota -->\n<!-- ejercicio: act-17/1 -->\nSea $u$')
    expect(quitarEncabezado('Actividad 24 24/01/2025\nHola')).toBe('Hola')
    expect(quitarEncabezado('Fecha: 3-4-25\nActividad no. 5\nHola')).toBe('Hola')
  })
  it('no toca renglones con más contenido ni encabezados fuera del inicio', () => {
    expect(quitarEncabezado('Sea $u$\nActividad 24')).toBe('Sea $u$\nActividad 24')
    expect(quitarEncabezado('Sea $u$\nActividad 24')).toBe('Sea $u$\nActividad 24')
    expect(quitarEncabezado('1. $v = 3j$')).toBe('1. $v = 3j$')
  })
  it('si el encabezado trae el enunciado, quita solo el prefijo y lo conserva', () => {
    expect(quitarEncabezado('Actividad 6 - Resolver por eliminación gaussiana\n$$A$$')).toBe('Resolver por eliminación gaussiana\n$$A$$')
    expect(quitarEncabezado('Act 19 Producto escalar en $\\mathbb{R}^2$\nSea $u$')).toBe('Producto escalar en $\\mathbb{R}^2$\nSea $u$')
  })
  it('el cuerpo lleva solo "Actividad N" y la transcripción, en orden, sin repetir el título', () => {
    const hoja = (n: number, act: string, ej: string, texto: string) => splitSegments(`<!-- ejercicio: ${act}/${ej} -->\n${texto}`, n)
    const segs = [...hoja(1, 'act-10', '1', 'Diez uno'), ...hoja(2, 'act-2', '1', 'Dos uno'), ...hoja(3, 'act-2', '2', 'Dos dos')]
    expect(componerCuerpo(orderSegments(segs))).toBe('# Actividad 2\n\nDos uno\n\nDos dos\n\n# Actividad 10\n\nDiez uno')
  })
  it('lo que no tiene actividad va sin título', () => {
    expect(componerCuerpo(orderSegments(splitSegments('Texto huérfano', 1)))).toBe('Texto huérfano')
  })
})
