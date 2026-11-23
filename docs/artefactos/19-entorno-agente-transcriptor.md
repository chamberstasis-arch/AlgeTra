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
harness/INSTRUCCIONES.md     manual del trabajador (fidelidad, formato, organización, gráficas, procedimiento, límites)
harness/APRENDIZAJES.md      correcciones confirmadas por la persona; el agente las lee al empezar
harness/PROMPT_INICIO.md     prompt para arrancar al agente hoja a hoja (el botón de la interfaz lo copia)
harness/PROMPT_ENTREGA.md    prompt para procesar una entrega completa y ensamblarla
.claude/skills/transcribir-libreta/SKILL.md   skill (formato Claude Code) que apunta al manual
AGENTS.md, QWEN.md           contexto para otras herramientas de agente
scripts/harness.ts           herramientas del agente: pnpm harness <comando>
server/ui.ts + ui/index.html interfaz de carga y consulta: pnpm ui (puerto 8080 o el siguiente libre)
server/workspace.ts          carpetas, entrada de archivos, calidad de imagen, ensamblado, PDF
server/harness.ts            lógica pura de validación y de ordenamiento (con pruebas)
src/shared/figure.ts, expr.ts   motor de gráficas (JSON → SVG) y evaluador de expresiones
server/figures.ts            SVG → PNG (resvg) para incrustar en el DOCX
trabajo/por_procesar/[entrega/]  entrada: fotos (o carpeta por entrega)
trabajo/en_proceso/<id>/     la hoja actual (una a la vez)
trabajo/procesadas/<id>/     imagen, transcripcion.md, transcripcion.original.md, documento.docx, informe.json
trabajo/revision/<id>/       igual, pero con [?], dudas, escala inferida o figuras sin dibujar
trabajo/entregas/<entrega>/  documento.docx ensamblado, ensamblado.md, ensamblado.json
```

## 3. Herramientas del agente (`pnpm harness …`)

| Comando | Quién | Qué hace |
| --- | --- | --- |
| `siguiente` | agente | Toma la siguiente foto (por entrega y nombre), analiza su calidad (borrosa, oscura, baja resolución), genera una copia mejorada si hace falta y da las rutas. Una hoja a la vez. |
| `actividades [texto]` | agente | Lista los **enunciados** de la base (nunca las respuestas) para identificar actividad y ejercicio. |
| `validar <id>` | agente | Comprueba `$` sin cerrar, convertibilidad a ecuaciones de Word y **recalcula la aritmética** (señala la celda exacta). Si hay `<!-- ejercicio: act-01/1 -->`, compara con la respuesta esperada. |
| `cerrar <id>` | agente | Se niega si hay errores. Con `[?]`, dudas o gráficas envía la hoja a `revision/`. Genera DOCX e informe. `--revisado` atestigua que reexaminó la imagen y el error aritmético es del alumno. |
| `ensamblar <entrega>` | ambos | Une las hojas cerradas de una entrega en un documento ordenado por actividad → ejercicio → inciso. Avisa de ejercicios de la base que faltan. |
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

## 4 bis. Lo que se agregó para trabajar con fotos reales

**Entrada.** La interfaz y `ingest()` aceptan JPG, PNG, WebP, HEIC, PDF y DOCX/ODT/RTF. Todo termina siendo **imagen**: los PDF se rasterizan con `pdftoppm` (170 dpi, máximo 60 páginas) y los documentos de Word pasan antes por LibreOffice. Un DOCX convertido se lee como imagen: sus ecuaciones dejan de ser texto.

**Calidad de imagen (datos borrosos).** Con ImageMagick se mide nitidez (varianza del laplaciano relativa al contraste), brillo, contraste y resolución. Banderas: `borrosa`, `algo_borrosa`, `oscura`, `bajo_contraste`, `baja_resolucion`. Se muestran en la cola, se avisan al subir y el agente las recibe con una instrucción concreta (usar `[?]`, mirar la copia mejorada). Los umbrales se calibraron con imágenes **sintéticas** (nítida 5.1, algo borrosa 2.1, borrosa 0.4); **hay que reajustarlos con fotos reales**. No se detecta sobreexposición: una foto quemada y una página digital blanca dan métricas casi iguales.

**Entregas y orden.** Una entrega es una carpeta (`por_procesar/act03_alumnoA/`) con las hojas de un alumno. El agente marca `<!-- ejercicio: act-03/2 -->` e `<!-- inciso: b -->` donde empieza cada parte; `ensamblar` ordena por actividad, ejercicio (numérico) e inciso. Lo que va sin marca es continuación y se queda con lo anterior; con `--orden-original` se respeta el orden de las fotos. No se inyectan encabezados: **solo sale lo que el alumno escribió**.

**Identificar la actividad sin ver las respuestas.** Se necesita la base de actividades para dos cosas distintas: (1) saber qué ejercicio es una hoja y (2) comprobar respuestas. Para (1) basta el enunciado: `pnpm harness actividades`. Las respuestas esperadas las usa solo el validador. Mantener esa separación evita que el agente acomode su lectura a la respuesta. No es técnicamente obligatoria (el agente puede leer `corpus/`); es una instrucción.

**Organización de cada actividad.** El documento sigue el orden de los bloques de la hoja (texto, fórmulas, gráficas). Si una actividad es *texto-gráfica-texto-gráfica* y otra *texto-texto-texto-gráfica-gráfica*, así queda; el DOCX no impone plantilla.

**Gráficas.** El agente las describe en un bloque ` ```grafica ` con JSON (rectas, segmentos, vectores, puntos, funciones, polígonos, texto), en la posición donde el alumno la dibujó. `src/shared/figure.ts` las dibuja en SVG, `resvg` las convierte a PNG y `docx.ts` las incrusta en su lugar, con el JSON como texto alternativo. La escala es explícita: `leida` (números escritos), `sin_valores` (no se dibuja ninguno: es lo habitual en libreta), `inferida` (se pinta en gris y rotulada "escala inferida"; envía la hoja a revisión). Se dibuja lo que el alumno dibujó, aunque esté mal. Si el JSON es inválido, el DOCX conserva el bloque resaltado y `validar` impide cerrar.

