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

## 5. Alibaba Cloud Model Studio (consultado 2026-11-22)

**La página de campaña [AI Token Plans](https://www.alibabacloud.com/es/campaign/ai-landing-page-token) no vende "20,000 tokens por US$ 3".** Vende suscripciones mensuales en **Credits**, sin tabla de conversión a tokens:

| Plan individual | Mensual | Credits/mes |
| --- | --- | --- |
| Lite | US$ 6 | 11,500 |
| Essential | US$ 10 | 25,500 |
| Standard | US$ 18 | 45,000 |
| Pro | US$ 68 | 180,000 |

Cupón de nuevo usuario: US$ 2 de descuento, pedido mínimo US$ 5, vence 14 días tras canjearlo. Los planes se describen por "agentes concurrentes"; **no se verificó si permiten uso programático desde una aplicación** (ver su guía del plan individual).

Pago por uso (aparte del plan): Qwen3-VL-Plus listado en US$ 0.2–0.6 por millón de tokens de entrada y 1.6–4.8 de salida; `qwen-vl-ocr` con cifras contradictorias entre páginas (US$ 0.72 o US$ 0.07/0.16 por millón en Singapur) y cuota gratuita de 1 M de tokens por 90 días al activar Model Studio (según la documentación; verificar en la consola). Modelos con visión: Qwen3-VL (Plus/Flash), `qwen-vl-ocr` (manuscrito, exámenes, tablas; **no se confirmó salida LaTeX de fórmulas**), `qwen3.5-ocr` (según algunas páginas) y la serie Qwen3.6/3.7/3.8. No aparece ningún "Qwen4".

Privacidad (modo Internacional, Singapur): Alibaba declara no usar los datos para entrenar; la retención por defecto no está confirmada en fuentes oficiales; existe Zero Data Retention solo para clientes empresariales; contenido marcado por filtros puede conservarse hasta 2 años (página en chino tradicional). El cumplimiento legal del procesamiento transfronterizo es responsabilidad del cliente.
