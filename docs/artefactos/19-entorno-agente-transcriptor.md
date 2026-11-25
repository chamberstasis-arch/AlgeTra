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
  - Cubre: matrices (suma, resta, producto, determinante, transpuesta), **números** (fracciones, decimales, potencias, raíces `\sqrt`, divisiones), **vectores** (`2i − 3j + 4k` o `(2, −3, 4)`; suma, escalar, producto punto, producto cruz —también como determinante `| i j k |`— y norma `|v|`).
  - Las raíces y divisiones se comparan con tolerancia; un decimal escrito se acepta si es el **redondeo o el truncamiento** del valor exacto (`√21 = 4.58`), no si es otro (`4.4`).
  - **Símbolos definidos en la misma hoja** (`v = 4i − 2j + k`, `A = …`) se usan para comprobar las líneas siguientes (`|v| = √(16+4+1)`). Solo las letras `A–Z`, `u v w p q`: las incógnitas `x y z` no se arrastran entre ejercicios. Redefinir un símbolo no es una contradicción.
  - **No cubre:** funciones trigonométricas (`cos α = a/|v|` queda no verificable), inversas, escalonamiento paso a paso, ni nada con variables sin definir. Lo que no entiende lo marca *no verificable*, nunca *correcto*.
  - Medido sobre la primera hoja real (act-23): de 35 fórmulas, 0 verificadas antes y 12 ahora; 0 falsos positivos en las 370 ecuaciones de los 32 enunciados.
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

## Estilo del documento y edición sin reprocesar

El contenido (lo que transcribió el agente) y la presentación están separados. El DOCX y el PDF **se derivan** de `transcripcion.md`, así que corregir una hoja o cambiar el estilo **no requiere volver a procesar nada ni gasta plan**.

- **Estilo por entrega**, en `trabajo/entregas/<entrega>/estilo.json`. Controla tipografía (Calibri, Cambria, Arial, Times New Roman, Georgia, Verdana), tamaño, interlineado, márgenes, papel, alineación, ecuaciones (centradas o a la izquierda), color de títulos, título del documento, número de página y, para las gráficas: paleta, grosor, cuadrícula, ancho y tamaño de etiquetas. Todo valor se recorta a límites sensatos (`src/shared/estilo.ts`).
- **Presets** `limpio` (por defecto), `cuaderno`, `formal`, `compacto`.
- **Variar:** deriva un estilo de una semilla (por defecto el nombre de la entrega). La misma semilla da siempre el mismo estilo; otra semilla, otro. Solo elige combinaciones legibles.
- **Por defecto no se imprime el nombre interno de la entrega** como título (`titulo: ninguno`): el documento sale limpio. Se puede activar.
- **Las ecuaciones siguen siendo nativas de Word con cualquier estilo.** Su tipografía es la matemática de Word (Cambria Math); el estilo cambia el texto, los márgenes, el espaciado y las gráficas. Los números de los ejes de una gráfica no se pueden ocultar con el estilo: son parte de lo que escribió el alumno.
- **Interfaz** (`pnpm ui`): botón «Estilo» en cada entrega (preset, Variar, Otra variación, campos manuales, «Aplicar y regenerar») y pestaña «Editar transcripción» en cada hoja cerrada («Guardar y regenerar» / «Guardar y aprobar»). Al guardar se rehacen el DOCX de la hoja y el de la entrega, con el mismo orden que tenía.
- **Línea de comandos:** `pnpm harness estilo <entrega> [--preset p | --variar [semilla]]`.
- Las fuentes solo se ven como en el estilo si el Word de quien abre el documento las tiene; la vista previa en PDF (LibreOffice) puede sustituir alguna.

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

## Entregas grandes: ZIP, un solo documento y formato

