# ART-014 — Matriz versionable de evaluación OCR y proveedores

> **Tipo:** evaluación técnica, económica y de operación de procesadores<br>
> **Identificador:** `OCR-PROVIDER-MATRIX-001`<br>
> **Versión:** `0.1`<br>
> **Estado:** línea base de investigación; benchmark propio pendiente<br>
> **Fecha de corte de precios y documentación:** 2026-11-06<br>
> **Moneda de comparación:** USD, antes de impuestos, almacenamiento, red, soporte y operación

## 1. Propósito y decisión ejecutiva

Esta matriz compara capacidades intercambiables para AlgeTra. **Mathpix no es el modelo de dominio**: es un candidato de adapter para el perfil `ocr-stem-v1`, igual que un OCR general, un modelo local o un procesador especializado deben entrar mediante el contrato común.

La documentación comercial demuestra capacidades declaradas, no la calidad real sobre el corpus de AlgeTra. A la fecha de esta versión no se han ejecutado las llamadas de benchmark con las fixtures comunes; por tanto, esta matriz **no afirma una tasa de acierto ni un ganador definitivo**.

### 1.1. Recomendación provisional

| Ruta | Perfil lógico propuesto | Candidato | Decisión provisional | Condición para habilitarlo |
| --- | --- | --- | --- | --- |
| P0 STEM | `ocr-stem-v1` | Mathpix OCR API | Primer candidato para texto manuscrito en español, matemáticas, LaTeX, layout y geometría. | Pasar el benchmark P0, revisión de privacidad/retención y presupuesto acotado. |
| P0 seguro | `manual-v1` | Núcleo AlgeTra | Fallback obligatorio: conservar original, regiones/crops y permitir edición manual. | Siempre disponible; no depende de red, proveedor ni cuota. |
| P1 general gestionado | `ocr-general-v1` | Mistral OCR 4.1; Google, Azure o AWS como alternativas | Candidatos para texto, layout, tablas y fallback general; no sustituyen automáticamente la ruta matemática. | Comparar español manuscrito, estructura, geometría, latencia, política de datos y costo. |
| P1 general local | `ocr-general-local-v1` | PaddleOCR/PP-Structure; Tesseract como ruta ligera | Ruta de privacidad y continuidad si la calidad es suficiente. | Verificar modelos, licencia, consumo de GPU/CPU y calidad en español. |
| P1 matemático local experimental | `math-local-v1` | Pix2Text o `pix2tex` por recorte | Complemento de investigación, no fallback equivalente de P0 por defecto. | Medir ecuaciones manuscritas, recortes, latencia y composición con texto general. |
| P1 visual asistido | `layout-analysis-v1` | Surya, PaddleOCR-VL, Document AI, Azure, Textract | Detectar regiones, lectura, tablas y etiquetas; mantener figuras sin conversión. | El adapter debe conservar geometría y tratar la salida como señal revisable. |
| P2 especializado | `chemical-v1`, `chart-v1`, `biology-v1`, `diagram-v1` | Adapters por disciplina | No usar OCR general como si fuera un reconstructor científico. | Procesador específico, experto humano y modo visual como salida válida. |

La recomendación de P0 es, por tanto, **Mathpix + fallback visual/manual**, no Mathpix como dependencia única. Un segundo proveedor solo puede declararse fallback si cumple las capacidades mínimas del bloque y la política de datos; si no, se conserva la región y se solicita revisión.

### 1.2. Leyenda de evaluación

Las marcas de las tablas no son puntuaciones de exactitud:

- **A — candidato directo:** la documentación expone una salida que puede mapearse al perfil, sujeto al benchmark.
- **B — candidato parcial:** cubre una parte importante, pero necesita composición, otro procesador o validación adicional.
- **C — no adecuado para esa capacidad:** no debe presentarse como sustituto del perfil.
- **V — modo visual:** conserva imagen/región; no promete conversión semántica.
- **? — no verificado:** la documentación pública no basta o el dato depende de contrato.

## 2. Necesidades de AlgeTra y criterios de evaluación

| Capacidad | Prioridad | Contrato mínimo esperado | Evidencia requerida |
| --- | --- | --- | --- |
| Texto manuscrito en español | P0 | Transcripción por región, locale `es`, confianza/señal de incertidumbre y recorte de origen. | CER/WER, acentos, signos, palabras ambiguas y tiempo de corrección. |
| Matemáticas manuscritas o impresas | P0 | Región `equation`, texto alternativo y LaTeX cuando exista; no publicar una conversión fallida como confirmada. | Distancia de tokens/edición, compilación LaTeX, equivalencia simbólica cuando sea posible y revisión humana. |
| Documentos mixtos | P0 | Texto, ecuaciones y figuras en una página, con orden de lectura y procedencia independiente. | F1 de bloques, orden, round-trip al modelo canónico y PDF. |
| Layout y geometría | P0 | Bounding box o polígono, dimensiones fuente, transformación y confianza separada del contenido. | IoU/polygon overlap, orden de lectura y alineación de overlays. |
| Región no convertible | P0 | `figure`/`unknown`, crop o referencia visual, advertencia y estado de revisión. | Recall de regiones preservadas; cero pérdida en preview/PDF. |
| Preflight y costo | P0 | Bloqueo antes de una llamada facturable para captura irrecuperable; límites, cuota e idempotencia. | Casos de desenfoque/recorte; auditoría de llamadas, reintentos y cargos. |
| Tabla editable | P1 | Celdas, filas/columnas, geometría y modo visual alternativo. | Exactitud de celdas y estructura; conservar tabla si falla. |
| Diagrama/flujo | P1 | Etiquetas y regiones; nodos/conexiones solo si existe reconstrucción confiable. | IoU, recall de etiquetas, comparación visual y revisión de conexiones. |
| Gráfica | P1 | Imagen y etiquetas en P0; ejes, calibración y series en un perfil específico. | Error de calibración, puntos/series y confirmación humana. |
| Química | P2 | Imagen siempre; representación molecular propuesta, por ejemplo SMILES, solo con validador especializado. | Validez química, equivalencia de estructura y revisión experta. |
| Biología | P2 | Imagen, etiquetas y regiones; no inferir una interpretación anatómica como transcripción. | Recall de etiquetas/regiones y evaluación disciplinar. |
| Física, mecánica y mecatrónica | P1/P2 | Texto, ecuaciones, unidades y figuras separados; circuitos/diagramas requieren procesadores propios. | Exactitud de unidades, símbolos, conexiones y revisión experta. |

