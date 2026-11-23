# ART-017 — Gráficas de libreta y modelo de IA local (investigación)

> **Tipo:** investigación y propuesta de integración (**nada de esto está implementado**)<br>
> **Rama:** `feature/corpus-actividades-algebra-lineal` (solo aquí; se formalizará después)<br>
> **Fecha:** 2026-11-22<br>
> **Relación:** extiende [ART-015](./15-mvp-transcripcion-mathpix.md) y [ART-016](./16-corpus-actividades-y-verificacion.md)

## 1. Qué se pide

Las entradas reales son **fotos de libretas** de compañeros. Hay que pasarlas a digital con:

1. **Fórmulas** nativas de Word, **tal como están escritas** (no se resuelven ni se reescriben). Ya lo hace el MVP (Mathpix → LaTeX → OMML).
2. **Gráficas** regeneradas con un motor de dibujo, no redibujadas a mano.
3. En una libreta, la gráfica casi nunca trae valores en los ejes; hay que **inferir la escala**. Se propone evaluar un **modelo de IA local** para esa inferencia.

La respuesta a la pregunta abierta anterior es entonces: no hay plantillas de los compañeros que reproducir; el formato del DOCX sigue siendo el propio.

## 2. Principio de fidelidad para gráficas

- Se dibuja **lo que el alumno dibujó**, aunque esté mal. No se sustituye por la gráfica "correcta".
- Todo valor que no esté escrito en la foto es **inferido** y se marca así (en la interfaz, en el informe y en el pie de figura). Nunca se presenta como dato leído.
- Si el ejercicio está en la base ([ART-016](./16-corpus-actividades-y-verificacion.md)) y es graficable (por ejemplo "grafica `y = 2x + 1`"), la gráfica esperada sirve para **comparar**, no para reemplazar.

## 3. Qué ofrece Mathpix para figuras

Según la documentación consultada hoy (la estructura exacta de la respuesta **no está confirmada**; falta un ejemplo real):

- Con `include_line_data: true` (que ya usa el MVP), `/v3/text` devuelve líneas de tipo `diagram` o `chart` con su caja (`cnt`).
- `include_diagram_text` extrae el texto dentro de diagramas (etiquetas, números de ejes), con `parent_id` hacia el diagrama.
- **No recorta las figuras** en `/v3/text`; para eso hay que usar `/v3/pdf`. No hace falta: el recorte se hace localmente con las coordenadas.
- No encontré un tipo "gráfica de función" ni ninguna interpretación de la gráfica (solo localización y texto).

Consecuencia: Mathpix sirve para **localizar** la figura y leer sus etiquetas, no para entenderla.

## 4. Cadena propuesta para una gráfica

```text
foto → Mathpix (línea tipo diagram/chart + texto interno) → recorte local
     → intérprete → GraphSpec (JSON) → calibración de ejes → revisión humana
     → motor de dibujo → PNG/SVG → DOCX (imagen + texto alternativo con el spec)
```

### 4.1 GraphSpec

Un JSON pequeño y validable que separa **qué hay** de **cómo se ve**:

- `kind`: `lines_2d` (sistemas de ecuaciones), `vectors_2d`, `function_2d`, `region_2d`, `plane_3d`, `transform_2d`.
- `axes`: rangos, marcas, etiquetas y, para cada valor, su origen: `leido` | `deducido` | `supuesto`.
- `elements`: rectas (pendiente/ordenada o dos puntos), vectores (origen, fin), puntos con etiqueta, curvas (expresión o muestras), regiones.
- `labels`: textos de la figura y a qué elemento pertenecen.
- `confidence` por elemento.

El JSON es lo que se corrige en la interfaz y lo que se guarda; la imagen se regenera siempre desde él.

### 4.2 Inferir la escala (por capas, de más fiable a menos)

1. **Leído**: números de los ejes extraídos por OCR.
2. **Deducido, determinista**: si hay puntos con coordenadas escritas (`(2,3)`), o una ecuación junto a la recta (`y = 2x+1`), se calibra pixel→unidad por mínimos cuadrados. Con 2 puntos conocidos hay solución; con más, se mide el error. No requiere IA.
3. **Cuadrícula**: muchas libretas son cuadriculadas. Contar cuadros entre marcas y asumir 1 cuadro = 1 unidad **solo si** nada contradice. Marcado como `supuesto`.
4. **Modelo de IA**: para lo que las capas anteriores no resuelven (tipo de gráfica, qué recta es cuál, a qué ecuación corresponde una etiqueta ambigua).
5. **Persona**: la interfaz muestra recorte original y gráfica regenerada lado a lado, con la escala editable.

### 4.3 Motor de dibujo

