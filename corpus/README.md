# Base de actividades (corpus)

Cada actividad es **un archivo `.md`** en `corpus/actividades/`. Se leen del disco en cada consulta: edita, recarga la página y listo.

```markdown
---
id: act-01
titulo: Suma de matrices
tema: operaciones-matriciales
---

## Ejercicio 1

Enunciado con $fórmulas$ en LaTeX.

**Respuesta:** $$\begin{pmatrix}6 & 8 \\ 10 & 12\end{pmatrix}$$

## Ejercicio 2
…
```

Reglas:

- `id` único por actividad (`act-01`…`act-32`). Los ejercicios se citan como `act-01/1`.
- Cada ejercicio empieza con `## Ejercicio N`.
- **La respuesta es el resultado final, no el procedimiento**: cada alumno puede resolver distinto. Escribe una fórmula por resultado (varios incisos → varias fórmulas).
- Matrices con `pmatrix`, `bmatrix` o `array`; números enteros, decimales o fracciones (`\frac{1}{2}`).
- Respuestas simbólicas (`\lambda=2`, `x=y+1`) se muestran pero no se verifican automáticamente.
- La interfaz muestra advertencias si falta la respuesta o no es evaluable.

El archivo `ejemplo.md` solo ilustra el formato; bórralo al cargar las actividades reales.