## 3. Matriz resumida de proveedores gestionados

| Proveedor | Modalidad y salida relevante | Texto manuscrito `es` | Matemática/LaTeX | Layout/geometría | Tablas y otras disciplinas | Encaje preliminar |
| --- | --- | --- | --- | --- | --- | --- |
| **Mathpix OCR** | API de imagen, documento PDF y Files API; Markdown, LaTeX, MathML, `line_data` y señales de confianza. | **A?**; está orientado a texto impreso/manuscrito y debe medirse en español. | **A?**; candidato principal para matemáticas y LaTeX. | **A?**; líneas/regiones y contornos; la geometría debe normalizarse. | **B?** para tablas/diagramas/química; conservar visualmente lo no convertible. | **P0 candidato STEM**. |
| **Mistral OCR 4.1** | `/v1/ocr`; OCR, anotaciones, etiquetas estructurales, bounding boxes y confianza por bloque; batch. | **B?**; documentación multilingüe, pero calidad manuscrita española propia pendiente. | **B?**; no asumir LaTeX equivalente a Mathpix. | **A?** para párrafos, bloques y bboxes. | **B?** para estructura; química/diagramas deben validarse. | **P1 general candidato**. |
| **Google Cloud Vision / Document AI** | Text/document OCR, bboxes; Document AI añade OCR empresarial, layout y parsers. | **B?**; generalista, sujeto a modelo/idioma y corpus. | **C/B?**; no es una salida matemática-LaTeX nativa de este contrato. | **A?** para texto/layout; buen candidato para ruta general. | **A?** en layout/tablas según processor; no reconstruye figuras por sí solo. | **P1 general, no P0 STEM**. |
| **Azure Document Intelligence** | Read/Layout y modelos prebuilt/custom; texto, estructura, tablas, selección y coordenadas; opción de contenedor. | **B?**; declara impresos/manuscritos y español, pero requiere medición propia. | **C/B?**; no debe tratarse como OCR LaTeX. | **A?** para layout y tablas. | **A?** para documentos/formularios; no semántica científica general. | **P1 general/edge candidato**. |
| **Amazon Textract** | Detect Document Text y Analyze Document para texto manuscrito, tablas, formularios, queries y geometría. | **B?**; generalista; probar manuscrito español. | **C** para LaTeX nativo. | **A?** para bloques y geometría; `Analyze` según feature. | **A?** para tablas/formularios; no diagramas/química semántica. | **P1 general condicionado**. |
| **Mindee** | API de extracción por modelos/documentos, créditos, polígonos y confidence; foco en documentos de negocio. | **C/B?** para tarea académica manuscrita; no es su foco principal. | **C** para LaTeX. | **B** en modelos compatibles. | **A?** en documentos estructurados empresariales, no en ciencias escolares. | **P1 solo para un caso específico; no candidato P0**. |
| **OCR.Space** | API simple; Engine 2/3, texto, overlay y PDF searchable; opción on-premise. | **B?**; Engine 3 declara handwriting y muchos idiomas; validar `es`. | **C** para LaTeX nativo. | **B?**; overlay de palabras, con precisión y latencia dependientes del engine. | **B?** para tablas; no semántica matemática/disciplinar. | **P1 fallback general o evaluación de bajo costo, con gate legal**. |
| **Veryfi** | Extracción multimodal/documentos de negocio por transacción. | **C** para manuscrito académico mixto. | **C** para LaTeX. | **B** solo en tipos de documento soportados. | **A?** para facturas/recibos y similares, fuera del núcleo AlgeTra. | **No priorizar**. |

### 3.1. Detalle por candidato gestionado

#### Mathpix OCR — `mathpix`

- **Capacidades útiles:** la documentación de OCR de imagen declara texto impreso o manuscrito, matemáticas, tablas y diagramas, con salidas a LaTeX, Markdown o MathML. La respuesta puede incluir `line_data`, contornos, tipo de línea, `confidence`, `confidence_rate`, `is_handwritten`, dimensiones y `request_id`.
- **P0:** es el mejor candidato documentado para el perfil combinado `handwriting + math + latex + layout + line_geometry`. Esto es una hipótesis de integración, no un resultado de precisión.
- **Limitación clave:** una figura, diagrama o región con `conversion_output: false` no debe convertirse en texto supuesto. El adapter debe conservar la región y crear su propio crop cuando la API no entregue uno.
- **Límites que afectan la arquitectura:** `v3/text` limita el cuerpo JSON a 5 MB, las imágenes base64 a 2 MB y la descarga de una imagen por URL a 10 MB con timeout de 15 s; la API PDF acepta hasta 1 GB. Files API declara hasta 15 GB por archivo y 200,000 archivos por trabajo. Las cuotas mensuales de imágenes/páginas y los límites por minuto dependen de la configuración/app.
- **Retención:** para endpoints de imagen, `metadata.improve_mathpix: false` evita persistir la imagen y la caché del resultado para consulta; permanecen metadatos de auditoría/facturación. PDF/Files tienen ventanas de retención diferentes, por lo que el modo de envío debe elegirse según la política del workspace.
- **Integración AlgeTra:** `POST /v3/text` solo desde el worker, credenciales en el gestor de secretos, `RawProviderArtifact` antes de normalizar y `NormalizedProviderResult` antes de tocar `Block`.

#### Mistral OCR 4.1 — `mistral-ocr`

- **Capacidades documentadas:** OCR 4.1 expone `/v1/ocr`, bounding boxes a nivel de párrafo, etiquetas estructurales y confidence por bloque; dispone de anotaciones estructuradas y batch.
- **Encaje:** candidato para `ocr-general-v1` y `layout-analysis-v1`, especialmente cuando se necesite estructura de página y una API sencilla. La documentación lista soporte multilingüe, pero el benchmark debe medir específicamente manuscrito español, matemáticas manuscritas y símbolos.
- **No asumir:** una salida estructurada/Markdown no equivale automáticamente a LaTeX válido ni a una región matemática confirmada. Si la representación no puede normalizarse, se conserva visualmente.
- **Operación:** es servicio gestionado; región, retención, uso del contenido, subprocesadores y entrenamiento deben quedar en la revisión legal/DPA antes de admitir contenido real.

#### Google Cloud Vision y Document AI — `google-vision`, `google-document-ai`

