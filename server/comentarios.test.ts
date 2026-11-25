import { describe, expect, it } from 'vitest'
import { normalizarComentarios, ubicar, type Comentario } from './comentarios'

describe('comentarios de revisión', () => {
  it('descarta vacíos, asigna ids y conserva el estado si el texto no cambió', () => {
    const previos: Comentario[] = [{ id: 4, linea: 2, contexto: 'a', texto: 'el 7 es 1', estado: 'resuelto', creado: 'x' }]
    const r = normalizarComentarios([{ id: 4, linea: 2, contexto: 'a', texto: 'el 7 es 1' }, { linea: 9, texto: '  ' }, { linea: 3, contexto: 'b', texto: 'falta signo' }], previos, 'hoy')
    expect(r.map((c) => [c.id, c.estado])).toEqual([[4, 'resuelto'], [5, 'pendiente']])
  })
  it('un comentario editado vuelve a pendiente', () => {
    const previos: Comentario[] = [{ id: 1, linea: 1, contexto: 'a', texto: 'viejo', estado: 'resuelto', creado: 'x' }]
    expect(normalizarComentarios([{ id: 1, linea: 1, texto: 'nuevo' }], previos)[0].estado).toBe('pendiente')
  })
  it('reubica el renglón si el archivo cambió', () => {
    const c: Comentario = { id: 1, linea: 2, contexto: 'x = 3', texto: 't', estado: 'pendiente', creado: '' }
    expect(ubicar(c, ['a', 'b', 'c', 'x = 3'])).toBe(4)
    expect(ubicar(c, ['a', 'x = 3'])).toBe(2)
  })
})
