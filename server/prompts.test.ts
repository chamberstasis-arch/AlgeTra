import { describe, expect, it } from 'vitest'
import { armarPrompt, esTipoPrompt } from './prompts'

const ctx = { entrega: 'entrega-1', porProcesar: 5, enProceso: 1, cerradas: 12, otras: [] as string[] }

describe('prompts por entrega', () => {
  it('sustituye <ENTREGA> en todas partes y antepone el estado de la cola', () => {
    const p = armarPrompt('Haz `pnpm harness siguiente --entrega "<ENTREGA>"` y luego `formato <ENTREGA>`.', ctx)
    expect(p).toContain('siguiente --entrega "entrega-1"')
    expect(p).toContain('formato entrega-1')
    expect(p).not.toContain('<ENTREGA>')
    expect(p).toContain('«entrega-1» — 5 por procesar, 1 en proceso, 12 cerradas')
    expect(p).toContain('No hay otras entregas en la cola.')
  })
  it('avisa cuando hay otras entregas en la cola', () => {
    const p = armarPrompt('x', { ...ctx, otras: ['otra-a', 'otra-b'] })
    expect(p).toContain('otras entregas (otra-a, otra-b)')
    expect(p).toContain('No las toques')
  })
  it('solo acepta tipos conocidos', () => {
    expect(esTipoPrompt('lote')).toBe(true)
    expect(esTipoPrompt('')).toBe(true)
    expect(esTipoPrompt('../../etc/passwd')).toBe(false)
    expect(esTipoPrompt('toString')).toBe(false)
  })
})