**Cómo lo hacen Word y otras herramientas** (consultado hoy; lo no confirmado se indica):

| Opción | Qué es | Para este caso |
| --- | --- | --- |
| Gráfico de Word (Insertar → Gráfico) | Parte DrawingML de gráfico con datos editables; el tipo XY (dispersión) admite puntos y líneas. La especificación define puntas de flecha en líneas (`a:tailEnd`), pero **no confirmé que Word las aplique a las series de un gráfico**, y LibreOffice tiene un [error reportado](https://www.libreoffice.org/bugzilla/show_bug.cgi?id=138563) al importar flechas en gráficos (lo usamos para la vista previa en PDF). | Sirve para funciones y puntos; vectores, rectas ilimitadas y etiquetas libres no son nativos. Futuro posible. |
| Formas de Word (Insertar → Formas) | Líneas y conectores con flecha, editables. | No hay ejes ni escala; habría que construir todo a mano. |
| GeoGebra, Desmos, TikZ/PGFPlots, matplotlib | Motores de gráficas matemáticas. No se consultaron en esta sesión (conocimiento general): exportan imagen y no insertan un objeto editable en Word. | Mismo resultado que este diseño (imagen), con más dependencias. |
| **Elegido: SVG propio → PNG incrustado** | Determinista, sin Python ni navegador, idéntico en Word, LibreOffice y PDF. | La imagen no es editable en Word; la fuente editable es el JSON. Los planos 3D no están cubiertos. |

## 4 ter. Cómo arranca el agente

1. Instala y configura tu herramienta de agentes según la guía del plan (ver [ART-018 §5](./18-alternativas-ocr-precision.md)). En Qwen Code el modelo y la clave se declaran en `~/.qwen/settings.json` o con variables de entorno; **para imágenes, la documentación habla de un modelo de visión "puente" (`/model --vision`); no verifiqué que `@ruta` lea imágenes directamente.** Eso es lo primero que hay que comprobar.
2. Abre la herramienta en la raíz del repositorio (así carga `QWEN.md`/`AGENTS.md`).
3. Pega `harness/PROMPT_INICIO.md` (o `PROMPT_ENTREGA.md` para una entrega completa; el botón de la interfaz copia el primero). El prompt obliga a leer el manual y los aprendizajes, y a una **prueba de visión**: abrir la primera imagen y describirla; si no puede verla, debe detenerse en lugar de transcribir a ciegas.

## 5. Lo que se verificó y lo que no

Verificado en esta máquina (33 pruebas automáticas pasan; flujo de extremo a extremo con hojas simuladas y la interfaz en un navegador): subida de imágenes, PDF y DOCX; calidad de imagen (detectó una foto borrosa); puerto alterno cuando el 8080 está ocupado; `siguiente`, `validar`, `cerrar`, `aprobar`, `medir`, `aprender`, `actividades`; ensamblado de 3 hojas desordenadas en el orden correcto con la gráfica en su posición; vista del PDF con ecuaciones y gráfica; descarga de DOCX/PDF/MD; las notas del agente no llegan al DOCX.

**No verificado:**

- Que la herramienta de agentes elegida **lea imágenes** con el modelo y la clave del plan, y que cargue `QWEN.md`/`AGENTS.md`. La skill usa el formato de Claude Code; otras herramientas pueden ignorarla.
- La **precisión real** del modelo con letra de libreta, matrices y su descripción de gráficas; los umbrales de calidad con fotos reales.
- Cuántos *credits* consume una hoja.
- Todo el flujo con un agente real: aquí lo simulé escribiendo yo las transcripciones.
- El DOCX en Microsoft Word (se probó con LibreOffice).

## 6. Cumplimiento del plan de Alibaba

La guía del Token Plan personal ([ART-018 §5](./18-alternativas-ocr-precision.md)) permite uso **interactivo dentro de herramientas de agentes** y prohíbe scripts, backends y lotes no interactivos. Este diseño lo respeta en lo técnico: **ningún script de este repositorio llama a la clave del plan**; las herramientas son locales y es el agente, iniciado y supervisado por una persona, quien usa el modelo.

Riesgos que quedan, que el entorno no puede eliminar:

- Dejar al agente procesando carpetas enteras sin atención se parece a un "lote no interactivo". Conviene supervisar y pedir hoja por hoja o en tandas cortas.
- El plan es para "desarrollo individual interactivo" y de uso exclusivo del suscriptor. Las páginas leídas no mencionan "uso comercial" ni "reventa", pero tampoco lo autorizan para trabajo pagado de terceros. La clave no se comparte con clientes.
- El plan es solo de Singapur, con transferencia transfronteriza de datos: las fotos son escritos de terceros.

## 7. Límites actuales y siguiente paso

- **Gráficas:** solo cartesianas 2D (rectas, vectores, puntos, funciones, polígonos). Sin planos 3D ni geometría compleja (esas van como `[Gráfica: …]` y a revisión). La imagen no es editable en Word.
- **Ensamblado:** une lo marcado por el agente; si no marcó ejercicios, el orden es el de las fotos. Los incisos se ordenan alfabéticamente.
- **Evolución:** el mismo manual y las mismas herramientas sirven si después el agente corre detrás de una API de pago por uso (OpenRouter o la de Alibaba); solo cambia quién lo ejecuta. La interfaz **no** lanza al agente: lo inicias tú, como pide el plan.
