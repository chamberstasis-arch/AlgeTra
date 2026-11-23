import { describe, expect, it } from 'vitest'
import { parseActivity } from './corpus'

const SRC = String.raw`---
id: act-01
titulo: Suma de matrices
tema: operaciones
---

## Ejercicio 1

Calcula $A+B$.

**Respuesta:** $$\begin{pmatrix}6 & 8 \\ 10 & 12\end{pmatrix}$$

## Ejercicio 2

Resuelve $x+1=3$.

**Respuesta:** $$x=2$$

## Ejercicio 3

Sin respuesta.
`

describe('parseActivity', () => {
  const a = parseActivity(SRC, 'act-01.md')
  it('lee encabezado y ejercicios', () => {
    expect(a.id).toBe('act-01')
    expect(a.title).toBe('Suma de matrices')
    expect(a.exercises.map((e) => e.ref)).toEqual(['act-01/1', 'act-01/2', 'act-01/3'])
    expect(a.exercises[0].statement).toBe('Calcula $A+B$.')
    expect(a.exercises[0].answers).toHaveLength(1)
  })
  it('advierte de respuestas faltantes y no evaluables', () => {
    expect(a.warnings.some((w) => w.includes('act-01/3') && w.includes('sin "**Respuesta:**"'))).toBe(true)
    expect(a.warnings.some((w) => w.includes('act-01/2') && w.includes('no es evaluable'))).toBe(true)
    expect(a.warnings.some((w) => w.includes('act-01/1'))).toBe(false)
  })
})