| Opción | Pros | Contras |
| --- | --- | --- |
| **matplotlib** (sidecar Python) | Cubre 2D y planos en 3D, flechas, regiones, funciones; salida PNG/SVG; control total. | Añade Python al proyecto (hoy es solo Node). |
| Vega-Lite (Node) | Sin Python; SVG determinista. | Flechas, vectores y 3D son incómodos. |
| SVG propio (Node) | Sin dependencias. | Hay que escribir ejes, flechas, regiones y rótulos. |
| Gráfica nativa de Word (DrawingML + libro de Excel incrustado) | Editable en Word. | No soporta vectores/flechas/regiones; complejo; poco valor para este caso. |

Recomendación para esta rama: **matplotlib** como proceso auxiliar para probar rápido. Se reevalúa al formalizar. El DOCX lleva la imagen (PNG a 300 dpi) con el spec como texto alternativo.

## 5. Modelo de IA local: qué implica

### 5.1 Tu equipo

Medido hoy en esta máquina: **RTX 3050 de 6 GB**, 31 GB de RAM, 20 hilos, driver NVIDIA instalado (`nvidia-smi` responde), Docker disponible. **Ollama y llama.cpp no están instalados.** Quedan ~100 GB libres en disco.

### 5.2 Candidatos (según fuentes de terceros; sin probar aquí)

| Modelo | Tamaño aprox. cuantizado | ¿Cabe en 6 GB? |
| --- | --- | --- |
| Qwen3-VL 4B (Q4) | ~3,3 GB + proyector de visión + caché | Sí, con contexto corto. Es el punto de partida. |
| Gemma 4 4B | similar | Sí, probable. |
| Qwen3-VL 8B (Q4) | ~5–6 GB solo los pesos | No completo: parte iría a la RAM y sería lento. |
| Modelos de 27B+ | > 16 GB | No. |
| Modelos OCR pequeños (p. ej. PaddleOCR-VL 0,9B, GLM-OCR 0,9B) | < 2 GB | Sí, pero son de texto/documento, no de gráficas. |

Advertencias:

- Las cifras de memoria **se contradicen entre fuentes** (para el 8B van de 5 a 12 GB). Hay que medir con `ollama ps` o `nvidia-smi`.
- Una fuente indica que Ollama aún no conecta bien el componente de visión de algunos modelos Qwen más nuevos; en ese caso se usa llama.cpp (`llama-server`). Hay que verificar con el modelo elegido.
- Las clasificaciones y puntuaciones citadas vienen de blogs agregadores; no las tomes como medición propia.

### 5.3 Qué sí y qué no le conviene hacer

**Sí**: decir qué tipo de gráfica es, qué elementos tiene, cuál etiqueta va con cuál elemento, y estimaciones cualitativas (pendiente positiva/negativa, cortes con ejes, número de rectas).

**No** (mal fiable en modelos pequeños): leer coordenadas numéricas precisas desde píxeles. Para eso van la visión clásica (OpenCV: ejes, rectas por Hough, puntas de flecha) y la calibración determinista de 4.2.