- **Vision** ofrece detección de texto/document text y cajas; es útil como OCR general por imagen, no como reconstructor LaTeX.
- **Document AI** añade Enterprise Document OCR, Layout Parser y procesadores de formularios/tablas. Su unidad de página es más comparable con un documento que Vision, pero cada feature adicional puede sumar costo.
- **Encaje:** `ocr-general-v1` o `layout-analysis-v1`; no es fallback equivalente para `ocr-stem-v1` sin demostrar matemáticas y procedencia.
- **Operación:** se deben fijar proyecto, región, IAM, cuotas, logging, almacenamiento y política de datos de Google Cloud. Vision cobra por unidad/feature y Document AI por processor/página; la factura real incluye otros recursos de Google Cloud.

#### Azure Document Intelligence — `azure-document-intelligence`

- **Capacidades documentadas:** Read/Layout y modelos prebuilt/custom extraen texto, estructura, tablas, marcas de selección y relaciones; Microsoft declara documentos impresos y manuscritos y soporte de español entre varios idiomas.
- **Encaje:** buen candidato para `ocr-general-v1`, `layout-analysis-v1` y tablas/formularios en P1. Los containers permiten investigar un modo de procesamiento en el edge, aunque no eliminan el costo de infraestructura ni la revisión de licencia/modelo.
- **No asumir:** no produce una salida matemática-LaTeX equivalente a Mathpix; las ecuaciones se deben enrutar a un procesador especializado o conservar como figura.
- **Operación:** elegir región y modo cloud/container, desactivar logs con contenido, controlar identidad y documentar retención/entrenamiento. La página pública de precios muestra campos dependientes de región/programa/calculadora; no se registra una cifra estable en esta matriz.

#### Amazon Textract — `aws-textract`

- **Capacidades documentadas:** Detect Document Text reconoce texto y handwriting; Analyze Document añade Forms, Tables, Queries y Signatures, con OCR incluido según la feature y geometría de bloques.
- **Encaje:** `ocr-general-v1` y `layout-analysis-v1` para texto/tablas/formularios; no es una ruta de LaTeX ni de reconstrucción de diagramas.
- **Operación:** elegir región, IAM, S3, KMS, cuotas, límites de concurrencia y política de retención. El costo cambia según API/feature y región; un `Analyze` puede facturar la combinación de funciones solicitada.

#### Mindee — `mindee`

- **Capacidades documentadas:** modelos de extracción, confidence, polígonos y utilidades para documentos estructurados; su catálogo y pricing están orientados a documentos empresariales.
- **Encaje:** puede servir como adapter de un futuro caso de documentos estructurados, pero no debe usarse para prometer manuscrito académico, matemática o química.
- **Operación:** el plan Pro/Enterprise declara opciones de localización de procesamiento; deben verificarse DPA, retención y modelo concreto antes de usar contenido sensible.

#### OCR.Space — `ocr-space`

- **Capacidades documentadas:** el plan/API ofrece Engine 2 y Engine 3, reconocimiento de idiomas, overlay, PDF searchable y parámetros de orientación/tabla. Engine 3 declara más de 200 idiomas, handwriting y tablas, con la advertencia de que prioriza exactitud sobre precisión espacial y puede ser más lento.
- **Encaje:** candidato barato para OCR general y prueba de fallback; no produce LaTeX ni estructura STEM equivalente.
- **Privacidad:** el modo hosted requiere revisar la política y contrato de servicio. La opción OCR.Space Local evita el envío externo, pero requiere cotización/licencia y operación propia.
- **Riesgo operativo:** el plan gratuito tiene límites por solicitud/IP y los planes PRO tienen cuotas mensuales; no usarlo como fallback sin circuit breaker, presupuesto y límite de payload.

#### Veryfi — `veryfi`

Veryfi está optimizado para extracción de documentos empresariales. Su pricing por documento, soporte de facturas/recibos y plataforma de captura no resuelven el núcleo P0 de AlgeTra. Se conserva como referencia de una alternativa de Document AI, pero no se recomienda invertir en un adapter para el MVP.

## 4. Matriz de alternativas locales, open source y on-device

| Alternativa | Salida/capacidad | Fortalezas | Límites frente a AlgeTra | Licencia/operación | Prioridad |
| --- | --- | --- | --- | --- | --- |
| **PaddleOCR / PP-Structure / PaddleOCR-VL** | OCR, layout, tablas, fórmulas y salida JSON/Markdown según pipeline/modelo; 100+ idiomas declarados por el proyecto. | Cobertura amplia, bboxes/celdas, despliegue local, CPU/GPU y ecosistema activo. | La calidad de manuscrito español, matemáticas y figuras debe medirse; no todos los pesos/pipelines tienen la misma licencia. | Código principal Apache-2.0; auditar licencia de cada peso y dependencia. Requiere empaquetado, modelos, memoria y actualización. | **P1 candidato local general**. |
| **Surya 2.5** | OCR, layout, orden de lectura, tablas, polígonos, confidence y HTML con fórmulas. | Modelo documental compacto, regiones semánticas y backends vLLM/llama.cpp; MLX experimental sobre Apple Silicon. | El modo completo requiere backend de inferencia; handwriting, math y español aún necesitan benchmark propio. | Código Apache-2.0; los pesos usan licencia modificada AI Pubs OpenRAIL-M con restricciones comerciales. No habilitar sin revisión legal. | **P1/P2 experimental**. |
| **Pix2Text** | Layout, tablas, texto y fórmulas LaTeX integrados en Markdown; 80+ idiomas declarados. | Alternativa local de propósito mixto, MIT, con detector/reconocedor matemático. | La ruta multilingüe usa componentes distintos; español, handwriting, geometría y rendimiento deben medirse. | Código MIT; auditar pesos y dependencias (incluido EasyOCR/CnOCR) y redistribución. | **P1 experimental**. |
| **pix2tex / LaTeX-OCR** | Recorte de fórmula a LaTeX. | Especializado y fácil de encapsular por región; código MIT. | No hace layout/documento completo; el soporte manuscrito no es una garantía; necesita segmentación y composición con texto. | GPU/CPU y modelo local; auditar checkpoint y dependencias. | **P1/P2 para `math-local-v1`**. |
| **Tesseract 5 + OCRmyPDF** | Texto, hOCR/TSV/ALTO/PDF searchable; más de 100 idiomas en los datos disponibles. | CPU, bajo costo, Apache-2.0 para Tesseract, maduro y reproducible. | Débil como solución única para handwriting, LaTeX, layout mixto y símbolos; requiere preprocesamiento. | Operación sencilla; revisar licencias de wrapper/OCRmyPDF y de los datos de idioma. | **P1 fallback general ligero**. |
| **docTR / EasyOCR** | Detección y reconocimiento de texto con cajas/polígonos según pipeline. | Integración Python, ejecución local y útil para prototipos de texto. | Sin semántica matemática, tablas o figuras comparable a un documento STEM completo. | Revisar versión, modelos, licencia y recursos; no usar como evidencia de calidad sin corpus. | **P1 auxiliar/benchmark**. |
| **olmOCR 2** | VLM de 7B para PDF/imagen a Markdown; declara soporte de ecuaciones, tablas, handwriting y formato complejo. | Batch local, licencia Apache-2.0, pipeline y benchmark públicos; candidato para documentos complejos. | Requiere GPU con al menos 12 GB de VRAM según su documentación, no es una ruta interactiva ligera y la geometría debe validarse. | Modelo grande, descarga/cache, GPU, vLLM y operación de servicio; la cifra de costo del proyecto no sustituye una medición de AlgeTra. | **P1 batch/P2**. |
| **ML Kit Text Recognition / Apple Vision** | OCR on-device para texto general en plataformas móviles/Apple. | Reduce transferencia de imágenes y latencia de captura. | No es el OCR canónico STEM; disponibilidad, idiomas, geometría y resultados varían por plataforma. | SDK, versiones de sistema, descarga de modelos y restricciones de plataforma. | **P1 preflight/ayuda local**, no fallback P0 de LaTeX. |

