# ART-016 — Base de actividades y verificación de la transcripción

> **Tipo:** diseño y estado de implementación<br>
> **Rama:** `feature/corpus-actividades-algebra-lineal`<br>
> **Fecha:** 2026-11-22<br>
> **Relación:** extiende [ART-015](./15-mvp-transcripcion-mathpix.md)

## 1. Problema

Se quiere ofrecer transcripciones **fieles** de 32 actividades de álgebra lineal que resuelven muchos alumnos, cada uno con su método. Eso condiciona cómo se mide la fidelidad:

- La **resolución** varía; el **problema** y su **resultado final** no.
- Por tanto no existe una transcripción "correcta" contra la cual comparar línea por línea. La referencia de la transcripción sigue siendo la **corrección humana** (ART-015 §5).
- La base de actividades aporta otra cosa: una verdad fija (enunciado + respuesta) y, por ser álgebra lineal, la posibilidad de **calcular** lo que el alumno escribió.

## 2. Qué verifica el sistema

| Verificación | Cómo | Qué detecta | Qué no puede decir |
| --- | --- | --- | --- |
| **Respuesta final** | La respuesta esperada (matriz, vector columna, número) se busca entre los valores que el alumno **escribió** (matriz o número literal), en aritmética exacta. | Si el resultado final aparece; si no, la matriz más parecida y las celdas que difieren. | Si el alumno acertó o se equivocó: una diferencia puede ser error del OCR **o** del alumno. |
| **Consistencia aritmética** | Cada igualdad con matrices numéricas (`A+B=C`, `kA`, `AB`, `Aᵀ`, `det`, potencias) se recalcula. | Dígitos mal leídos: señala la celda `(fila,col)` y los dos valores. | Nada sobre ecuaciones con variables o símbolos. |

Reglas de honestidad:

- Un valor **calculado** nunca cuenta como "escrito por el alumno" (una prueba lo cubre: `A+B = (matriz con un 13)` no encuentra la respuesta `12`).
- Lo que no se puede evaluar se marca **no verificable**, jamás "correcto".
- `\left|\begin{array}…\right|` se interpreta como determinante (así lo emite Mathpix) para evitar falsos positivos.

## 3. Formato de la base

Un `.md` por actividad en `corpus/actividades/` (ver [`corpus/README.md`](../../corpus/README.md)): encabezado con `id`/`titulo`/`tema`, un `## Ejercicio N` por ejercicio y `**Respuesta:**` con el resultado final. Se relee del disco en cada consulta y valida al cargar (falta de respuesta, respuesta no evaluable, ids repetidos).

## 4. Estado

Implementado y probado (`pnpm test`: 16 pruebas; flujo de interfaz probado en navegador con el modo simulado):

- parser de actividades, motor de verificación, endpoint `POST /api/checks`, `GET /api/corpus`;
- asignar ejercicios a una página y ver respuesta esperada y verificaciones **en vivo** mientras se corrige;
- informe con "respuesta final frente a la base" (original y corregida).

**Pendiente / no verificado:**

1. **Las 32 actividades reales no están cargadas**: `ejemplo.md` solo ilustra el formato.
2. **No se ha probado con salida real de Mathpix** (ver ART-015 §3): el motor reconoce `array`, `pmatrix`, `bmatrix` y `\left|…\right|`, pero hay que confirmar con hojas reales cómo emite matrices manuscritas.
3. Alcance de cálculo: suma, resta, escalar, producto, transpuesta, potencia entera y determinante con entradas numéricas. No cubre inversa, rango, escalonada, valores propios ni sistemas; se añaden según lo que pidan las actividades.
4. **Formatos de los compañeros**: por ahora el DOCX es un formato propio. Si cada entrega debe respetar la plantilla de cada compañero, es un trabajo aparte (ver preguntas abiertas).

## 5. Preguntas abiertas

- ¿Los "formatos de los compañeros" son plantillas de entrega que el DOCX debe reproducir, o solo cómo suelen presentar sus hojas?
- Para vender el servicio: consentimiento de los alumnos para procesar su manuscrito en Mathpix (con `improve_mathpix: false` no se guarda, pero el contenido sale del equipo), política de datos y expectativa de exactitud que se promete. Con la matriz de [ART-014 §8](./14-matriz-evaluacion-ocr-y-proveedores.md) como punto de partida.