**Carga.** Un ZIP (también con subcarpetas, ZIP dentro de ZIP hasta dos niveles) se sube como cualquier archivo, por la interfaz o con `pnpm harness importar <archivo.zip> --entrega <nombre>`. Cada archivo de dentro (JPG, PNG, WebP, HEIC, PDF —cada página es una imagen—, DOCX) se convierte y va a la misma entrega, en el orden natural de su ruta. Se ignoran `__MACOSX`, archivos ocultos, `Thumbs.db`; límites: 400 archivos y 1.5 GB descomprimido por ZIP. Cada subida es una entrega: si no se escribe nombre, se genera uno nuevo (o el del ZIP).

**Un solo documento.** Al cerrar la última hoja de la entrega, `cerrar` la ensambla sola. El orden es por actividad (1, 2, 3…) → ejercicio → inciso, no el orden de llegada. Una hoja que continúa a la anterior (sin marca) se queda con ella. Si una hoja no trae marca de actividad, el ensamblado lo avisa y su contenido va al inicio sin título.

**Formato.** Cada actividad lleva solo `Actividad N` (derivado de la marca `act-NN`) y debajo la transcripción. No hay subtítulo con fecha ni nombre interno; el renglón de encabezado del alumno (fecha y/o "Actividad N") se quita al ensamblar. El título del documento completo es opcional (estilo → «Título del documento»).

**Separación.** Los renglones del desarrollo van apretados; el aire grande solo se deja antes de cada inciso o numeral (`a)`, `1.`, `iv)`), y se escala con el estilo (`espaciado`: compacto/normal/amplio). Las ecuaciones van a la izquierda con una sangría pequeña (como en la libreta); «centradas» sigue siendo opción. «Cada actividad en hoja nueva» es opcional.

## Ejemplo de formato (extraer el estilo de un documento)

En «Estilo» → «Desde un ejemplo…» se sube un DOCX o un PDF y se propone un estilo a partir de él (`pnpm harness estilo <entrega> --desde ejemplo.docx` hace lo mismo y lo aplica). Es **determinista, sin modelo**: un ejemplo hecho por una IA suele traer formato directo, fuentes sueltas y valores inconsistentes, así que cada valor es el **más frecuente ponderado por cantidad de texto**, nunca el primero que aparece, y lo que no se puede asegurar se reporta como «no se pudo asegurar» en lugar de inventarse. La propuesta no se guarda sola: se ve, se ajusta y se aplica.

- **DOCX** (lo más preciso): tipografía (resuelve fuentes de tema y los valores por defecto de Word), tamaño, interlineado, espacio entre párrafos, alineación, color de títulos, alineación de las ecuaciones nativas, salto de hoja entre actividades, papel, márgenes y número de página.
- **PDF**: tipografía y tamaño del texto, papel, márgenes, justificado o no, número de página, color de títulos y una estimación de interlineado y espaciado (marcada como incierta). No puede saber cómo están alineadas las ecuaciones.
- **Foto o captura**: se rechaza con un mensaje claro; de una imagen no se leen con certeza tipografías ni márgenes. Se pide el DOCX original o un PDF.
- Una tipografía que no admitimos se sustituye por la más parecida y se avisa; las ecuaciones del ejemplo no se copian (las nuestras siempre son nativas).
- Medido de ida y vuelta: un documento generado con cada preset devuelve ese mismo estilo al extraerlo (13 pruebas, DOCX y PDF).

## Interfaz

Una sola acción principal (soltar un ZIP o fotos). Las entregas son una lista con barra de progreso; al abrir una se ven Documento, Hojas (miniaturas con un punto de estado), Estilo y Avisos. Las fotos subidas sin nombre quedan como «Hojas sin entrega» y se agrupan en una entrega con un botón (`pnpm harness agrupar <entrega>`). Las miniaturas se generan al vuelo (JPEG pequeño en caché), en vez de cargar cada foto completa.

## Lo medido con 62 fotos reales de libreta