### 4.1. Regla de licencias para modelos locales

El hecho de que un repositorio tenga licencia permisiva no implica que todos sus pesos, checkpoints, datasets, fuentes o dependencias puedan redistribuirse comercialmente. Antes de poner un modelo local en `default` se debe conservar:

1. licencia del código, pesos y datos;
2. versión/digest del modelo descargado;
3. obligaciones de atribución y avisos;
4. restricciones por ingresos, uso comercial o sector;
5. plan de actualización y respuesta a vulnerabilidades;
6. evidencia de que no se descarga contenido del usuario a un servicio externo.

Surya requiere una advertencia especial: su código se declara Apache-2.0, pero sus pesos tienen una licencia modificada con condiciones comerciales. Por eso no es un fallback productivo aprobado en esta versión.

## 5. Cobertura por tipo de contenido y horizonte

| Tipo | P0 aceptable | P1 | P2 | Procesadores a investigar | Regla de seguridad |
| --- | --- | --- | --- | --- | --- |
| Texto español manuscrito | Transcripción por región, ambigüedad y crop original. | OCR general gestionado/local y glosarios. | Adaptación por nivel/materia. | Mathpix, Mistral, Azure, Google, AWS, PaddleOCR, OCR.Space, Tesseract. | No publicar confianza como certeza; revisión humana para dudas. |
| Matemáticas | LaTeX editable cuando el adapter lo entregue; visual si falla. | Pix2Text/pix2tex por recorte, otros modelos STEM. | Validación y explicación por dominio. | Mathpix, Pix2Text, pix2tex, Surya/Paddle como candidatos. | `conversion_output=false`, compilación fallida o baja confianza queda pendiente. |
| Texto + matemática + figura | Bloques separados y round-trip visual. | Clasificación y routing por bloque. | Plantillas disciplinares. | Mathpix + OCR general + modo visual. | Nunca reemplazar la figura por una descripción inventada. |
| Tablas | Imagen/crop conservado; estructura solo si resulta segura. | Celdas editables, HTML/Markdown/JSON y geometría. | Extracción de datos y validación. | Document AI, Textract, Azure, Mistral, PaddleOCR, Surya, OCR.Space. | Si se pierde una celda o merge, conservar tabla visual y advertir. |
| Química | Imagen, etiquetas y ecuaciones como visual/texto. | — | Estructura editable, SMILES/InChI y validador especializado. | DECIMER/OSRA u otro adapter especializado; Mathpix solo como experimento. | SMILES inválido o no verificado nunca es definitivo. |
| Diagrama de flujo | Figura y etiquetas detectables. | Nodos/conexiones asistidos y comparación con origen. | Reconstrucción semántica más amplia. | Layout OCR + detector de diagramas + React Flow. | La imagen original siempre permanece disponible. |
| Gráfica | Imagen y texto/ejes detectables. | Calibración, puntos, curvas y series editables. | Digitalización robusta de estilos y unidades. | Detector de gráficos y pipeline propio; OCR solo aporta etiquetas. | Los datos no se infieren sin calibración confirmada. |
| Biología | Imagen y etiquetas como figura. | Regiones/etiquetas asistidas. | Reconocimiento contextual especializado. | Modelo de visión/adapter disciplinar y revisión experta. | No transformar una etiqueta ambigua en afirmación biológica. |
| Física, mecánica y mecatrónica | Texto, ecuaciones, unidades y figura separados. | Unidades, circuitos y diagramas asistidos. | Símbolos y reconstrucciones específicas. | Mathpix, OCR general, SymPy/Pint y adapters de diagramas. | Una validación determinista no corrige silenciosamente el manuscrito. |

## 6. Costos publicados y unidades de cobro

Los precios siguientes son referencias públicas consultadas el 2026-11-06. No incluyen impuestos, descuentos negociados, almacenamiento, egress, colas, base de datos, observabilidad, soporte, reintentos, variantes ni revisión humana. Un precio dinámico no debe convertirse en un valor fijo en código.

### 6.1. Referencia de servicios gestionados

