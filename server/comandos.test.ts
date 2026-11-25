import { describe, expect, it } from 'vitest'
import { argsComando, esComando } from './comandos'

describe('comandos de la interfaz', () => {
  it('arma los argumentos de cada comando permitido', () => {
    expect(argsComando('contrastar', 'entrega-1')).toEqual(['contrastar', 'entrega-1'])
    expect(argsComando('depurar', 'entrega-1')).toEqual(['depurar', 'entrega-1'])
    expect(argsComando('depurar-aplicar', 'entrega-1')).toEqual(['depurar', 'entrega-1', '--aplicar'])
    expect(argsComando('comentarios', 'e 2')).toEqual(['comentarios', 'e 2'])
  })

  it('rechaza comandos que no están en la lista', () => {
    expect(esComando('cerrar')).toBe(false)
    expect(esComando('toString')).toBe(false)
    expect(() => argsComando('resolver', 'x')).toThrow('no permitido')
    expect(() => argsComando(undefined, 'x')).toThrow('no permitido')
  })

  it('rechaza entregas vacías o que se leerían como opción', () => {
    expect(() => argsComando('contrastar', '')).toThrow('no válida')
    expect(() => argsComando('contrastar', '--aplicar')).toThrow('no válida')
    expect(() => argsComando('contrastar', 'a\nb')).toThrow('no válida')
  })
})
