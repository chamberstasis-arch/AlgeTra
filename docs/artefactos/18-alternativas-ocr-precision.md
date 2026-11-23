# ART-018 — Alternativas de OCR por precisión en matemática manuscrita

> **Tipo:** investigación (evidencia publicada; **nada medido con fotos propias**)<br>
> **Rama:** `feature/corpus-actividades-algebra-lineal`<br>
> **Fecha:** 2026-11-22<br>
> **Relación:** actualiza la recomendación de [ART-014](./14-matriz-evaluacion-ocr-y-proveedores.md) y [ART-015](./15-mvp-transcripcion-mathpix.md)

## 1. Conclusión

**No existe un benchmark público de matrices/vectores manuscritos de álgebra lineal.** Lo que hay es evidencia indirecta, y apunta en dos direcciones:

- En **escritura a mano real**, un estudio reporta que un modelo de visión general superó a Mathpix.
- En **fórmulas impresas**, Mathpix está entre los mejores, junto a modelos abiertos.

Por tanto, no hay que elegir proveedor por reputación: hay que **medir con fotos reales** y, para precisión, **cruzar dos lectores independientes** y la verificación aritmética de ART-016.

## 2. Evidencia

| Fuente | Qué mide | Resultado | Límites |
| --- | --- | --- | --- |
| [Evaluating AI Grading on Real-World Handwritten College Mathematics (arXiv 2603.00895)](https://arxiv.org/html/2603.00895) | Transcripción de cuestionarios manuscritos de cálculo (UC Irvine, inglés), subconjunto difícil de 171 soluciones. | GPT-4.1-mini **84 %** transcripciones aceptables vs Mathpix **55 %**. Mathpix falla con letra tenue y no reconstruye diagramas; GPT puede autocorregir (< 2 % con la instrucción "no corrijas"). | Un solo curso de cálculo, sin matrices. No se define quién juzgó esa comparación ni con qué criterio. Sin versión de Mathpix. 2025. |
| [Benchmarking Document Parsers on Mathematical Formula Extraction (arXiv 2512.09874)](https://arxiv.org/html/2512.09874v3) | Fórmulas **impresas** (100 páginas sintéticas, 2,052 fórmulas), juez LLM 0–10. | Qwen3-VL-235B 9.76 · Gemini 3 Pro 9.75 · PaddleOCR-VL (0.9B) 9.65 · **Mathpix 9.64** · dots.ocr 9.43 · Gemini 2.5 Flash 8.78 · Mistral OCR 8.66 · GPT-5 mini 6.61. | No incluye manuscrito ni fotos. Diferencias del grupo líder muy pequeñas, sin intervalos de confianza. Juez LLM con correlación 0.78 con humanos. |
| [WildHandBench (arXiv 2608.22959)](https://arxiv.org/abs/2608.22959) | 500 documentos manuscritos (mayoría chino/inglés), 18 modelos. | Mejor modelo 71.85 % global; humanos 77.09 %. En fórmulas el mejor modelo queda detrás de humanos (CDM 79.42 vs 86.56, cifra de un resumen secundario). Entre el 63 % y 91 % de los errores de los modelos son "por conocimiento previo" (el modelo escribe lo que espera, no lo que ve). | El idioma no es español; las cifras de fórmulas no se verificaron en el paper. |
| [MathWriting (Google, arXiv 2404.10690)](https://arxiv.org/abs/2404.10690) | Expresiones manuscritas aisladas. | Document AI de Google: CER 6.5 % (validación) y 7.2 % (prueba); el servicio se entrenó en parte con esos datos. | Expresiones sueltas, no páginas. El dataset es **CC BY-NC-SA (no comercial)**: no sirve para entrenar un servicio de pago. |
| [Benchmark de OpenRouter](https://openrouter.ai/blog/insights/best-ocr-model/) | 15 modelos de visión y Mistral OCR en páginas de estilo manuscrito. | Mistral OCR el más preciso entre los económicos (US$ 2.02 por 1,000 páginas). | No es matemática; método no revisado a fondo. |

Una fuente indica que la pérdida de **estructura 2D y delimitadores** es la categoría de error dominante en modelos de visión con fórmulas; las matrices dependen de eso (evidencia débil, un artículo de congreso).

## 3. Lectura para AlgeTra

1. **Mathpix y los modelos de visión fallan distinto.** Mathpix transcribe de forma literal y se equivoca con letra tenue; los modelos de visión leen mejor el contexto, pero pueden "corregir" lo escrito. Para fidelidad, ese segundo defecto es el grave: se mitiga pidiendo transcripción literal y marcando lo ilegible, y **se mide**.
2. **Dos lectores que discrepan señalan el error.** Donde Mathpix y un modelo de visión difieren en una celda, hay que mirar. Si además la aritmética no cuadra (ART-016), es casi seguro un error de lectura. Es la forma más barata de ganar precisión sin elegir un ganador.
3. **Candidatos a medir:**

| Candidato | Por qué | Nota |
| --- | --- | --- |
| Mathpix | Literal, LaTeX, `line_data`. | US$ 19.99 de activación (incluye US$ 29 de saldo). |
| Gemini 3 (Pro / Flash) | Líder en impreso; bueno en manuscrito general. | Sin datos de matrices. |
| Qwen3-VL (API 235B; local 4B/8B) | Líder en impreso; la versión pequeña cabe en la RTX 3050. | El pequeño será peor que el de 235B. |
| Modelos de OpenAI y Claude | GPT-4.1-mini fue el mejor en el estudio manuscrito. Para Claude no encontré datos. | GPT-5 mini fue pobre en impreso: no asumir. |
| PaddleOCR-VL 0.9B | Local, rinde como Mathpix en impreso. | Manuscrito sin datos. |
| Mistral OCR | Barato. | Más débil en fórmulas (8.66). |
| Google Document AI | CER 6.5 % en manuscrito matemático aislado. | Parcialmente entrenado con MathWriting. |

## 4. Protocolo de comparación propuesto

- 10–20 fotos reales de libreta; la verdad de referencia es lo que corriges en la interfaz.
- Mismas fotos y mismo prompt de fidelidad para todos los modelos de visión: *transcribe literalmente, no resuelvas ni corrijas, marca `[?]` lo ilegible, matrices con `pmatrix`*.
- Métricas existentes (fórmulas exactas, error de tokens, CER) más dos nuevas: **celdas de matriz correctas** y **dimensión de matriz correcta**.
- Medir también el **consenso**: de las celdas en desacuerdo entre dos lectores, cuántas eran error real, y cuántos errores reales quedaron sin señalar.
- Reportar la incertidumbre: con pocas fotos las diferencias entre modelos cercanos no son concluyentes.

## 5. Alibaba Cloud Model Studio — Token Plan (consultado 2026-11-22)

Fuentes: [página de campaña](https://www.alibabacloud.com/es/campaign/ai-landing-page-token) y la guía oficial del plan ([overview](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/token-plan-personal-overview), [permisos y uso](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/token-plan-permissions-and-usage), [cuotas](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/token-plan-usage-quota)). **Si difieren, manda la guía:** la campaña está desactualizada (mostraba Lite con 11,500 credits; la guía dice que las cuotas subieron el 9-nov-2026). *Corrección:* una versión anterior de esta sección decía que no existía "Qwen4"; sí existe (`qwen4-max`, con `qwen4-max-preview` hasta el 25-nov-2026).

**Planes (edición personal, solo región Singapur, modo de despliegue Global):**

| Plan | Precio | Credits/mes |
| --- | --- | --- |
| Lite | US$ 6 (**US$ 3** de lanzamiento hasta el 30-nov-2026 23:59 UTC+8, solo quien nunca lo ha comprado) | 20,000 |
| Essential | US$ 10 (US$ 5 de lanzamiento) | 45,000 |
| Standard | US$ 18 | 80,000 |
| Pro | US$ 43 | 200,000 |

Un *credit* **no es un token** y varía por modelo; el único ejemplo oficial (edición de equipo, `qwen3.6-plus`) da ≈ 0.2 credits por 1,000 tokens de entrada y ≈ 1.2 por 1,000 de salida. Sin tabla por modelo ni por imagen.

**Restricciones (citadas de la guía):**

- Solo uso **interactivo dentro de herramientas de programación/agentes** (Claude Code, Cursor, Qwen Code, Qoder, OpenClaw…). "No debe usarse para scripts de automatización, backends de aplicaciones propias ni llamadas por lotes no interactivas." Usarla así se considera infracción y puede suspender la suscripción o banear la clave.
- Uso exclusivo del suscriptor; prohibido compartir la clave. Colaboración de varias personas → edición de equipo.
- Clave dedicada `sk-sp-…` (no sirve la de pago por uso). Compatible con protocolos OpenAI y Anthropic.
- Sin cancelación ni reembolso; solo se puede no renovar. Lo no usado no se acumula. Agotada la cuota, se bloquea (no cobra por uso). Límites de ritmo dinámicos y cola en horas pico; concurrencia recomendada 1–2 en Lite.
- Datos: modo Global, con transferencia transfronteriza; la responsabilidad legal es del cliente.

**Modelos con comprensión de imágenes en el plan:** `qwen4-max`, `qwen3.8-max`, `qwen3.8-flash`, `qwen3.7-plus`, `qwen3.6-flash`, `deepseek-v4.1-flash`. **No están** Qwen3-VL ni `qwen-vl-ocr`.

**Pago por uso (producto distinto, programable):** Qwen3-VL-Plus listado en US$ 0.2–0.6 por millón de tokens de entrada y 1.6–4.8 de salida; `qwen-vl-ocr` con precios contradictorios entre páginas. La cuota gratuita de nuevos usuarios (1 M de tokens por modelo, 90 días) aplica según la documentación a Singapur modo Internacional, una por cuenta; verificar en la consola.