| Servicio | Unidad y precio público de referencia | Cuotas/condiciones relevantes | Lectura para AlgeTra |
| --- | --- | --- | --- |
| Mathpix `v3/text` | **$0.002 por imagen** hasta 1 M; $0.0015 por imagen desde 1 M según la página de precios. | Setup único de $19.99 para activar la primera API key; cuotas mensuales de imágenes y páginas configurables; imagen/PDF tienen buckets distintos. Una imagen con más de 12 filas de texto puede facturarse a la tarifa de `v3/pdf` por página. | Adecuado para una primera estimación P0 por página-imagen; variantes y reintentos multiplican unidades. |
| Mathpix `v3/pdf` | **$0.005 por página** hasta 1 M; $0.0035 desde 1 M. | Files API comparte el bucket mensual de páginas con `v3/pdf`. | Reservar para documentos, no usarlo sin revisar la retención mayor de PDF. |
| Mathpix Files API | **$0.0015 por página** hasta 30 M; $0.001 desde 30 M. | Procesamiento asíncrono; hasta 15 GB por archivo y 200,000 archivos por trabajo. | Bueno para batch, no necesariamente para primera respuesta interactiva. |
| Mistral OCR 4.1 | **$4 por 1,000 páginas** OCR; **$5 por 1,000 páginas anotadas**. | La unidad es página; batch y capacidades de Document AI pueden tener condiciones propias. | Aproximadamente $0.004/$0.005 por página antes de infraestructura y política de datos. |
| Google Vision | Text Detection/Document Text: **$1.50 por 1,000 unidades** después de las primeras 1,000 unidades gratuitas mensuales; precio de lista consultado. | Cada feature aplicada cuenta como unidad; PDF multipágina se cuenta por página; otros features agregan unidades. | No sumar como si fuera una llamada única si se solicitan varias features. |
| Google Document AI | Enterprise Document OCR: **$1.50 por 1,000 páginas** después del tramo gratuito publicado; Layout Parser: **$10 por 1,000 páginas**; otros processors tienen tarifas diferentes. | Cobro por processor y página; Google Cloud adicional se factura aparte. | Separar OCR, layout, extracción y almacenamiento en el estimador. |
| AWS Textract | En el ejemplo público de US West (Oregon): Detect Document Text **$0.0015/página** para el primer millón y $0.0006 después; Tables $0.015 y Forms $0.05 en el primer millón. | Región y combinación de features cambian la tarifa; free tier para cuentas nuevas tiene límites y duración propia. | Atractivo para texto/tablas generalistas, no para LaTeX. |
| Azure Document Intelligence | La página pública consultada muestra valores dependientes de región, programa y calculadora (`$-` en la tabla renderizada). | Free tier/calculadora, Pay-as-you-go, tiers de compromiso y containers; cotización/region required. | Registrar `precio dinámico/consultar calculadora`, no inventar un valor por página. |
| Mindee | Starter mostrado: **$44/mes facturado anualmente por 6,000 créditos**; Pro **$116/mes facturado anualmente**; Enterprise desde **500,000+ créditos/año** con precio custom. | 1 página = 1 crédito; página con confidence = 1.5 créditos; créditos no usados expiran al final del periodo; overage tiene recargo indicado por el proveedor. | Comparar como créditos/documento, no como OCR STEM por página. Verificar el selector y checkout porque la página es dinámica. |
| OCR.Space | Gratis: 25,000 requests/mes, 500 requests/día por IP; PRO $30/mes y PRO PDF $60/mes con 300,000 requests/mes; custom desde $999+/mes según página. | Límites de tamaño/PDF, engine y SLA cambian por plan; Engine 3 añade cuotas propias (1,000 conversiones gratis o 30,000 en PRO); on-premise requiere contacto. | Puede ser barato para general OCR, pero la unidad es request y no equivale a página procesada. |
| Veryfi | Gratis hasta 100 documentos/mes; Starter con compromiso mínimo de **$500/mes**; ejemplos publicados: $0.16 por factura y $0.08 por recibo. | Una transacción es un documento de hasta 15 páginas según FAQ; descuentos y tipos dependen del documento. | No usar esta tarifa para comparar páginas académicas; el producto no es candidato P0. |

### 6.2. Escenarios aritméticos comparables

Estos escenarios son solo multiplicaciones de tarifa de lista, con **una página/imagen, una llamada, sin features adicionales, sin reintentos y sin tramo gratuito salvo donde se indica**. No son una cotización ni un resultado de costo total. En Mathpix se asume una imagen de hasta 12 filas de texto; una imagen más larga puede entrar en la tarifa de `v3/pdf`.

| Volumen mensual | Mathpix imagen ($0.002) | Mathpix Files ($0.0015) | Mistral OCR ($0.004) | Google Vision document text* | AWS Detect Text ($0.0015) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | $2.00 | $1.50 | $4.00 | $0.00 por el tramo gratuito publicado | $1.50 |
| 10,000 | $20.00 | $15.00 | $40.00 | $13.50 después de 1,000 gratis | $15.00 |
| 100,000 | $200.00 | $150.00 | $400.00 | $148.50 después de 1,000 gratis | $150.00 |

\* Google Vision puede cobrar por feature y la tabla usa únicamente Document Text. AWS tiene free tier para cuentas nuevas bajo condiciones de AWS, pero no se descuenta aquí. Ningún escenario incluye la segunda variante que puede ser necesaria para manuscrito tenue ni el posible cambio de tarifa de Mathpix para imágenes de más de 12 filas de texto.

### 6.3. Fórmula de consumo de AlgeTra

El costo visible al usuario debe estimarse antes de ejecutar y el costo real debe registrarse después:

```text
# Para cada proveedor y modalidad de cobro:
N_unidades_proveedor = unidades_aceptadas_por_proveedor
                     × variantes_enviadas
                     × intentos_que_facturan
                     + unidades_de_procesamiento_especial

C_variable = Σ(N_unidades_proveedor × precio_unidad)
           + almacenamiento_temporal
           + egress
           + features_adicionales

C_ocr_documento = C_variable / páginas_del_documento
```

La puerta de calidad debe impedir que una captura crítica entre en las unidades aceptadas. La deduplicación evita llamadas repetidas, pero **no se debe suponer que todos los proveedores cobran un reintento fallido igual**; el adapter debe registrar la unidad y la política de cobro observada.

## 7. TCO local y comparación cloud/local

“Gratis” en un repositorio local significa que no hay tarifa por llamada, no que el servicio sea gratuito. El costo total mensual local debe incluir:

```text
C_local_mes = GPU/CPU reservada o utilizada
            + electricidad y refrigeración
            + almacenamiento y backups
            + imágenes/modelos y registro de artefactos
            + monitoreo, seguridad y parches
            + ingeniería de integración y evaluación
            + soporte/incidentes
            + amortización de hardware
            + licencias comerciales de pesos o componentes

C_local_página = C_local_mes / páginas procesadas con éxito
```

### 7.1. Escenarios de TCO a medir