45 de 62 fotos traían la orientación guardada como etiqueta EXIF (píxeles de lado): ahora se aplica el giro al subirlas. Con las umbrales anteriores, 61 de 62 salían marcadas «algo borrosa» (el aviso no distinguía nada y obligaba a mirar una segunda imagen por hoja); se recalibró con las fotos reales (nitidez 1.2–3.0, todas legibles a tamaño completo).

## Varios agentes a la vez (orquestador + subagentes)

`pnpm harness siguiente` y el ensamblado final corren bajo un candado entre procesos (`conLock`): dos agentes nunca reciben la misma hoja y cada una lleva su orden. Se probó con 4 procesos simultáneos (4 hojas distintas, orden 1–4, un solo documento al cerrar). El candado abandonado se libera a los 30 s.

- `.qwen/agents/transcriptor.md`: subagente que procesa hasta 3 hojas con contexto limpio y devuelve una tabla de ≤8 líneas.
- `harness/PROMPT_ORQUESTADOR.md` (botón «Prompt: orquestador» en la UI): una sola sesión lanza 3 subagentes en paralelo por ronda, máximo 3 rondas (≈27 hojas), y reporta una tabla unida.
- No verificado con Qwen Code real: que respete el paralelismo y que `.qwen/agents/` se descubra en el proyecto (la documentación no indica límite de concurrencia).

## Modo rápido (menos costo y tiempo)

El primer lote real costó más de lo estimado (≈2 min y mucho contexto por hoja). Se recortó el flujo, aceptando algo menos de precisión:

- `harness/RAPIDO.md` (≈2 KB) sustituye a `INSTRUCCIONES.md` (12 KB) para los agentes; el manual largo queda como referencia.
- Una sola pasada: sin segunda lectura de la imagen, sin `validar` aparte (`cerrar` ya valida), sin comentarios de tachados ni notas.
- La actividad sale del número del encabezado de la hoja; ya no se consulta la base de enunciados.
- Una aritmética que no cuadra ya no bloquea el cierre: manda la hoja a revisión con la celda señalada (antes obligaba a volver a mirar la imagen y cerrar con `--revisado`).
- Figuras 3D e isométricas: una línea `[Gráfica 3D: …]` en vez de un bloque JSON; la persona las revisa.
- Subagentes de 4 hojas y 4 en paralelo (`.qwen/agents/` y `.opencode/agents/`); el orquestador no relee manuales ni tablas.

## Limpieza de formato del documento ensamblado

Se revisó el DOCX ensamblado de la entrega real (82 páginas) y se corrigió:

- Tablas de barras (`| x | y |`) salían como texto con barras: ahora son tablas de Word.
- Los espacios de `\qquad`/`\quad` entre pasos de un mismo renglón se perdían ("x−y=2|−2|−2x…"): ahora van como texto normal dentro de la fórmula.
- Una ecuación que termina en "=" (el alumno no puso resultado) dibujaba un "¿" rojo: se rellena con un espacio.
- Orden: por actividad (1, 2, 3…) respetando el orden del cuaderno dentro de cada una; antes se ordenaba por ejercicio entre hojas y se intercalaban ejercicios repetidos. Una marca solo de inciso hereda la actividad, y el enunciado que abre la primera hoja se queda con la primera actividad (antes quedaban al inicio, sin título).
- `#` en la transcripción impide cerrar (el título lo pone el sistema).
- `pnpm harness formato <entrega>`: revisión de texto del ensamblado (renglones sin título, actividades faltantes/vacías/repetidas, renglones duplicados, ecuaciones sin resultado, figuras solo descritas).
- Los agentes hacen antes de cerrar una revisión de formato de su propio texto (sin volver a la imagen); `cerrar <id> --siguiente` cierra y entrega la hoja siguiente en la misma respuesta (menos vueltas por hoja).

Nota: la vista previa PDF usa LibreOffice; la fidelidad final de las ecuaciones debe confirmarse abriendo el DOCX en Word.
