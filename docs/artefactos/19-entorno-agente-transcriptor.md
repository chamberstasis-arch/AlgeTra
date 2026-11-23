# ART-019 — Entorno para un agente transcriptor supervisado (harness)

> **Tipo:** diseño y estado de implementación<br>
> **Rama:** `feature/corpus-actividades-algebra-lineal`<br>
> **Fecha:** 2026-11-22<br>
> **Relación:** reutiliza [ART-015](./15-mvp-transcripcion-mathpix.md) y [ART-016](./16-corpus-actividades-y-verificacion.md); sustituye, para el arranque, la ruta "aplicación + API de OCR" de [ART-018](./18-alternativas-ocr-precision.md)

## 1. Idea

En vez de una aplicación que llama a un OCR, un **entorno de trabajo** donde un agente de IA (por ejemplo Qwen vía una herramienta de agentes) hace de trabajador: toma una foto de `trabajo/por_procesar/`, lee las instrucciones, la transcribe, se autoverifica con herramientas locales y la deja en otra carpeta. Una persona supervisa, corrige y el entorno aprende de las correcciones.

El agente aporta la **visión**; el entorno aporta lo que un modelo hace mal: contar celdas, recalcular aritmética, comprobar que las fórmulas se convierten a ecuaciones de Word, mover archivos sin perderlos y medir.

## 2. Estructura

```text
harness/INSTRUCCIONES.md     manual del trabajador (fidelidad, formato, procedimiento, límites)
harness/APRENDIZAJES.md      correcciones confirmadas por la persona; el agente las lee al empezar
.claude/skills/transcribir-libreta/SKILL.md   skill (formato Claude Code) que apunta al manual
AGENTS.md, QWEN.md           contexto para otras herramientas de agente
scripts/harness.ts           herramientas: pnpm harness <comando>
server/harness.ts            lógica pura de validación (con pruebas)
trabajo/por_procesar/        entrada: fotos
trabajo/en_proceso/<id>/     la hoja actual (una a la vez)
trabajo/procesadas/<id>/     imagen, transcripcion.md, transcripcion.original.md, documento.docx, informe.json
trabajo/revision/<id>/       igual, pero con [?], dudas o gráficas pendientes
```

## 3. Herramientas del agente (`pnpm harness …`)

| Comando | Quién | Qué hace |
| --- | --- | --- |
| `siguiente` | agente | Toma la foto más antigua, la mueve a `en_proceso/`, reduce la copia si pesa > 3.5 MB y da las rutas. Una hoja a la vez. |
| `validar <id>` | agente | Comprueba `$` sin cerrar, convertibilidad a ecuaciones de Word y **recalcula la aritmética** (señala la celda exacta). Si hay `<!-- ejercicio: act-01/1 -->`, compara con la respuesta esperada. |
| `cerrar <id>` | agente | Se niega si hay errores. Con `[?]`, dudas o gráficas envía la hoja a `revision/`. Genera DOCX e informe. `--revisado` atestigua que reexaminó la imagen y el error aritmético es del alumno. |
| `reabrir <id>` | persona | Devuelve una hoja a `en_proceso/` para rehacerla con tu retroalimentación. |
| `aprobar <id>` | persona | Tras editar `transcripcion.md` a mano, fija tu versión como referencia, regenera el DOCX y calcula la exactitud del agente. |
| `medir` | persona | Resume exactitud sobre las hojas aprobadas (`trabajo/metricas.md`). |
| `aprender "…"` | persona o agente | Añade una regla a `APRENDIZAJES.md`. |
| `estado` | ambos | Cuenta hojas por carpeta. |

Los comentarios `<!-- … -->` son el canal del agente hacia la persona (dudas, ejercicio, tachados); **no llegan al DOCX**.

## 4. Salvaguardas de precisión

- **Fidelidad por instrucción:** transcribir lo visto, no corregir al alumno, `[?]` en lugar de adivinar.
- **Segunda pasada obligatoria** celda por celda antes de validar.
- **Recalculo aritmético independiente** del modelo: es la red de seguridad contra dígitos mal leídos.
- **El agente no lee `corpus/`:** el validador compara por él. Si acomodara su lectura a la respuesta esperada, se perdería la medición (es una instrucción; el entorno no lo impide técnicamente).
- **Referencia = tu corrección,** como en el MVP: solo las hojas aprobadas cuentan.

## 5. Lo que se verificó y lo que no

Verificado en esta máquina (22 pruebas automáticas pasan; flujo de extremo a extremo con una hoja simulada): `siguiente`, `validar` (detectó la celda `(2,2)` con 13 en lugar de 12), `cerrar` (negó cerrar y luego envió a `revision/`), `aprobar`, `medir`, `aprender`, reducción de fotos grandes, y que las notas del agente no aparecen en el DOCX.

**No verificado:**

- Que la herramienta de agentes elegida (p. ej. Qwen Code) **lea imágenes** con el modelo y la clave del plan, y que **cargue** `QWEN.md`/`AGENTS.md`. La skill usa el formato de Claude Code; otras herramientas pueden ignorarla. El manual funciona igual si se le pide al agente "lee `harness/INSTRUCCIONES.md`".
- La **precisión real** del modelo con letra de libreta y matrices.
- Cuántos *credits* consume una hoja.
- Todo el flujo con un agente real: aquí se simuló escribiendo yo la transcripción.

## 6. Cumplimiento del plan de Alibaba

La guía del Token Plan personal ([ART-018 §5](./18-alternativas-ocr-precision.md)) permite uso **interactivo dentro de herramientas de agentes** y prohíbe scripts, backends y lotes no interactivos. Este diseño lo respeta en lo técnico: **ningún script de este repositorio llama a la clave del plan**; las herramientas son locales y es el agente, iniciado y supervisado por una persona, quien usa el modelo.

Riesgos que quedan, que el entorno no puede eliminar:

- Dejar al agente procesando carpetas enteras sin atención se parece a un "lote no interactivo". Conviene supervisar y pedir hoja por hoja o en tandas cortas.
- El plan es para "desarrollo individual interactivo" y de uso exclusivo del suscriptor. Las páginas leídas no mencionan "uso comercial" ni "reventa", pero tampoco lo autorizan para trabajo pagado de terceros. La clave no se comparte con clientes.
- El plan es solo de Singapur, con transferencia transfronteriza de datos: las fotos son escritos de terceros.

## 7. Límites actuales y siguiente paso

- **Gráficas:** el agente solo las describe (`[Gráfica: …]`) y la hoja va a `revision/`. El motor de dibujo de [ART-017](./17-graficas-y-modelo-local.md) no está construido.
- **Sin DOCX único por actividad:** cada hoja genera su propio documento.
- **Evolución:** el mismo manual y las mismas herramientas sirven si después el agente corre detrás de una API de pago por uso (OpenRouter o la de Alibaba); solo cambia quién lo ejecuta.