| Escenario | Candidatos | Costos dominantes | Ventaja | Riesgo |
| --- | --- | --- | --- | --- |
| Piloto pequeño, hasta 1,000 páginas/mes | Mathpix/Mistral/AWS/Google + fake local | Precio variable bajo; tiempo de integración; almacenamiento mínimo. | Velocidad de validación y cero operación de GPU. | Datos externos, cuotas y dependencia del proveedor. |
| Producto inicial, 10,000 páginas/mes | Mathpix P0 + general local/cloud en P1 | OCR por unidad, workers, base/objetos, revisión humana. | Posibilidad de elegir por bloque y evitar llamadas innecesarias. | Variantes, reintentos y calidad de manuscrito pueden multiplicar el costo. |
| Batch, 100,000 páginas/mes | Files API/Mistral batch/Textract/Google + workers locales | Throughput, egress, almacenamiento, concurrencia y soporte. | Descuentos por volumen y amortización de pipeline. | Fallos masivos, cuotas mensuales y costos ocultos de layout. |
| Privacidad estricta | PaddleOCR/Tesseract/Pix2Text/olmOCR en red privada | GPU, operación, actualización de modelos y auditoría. | El manuscrito no sale de la frontera autorizada. | Calidad desigual; no confundir privacidad con exactitud. |
| On-device | ML Kit/Apple Vision + envío opcional posterior | SDK, memoria, compatibilidad de dispositivos, descarga de modelos. | Preflight y respuesta local con menor transferencia. | No cubre por sí solo matemáticas/LaTeX ni documento canónico. |

### 7.2. Punto de equilibrio

No se fija un punto de equilibrio monetario sin medir throughput, utilización y costo laboral. La comparación versionable será:

```text
V_break_even = C_fijo_local / (precio_cloud_por_página - costo_variable_local_por_página)
```

Si el denominador es cero o negativo, el proveedor cloud es igual o más barato bajo ese escenario. Si el volumen es bajo, el costo de mantener una GPU o un equipo operativo puede superar ampliamente la tarifa por página. Si el volumen es alto o existe una restricción de soberanía, el valor de local puede justificarse aunque no gane por precio unitario.

El benchmark debe guardar por cada modelo local: hardware, VRAM/RAM, versión de runtime, batch/concurrencia, DPI, tiempo de carga, p50/p95 por página, páginas/hora, tasa de error y consumo durante la prueba.

## 8. Privacidad, retención y operación

| Ruta | ¿Sale el contenido? | Retención pública utilizable | Requisitos antes de producción | Postura P0 |
| --- | --- | --- | --- | --- |
| Mathpix `v3/text` con `improve_mathpix:false` | Sí, durante la llamada. | La documentación indica que imagen y resultado no se guardan en disco/caché para consulta; metadatos de auditoría/facturación permanecen. | DPA, región, subprocesadores, consentimiento, borrado local, secreto en worker y prueba de purge. | Permitido solo en piloto controlado y con política aprobada. |
| Mathpix PDF/Files | Sí; fuente y resultados pueden quedar en la plataforma por ventanas distintas. | Hasta 30 días para fuente/imágenes y hasta 90 para salidas textuales en la documentación general, salvo configuración/borrado aplicable. | Descargar al almacenamiento propio, borrar cuando proceda y no usar URLs del proveedor como origen durable. | No usar para datos sensibles hasta cerrar la política. |
| Mistral, Google, Azure, AWS | Sí, salvo una variante/container contratado localmente. | Depende de servicio, región, configuración y contrato; no se infiere de la tarifa. | DPA, training opt-out, región, logs, IAM, egress, retención y respuesta a incidentes. | `external-processing-approved` únicamente. |
| Mindee, OCR.Space, Veryfi | Sí en hosted; OCR.Space ofrece modalidad local sujeta a licencia. | Mindee y Veryfi requieren verificar plan/contrato. La política pública de OCR.Space declara borrar los documentos tras procesarlos y conservar el PDF searchable hasta 60 minutos; también registra la IP durante un mes: confirmar alcance por plan y DPA. | DPA, subprocesadores, borrado, SLA, localización y prueba de no uso para entrenamiento. | No habilitar por defecto. |
| Modelos locales en backend | No, si pesos/runtime y dependencias están dentro de la frontera autorizada. | Definida por AlgeTra: objetos, cachés, logs, backups y métricas. | SBOM, hashes, licencias, hardening, aislamiento, borrado y monitoreo. | Candidato para fallback condicionado, no garantía de calidad. |
| On-device | No debería salir durante el paso local. | Controlada por la aplicación y el sistema operativo. | Revisar permisos, telemetría del SDK, descargas de modelos y almacenamiento local. | Útil para preflight; no sustituye P0 STEM. |

Reglas comunes:

1. El original y las variantes se almacenan en AlgeTra; la URL temporal de un proveedor no es fuente durable.
2. No se procesan datos de menores en un piloto abierto hasta resolver consentimiento, jurisdicción, retención y contratos.
3. El contenido del usuario no se usa para entrenamiento sin autorización explícita, separada, revocable y auditable.
4. Los logs contienen IDs, hashes, latencia, estado y costo; no imágenes, texto manuscrito, LaTeX, tokens ni URLs firmadas.
5. Un proveedor con política menos permisiva nunca puede ser fallback automático de uno con política más restrictiva.
6. La purga debe cubrir originales, variantes, crops, respuestas brutas, cachés, colas, exports, backups según plazo y referencias del proveedor.

## 9. Integración con perfiles, adapters y contratos internos

El flujo permanece:

```text
ProcessingStep
  → ProviderAdapter
  → RawProviderArtifact inmutable
  → NormalizedProviderResult
  → CanonicalNormalizer
  → bloques/procedencia/eventos de AlgeTra
```

### 9.1. Registro inicial de adapters