**No sustituye a Mathpix** para transcribir: la escritura matemática a mano es donde los modelos generales siguen con una brecha amplia (el benchmark [WildHandBench](https://arxiv.org/pdf/2608.22959) lo reporta; el dato exacto estaba truncado en la búsqueda).

### 5.4 Cómo se hace fiable (porque un modelo pequeño inventa)

1. **Salida restringida**: el modelo solo puede responder con el JSON del GraphSpec (Ollama acepta un esquema en `format`; llama.cpp, gramáticas).
2. **Validar y re-dibujar**: se regenera la gráfica desde el spec y se superpone sobre el recorte. Si el trazo no coincide, la confianza baja y se pasa a revisión humana.
3. **Medirlo igual que la transcripción**: con las gráficas corregidas por la persona se calcula tipo acertado, elementos acertados y error de escala (mismo enfoque que [ART-015](./15-mvp-transcripcion-mathpix.md) §5).
4. Guardar la respuesta bruta del modelo junto a cada figura, como se hace con `raw/` de Mathpix.

### 5.5 Costos y riesgos

- **Dinero**: sin costo por llamada. Tiempo: descarga de 3–6 GB y configuración.
- **Latencia**: no medida. Con una GPU de 6 GB, un modelo de 4B puede tardar de segundos a decenas de segundos por figura (**estimación, no medición**); con descarga parcial a CPU, bastante más.
- **Concurrencia**: una sola GPU → cola con concurrencia 1 para el modelo, aparte de la de Mathpix.
- **Privacidad**: la figura no sale de tu máquina. Pero la página completa sí viaja a Mathpix para transcribirse; eso no cambia.
- **Producción**: un servicio vendido necesitará una GPU dedicada o un proveedor; esto se decide al formalizar, no ahora.
- **Referencia útil**: medir también un modelo multimodal en la nube como techo de exactitud para decidir si lo local alcanza. Implicaría enviar las imágenes fuera, así que solo con las muestras que autorices.

## 6. Integración propuesta (solo en esta rama)

```text
server/
  graphs/
    spec.ts          # tipos + validación del GraphSpec (zod o a mano)
    calibrate.ts     # calibración determinista pixel→unidad
    interpret.ts     # interfaz GraphInterpreter { interpret(crop, ctx): GraphSpec }
    ollama.ts        # implementación contra http://localhost:11434 (/api/chat con images)
    render.ts        # llama al motor (matplotlib) y devuelve PNG/SVG
  render/plot.py     # sidecar: lee GraphSpec por stdin, escribe PNG/SVG
```

- **Configuración**: `VLM_BASE_URL`, `VLM_MODEL`, `VLM_ENABLED`; si falta, las figuras se marcan "sin interpretar" y se exportan como recorte original en el DOCX (nunca se pierde la gráfica).
- **Datos**: cada página gana `figures[]` con caja, recorte, spec, respuesta bruta y estado de revisión; se guardan bajo `data/runs/<id>/figures/`.
- **DOCX**: `docx.ts` incorpora imágenes (relaciones + `<w:drawing>`); hoy no las admite. Orden de aparición respetado según la posición en la página.
- **Interfaz**: panel de figuras en la revisión (recorte | regenerada | spec editable | escala `leido/deducido/supuesto`).
- **Docker**: servicio `ollama` con GPU requiere `nvidia-container-toolkit` (no verificado aquí); en desarrollo es más simple correrlo en el equipo.
- **Base de actividades**: los ejercicios graficables pueden guardar su GraphSpec esperado en el `.md`.

## 7. Plan por fases y criterio de decisión

| Fase | Contenido | Necesita |
| --- | --- | --- |
| **0. Medición** | Instalar Ollama, bajar Qwen3-VL 4B, probar 10 gráficas reales: JSON válido, tipo acertado, tiempo, VRAM. | Fotos reales de tus compañeros. |
| **1. Sin IA** | GraphSpec + motor + DOCX con imágenes + panel de revisión + calibración determinista. Útil ya, aunque el modelo falle. | — |
| **2. IA local** | Intérprete con salida restringida + validación por re-dibujo + OpenCV de apoyo. | Resultado de la fase 0. |
| **3. Medición** | Métricas de gráficas y gráficas esperadas en la base. | Gráficas corregidas. |

Criterio sugerido para seguir con IA local (a confirmar): tipo de gráfica correcto en ≥ 90 % y JSON válido en ≥ 95 % con el modelo cabiendo en la GPU. Si no se cumple, la fase 1 y la calibración de §4.2 ya entregan valor y la inferencia queda en manos de la persona.

La fase 1 no depende del modelo y es la que más reduce el riesgo; se recomienda empezar ahí en paralelo a la medición de la fase 0.

## 8. Qué no se ha verificado

- Nada de lo anterior está implementado ni probado en esta máquina.
- No se ha ejecutado ningún modelo local; todas las cifras de memoria, velocidad y exactitud vienen de fuentes de terceros o son estimaciones.
- No hay confirmación de la estructura de `line_data` para figuras con credenciales reales.
- No se evaluó cómo afectan a Mathpix las fotos de libreta reales (sombras, perspectiva, papel rayado). Puede hacer falta preprocesar (enderezar, contraste).

## Fuentes consultadas

- [Mathpix: imágenes, `line_data`, texto en diagramas](https://docs.mathpix.com/guides/image-ocr) y [blog SuperNet](https://mathpix.com/blog/supernet).
- [Guía Qwen3-VL 4B vs 8B (VRAM)](https://codersera.com/blog/qwen3-vl-4b-vs-qwen3-vl-8b-benchmarks-vram-guide/) y [Qwen3-VL-4B GGUF](https://huggingface.co/bartowski/Qwen_Qwen3-VL-4B-Instruct-GGUF) (terceros).
- [Modelos de visión locales 2026](https://insiderllm.com/guides/vision-models-locally/), [VLMs pequeños 2026](https://tinyweights.dev/posts/best-local-vision-language-models-2026/) (terceros, agregadores).
- [DePlot](https://arxiv.org/pdf/2212.10505) y [MatCha](https://arxiv.org/pdf/2212.09662) (de gráfica a tabla).
- [WildHandBench](https://arxiv.org/pdf/2608.22959) (brecha en escritura a mano).