| `adapter_id` | Perfil | Capacidades | Entrada/salida que debe normalizar | Fallback permitido |
| --- | --- | --- | --- | --- |
| `mathpix` | `ocr-stem-v1` | handwriting, math, latex, layout, line geometry, confidence | `text`, `data`, `line_data`, contornos, errores y uso. | Otro adapter solo si cumple todas las capacidades; si no, `manual-v1`. |
| `mistral-ocr` | `ocr-general-v1` | OCR, bloques, bbox, estructura, confidence | Respuesta OCR/annotations a regiones normalizadas; Markdown no es modelo canónico. | Google/Azure/AWS/local si locale, política y capacidades coinciden. |
| `google-document-ai` | `ocr-general-v1`/`layout-analysis-v1` | OCR, layout, tablas según processor | Páginas, tokens, polígonos, tablas y warnings. | Misma regla; no fallback LaTeX silencioso. |
| `azure-document-intelligence` | `ocr-general-v1`/`layout-analysis-v1` | Read/Layout, tablas, forms, confidence | Contenido, spans, polígonos, tablas y modelo/version. | Misma regla; container conserva la política local. |
| `aws-textract` | `ocr-general-v1`/`layout-analysis-v1` | text, handwriting, tables/forms, geometry | Blocks, relationships, confidence y feature utilizada. | Misma regla; registrar región/API. |
| `paddle-local` | `ocr-general-local-v1` | text, layout, tables/formulas según pipeline | JSON/Markdown + coordenadas, modelo y digest. | Solo bajo política local y benchmark aprobado. |
| `pix2text` | `math-local-v1` experimental | formula, text, layout, table | Markdown/LaTeX + región origen; no reemplaza el documento completo sin validación. | `manual-v1` si fórmula no compila o es ambigua. |
| `pix2tex` | `math-local-v1` crop | fórmula recortada a LaTeX | La salida se asocia al crop y a la geometría previa. | No tiene fallback textual automático; visual/manual. |
| `tesseract` | `ocr-general-local-v1` | texto español, hOCR/TSV/ALTO | Líneas/palabras y geometría; sin semántica matemática. | Solo texto general. |
| `surya-local` | `layout-analysis-v1` experimental | layout, reading order, table, math HTML | Bloques/polígonos/confidence; revisión de licencia obligatoria. | No entra en `default` hasta gate legal y benchmark. |
| `manual` | `manual-v1` | ninguna llamada externa | Región visual, edición humana y decisión explícita. | Último fallback y salida válida. |

El detalle contractual está en [`processing-provider-contract.md`](../api/processing-provider-contract.md), la arquitectura en [ART-012](./12-arquitectura-api-procesamiento-extensible.md) y el primer adapter en [`mathpix-adapter-contract.md`](../api/mathpix-adapter-contract.md).

### 9.2. No mezclar OCR, revisión lingüística e IA generativa

| Función | Perfil | Entrada | Salida | Regla |
| --- | --- | --- | --- | --- |
| OCR | `ocr-stem-v1`, `ocr-general-v1` | Imagen/recorte autorizado. | Transcripción, región, confianza, warnings y procedencia. | No corrige el contenido del alumno. |
| Revisión lingüística | `language-review-v1` | Texto canónico o validado. | Hallazgos estructurados de ortografía/gramática/puntuación. | LanguageTool u otro servicio solo propone; no muta OCR. |
| Validación matemática | `math-validation-v1` | LaTeX/texto confirmado o claramente marcado. | Parseo, equivalencia, unidades y señales deterministas. | SymPy/Pint no decide qué escribió el alumno. |
| IA generativa | `review-ai-v1` | Bloque confirmado, contexto autorizado y prompt versionado. | Sugerencia explicada, no verdad ni transcripción. | Consentimiento, procedencia, revisión humana y cuota separada. |

La API pública continúa aceptando perfiles y trabajos, por ejemplo `POST /v1/documents/{documentId}/jobs`. **No se crea ni se documenta `POST /providers/{provider}/run`**: el proveedor, sus credenciales y su payload son internos.

## 10. Fallback y política de routing P0

El router debe seguir una política determinista y auditable:

```text
1. calidad crítica       → detener llamada facturable → recaptura/manual
2. capacidades requeridas → filtrar descriptors
3. privacidad/región      → eliminar candidatos incompatibles
4. presupuesto/cuota/salud → ordenar candidatos elegibles
5. adapter primario       → nuevo provider_attempt
6. error transitorio      → backoff limitado e idempotente
7. fallback equivalente   → nuevo provider_attempt, nunca mutación silenciosa
8. sin candidato válido    → preserve_visual/manual_required
```

Reglas específicas:

- Una página mixta puede enviar texto y matemáticas a rutas distintas; el fallback se decide por bloque, no por el nombre del documento.
- Un OCR general que no produce LaTeX no puede marcar `equation` como convertida solo porque devolvió texto.
- Un proveedor con circuit breaker abierto no recibe trabajo interactivo.
- Un retry o cambio de adapter conserva el mismo `processing_step`, pero crea otro `provider_attempt` y guarda razón, versión, costo y latencia.
- No se hacen llamadas paralelas a varios proveedores en la ruta normal solo para “escoger el mejor”; `shadow` requiere corpus autorizado, presupuesto y no altera la salida del usuario.
- Si no existe un procesador equivalente, la salida correcta es una figura/recorte y `manual_required`, no una transcripción inventada.

## 11. Benchmark común `OCR-BENCH-001`

### 11.1. Corpus y fixtures

Se reutilizarán las fixtures del contrato interno y el corpus autorizado/sintético del MVP. La primera ejecución debe contener 30–50 páginas etiquetadas, con una referencia humana y permiso de uso:

| Grupo | Mínimo propuesto | Ejemplos |
| --- | ---: | --- |
| Texto manuscrito español | 10 páginas | Acentos, abreviaturas, lápiz tenue, distintas manos y renglones. |
| Matemáticas | 10 páginas/recortes | Fracciones, raíces, superíndices, matrices, límites, signos ambiguos y ecuaciones manuscritas. |
| Mixto | 10 páginas | Texto + ecuación + figura, columnas, encabezado, anotaciones y lectura no trivial. |
| Tabla/layout | 5 páginas | Celdas, merges, números y tabla manuscrita/impresa; extensión P1. |
| Figura/diagrama/gráfica | 5 páginas | Etiquetas, ejes, conexiones y regiones no convertibles; extensión P1. |
| Química/biología/técnico | 5 páginas | Exploración P2; no se usa para declarar P0. |

Las categorías pueden compartir páginas, pero cada muestra debe tener ground truth por región: tipo, texto literal, LaTeX cuando corresponda, polígono/bbox, orden, conversión posible y motivo de incertidumbre.

### 11.2. Métricas

| Dimensión | Métrica | Reporte mínimo |
| --- | --- | --- |
| Texto | CER, WER y error separado de acentos/símbolos. | Por grupo, página, idioma y severidad de calidad. |
| Matemática | Distancia normalizada de tokens/LaTeX, compilación, equivalencia simbólica cuando sea representable. | Separar errores visuales, semánticos y de formato. |
| Layout | F1 de bloques, IoU de bbox/polígono y exactitud de orden. | Texto, ecuación, tabla, figura y unknown por separado. |
| Cobertura | Recall de regiones preservadas y tasa de pérdida de contenido. | Objetivo cero de pérdida silenciosa. |
| Revisión | Correcciones por bloque, tiempo activo y porcentaje aceptable tras una edición. | Comparar contra transcripción manual. |
| Confianza | Calibración, cobertura y tasa de falsos confirmados. | La confianza nunca se interpreta aislada. |
| Operación | p50/p95/p99, cola, timeout, 429/5xx, throughput y reintentos. | Por adapter, versión, hardware y tamaño. |
| Costo | Unidades facturadas/estimadas, costo por página y por documento exportado. | Incluir variantes y llamadas fallidas observadas. |
| Privacidad | Datos enviados, logs, retención, borrado y región. | Evidencia contractual y prueba técnica. |

### 11.3. Gates antes de una recomendación

1. **Gate de contrato:** el adapter pasa fixtures de éxito, respuesta incompleta, timeout, 429, 5xx, credenciales inválidas, deduplicación, geometría y ausencia de secretos en logs.
2. **Gate de seguridad:** la política de datos, retención, región, entrenamiento, subprocesadores y eliminación está aprobada para el workspace.
3. **Gate de cobertura:** cada capacidad anunciada tiene métrica y referencia humana; una ausencia de salida produce `figure`/`unknown`, nunca texto confirmado.
4. **Gate de calidad:** el equipo aprueba umbrales separados para texto, matemáticas, layout y geometría antes de cambiar el estado del adapter. No se usa un promedio que oculte una falla matemática.
5. **Gate de costo:** el costo máximo por trabajo, variante y reintento está protegido por cuota y es visible en la estimación.
6. **Gate de operación:** healthcheck, circuit breaker, timeout, cancelación declarada, alertas y procedimiento de rollback existen.
7. **Gate de producto:** la revisión humana de una muestra representativa es más eficiente que la transcripción manual o se documenta una excepción de alcance.

Los resultados se guardarán como artefactos versionados, no como texto en la matriz: `benchmark_id`, corpus/hash, adapter/modelo, parámetros, hardware/región, fecha, métricas, errores y decisión.

## 12. Plan de rollout

| Fase | Estado de adapter | Acción | Condición de salida |
| --- | --- | --- | --- |
| S0 | `fake`/sin red | Implementar contrato, normalizador, fixtures y `manual-v1`. | El flujo completo funciona sin proveedor externo. |
| S1 | `shadow` controlado | Ejecutar Mathpix con corpus autorizado, `improve_mathpix:false`, presupuesto pequeño y logs redactados. | Contrato, privacidad y métricas correctos. |
| S2 | `canary` | Habilitar `ocr-stem-v1` para espacios piloto; medir revisión y costo real. | Gate P0 aprobado; fallback visual probado. |
| S3 | `shadow` P1 | Comparar Mistral, un general cloud y un local en el mismo corpus. | Existe diferencia medida por tipo de bloque y política. |
| S4 | `pilot` | Habilitar un `ocr-general-v1` y/o `ocr-general-local-v1` para capacidades que sí cubre. | Router, cuotas, circuit breaker y auditoría estables. |
| S5 | P1/P2 | Incorporar tablas, diagramas, gráficas y disciplina especializada por adapters separados. | Benchmark específico y revisión experta. |

El frontend solo recibe el perfil, estado, advertencias y resumen de fallback. No recibe la lista de secretos, el payload bruto ni un selector libre de proveedor.

## 13. Modelo de mantenimiento de la matriz

Para que el entregable sea versionable, cada cambio debe registrar:

```yaml
matrix_id: OCR-PROVIDER-MATRIX-001
matrix_version: 0.1
price_as_of: 2026-11-06
currency: USD
benchmark_revision: OCR-BENCH-001-not-run
provider_source_reviewed_at: 2026-11-06
```

Se crea una nueva versión cuando cambie cualquiera de estos elementos:

- precio, unidad de cobro, free tier, cuota o límite de entrada;
- modelo, endpoint, versión de SDK o esquema de respuesta;
- retención, entrenamiento, región, subprocesador o licencia;
- score/resultado del benchmark o el corpus;
- perfil, capacidad mínima o regla de fallback.

No se sobreescribe un precio histórico: se conserva la fecha de corte y se actualiza el estimador de costos con la versión correspondiente. Revisión mínima trimestral y revisión extraordinaria ante un cambio de API, incidente, precio o licencia.

## 14. Fuentes consultadas

Precios y límites son referencias de páginas oficiales consultadas el 2026-11-06:

- [Mathpix OCR API pricing](https://mathpix.com/pricing/api), [Process Images](https://docs.mathpix.com/reference/post-v3-text), [limits and quotas](https://docs.mathpix.com/reference/limits-and-quotas) y [data retention](https://docs.mathpix.com/concepts/data-retention).
- [Google Cloud Vision pricing](https://cloud.google.com/vision/pricing) y [Document AI pricing](https://cloud.google.com/document-ai/pricing).
- [Azure Document Intelligence pricing](https://azure.microsoft.com/en-us/pricing/details/ai-document-intelligence/) y [capacidades del producto](https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence).
- [Amazon Textract pricing](https://aws.amazon.com/textract/pricing/).
- [Mistral OCR 4.1](https://docs.mistral.ai/models/ocr-4-1) y [Document AI](https://docs.mistral.ai/capabilities/document_ai).
- [Mindee pricing](https://mindee.com/pricing), [OCR.Space API/pricing](https://ocr.space/ocrapi), [OCR.Space privacy](https://ocr.space/privacypolicy) y [Veryfi pricing](https://www.veryfi.com/pricing/).
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR), [Surya](https://github.com/datalab-to/surya), [Pix2Text](https://github.com/breezedeus/Pix2Text), [pix2tex/LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR), [Tesseract](https://github.com/tesseract-ocr/tesseract) y [olmOCR](https://github.com/allenai/olmocr).
- [Google ML Kit Text Recognition](https://developers.google.com/ml-kit/vision/text-recognition) y [Apple Vision text recognition](https://developer.apple.com/documentation/vision/recognizing-text-in-images) para la ruta on-device.

Estas fuentes describen capacidades y precios del proveedor; no sustituyen una revisión legal ni las pruebas con el corpus privado/autorizado de AlgeTra.

## 15. Registro de cambios

| Versión | Fecha | Cambio |
| --- | --- | --- |
| `0.1` | 2026-11-06 | Línea base de proveedores cloud, locales y on-device; precios fechados; recomendación provisional; TCO, privacidad, fallback, contrato y benchmark común. |
