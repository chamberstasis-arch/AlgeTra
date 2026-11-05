# Enfoque de la solución

## 1. Visión general

AlgeTra se abordará como un flujo de transformación supervisado y multidisciplinario. El sistema recibirá uno o más documentos manuscritos, comprobará primero su calidad, segmentará cada página y utilizará Mathpix u otros procesadores según el tipo de bloque. Después organizará el contenido en una estructura editable y ayudará al usuario a convertirlo en un entregable.

La inteligencia artificial funcionará como una capa de revisión y orientación. No deberá reemplazar automáticamente el contenido reconocido ni ocultar el texto original.

La especificación normativa completa se encuentra en la [ERS](./03-ers-especificacion-de-requisitos.md).

## 2. Principios del producto

### 2.1. Fidelidad antes que corrección

La primera responsabilidad del sistema es representar lo que aparece en el manuscrito. Una transcripción fiel y una versión corregida son resultados distintos y deben mostrarse como tales.

### 2.2. Usuario en control

Toda corrección, reclasificación o cambio sugerido deberá poder aceptarse, editarse o rechazarse. La IA no modificará silenciosamente el trabajo.

### 2.3. Incertidumbre visible

Cuando un fragmento sea ilegible, tenga varias interpretaciones posibles o presente baja certeza, el sistema deberá resaltarlo y solicitar confirmación en lugar de presentarlo como correcto.

### 2.4. Explicaciones, no solo respuestas

Ante un posible error matemático, la solución deberá indicar qué parte parece incorrecta, explicar el motivo y, cuando sea posible, mostrar un procedimiento desglosado paso a paso.

### 2.5. Resultado editable y reutilizable

El contenido reconocido se representará mediante una estructura interna editable, no únicamente como texto plano o una imagen. Esto permitirá aplicar estilos, reorganizar bloques y generar distintos formatos de entrega.

### 2.6. Procesamiento multidisciplinario

Una página puede combinar español, matemáticas, química, tablas, diagramas o gráficas. El sistema deberá clasificar y enrutar bloques individualmente, sin asumir que un único proveedor o una única materia resuelven todo el documento.

### 2.7. Inmediatez honesta

La aplicación responderá de inmediato mediante miniaturas locales, esqueletos identificables, fases reales y resultados parciales. No presentará placeholders, porcentajes inventados ni contenido simulado como resultados terminados.

## 3. Flujo propuesto

### Paso 1. Captura o carga del trabajo

El usuario incorporará fotografías, imágenes escaneadas o archivos compatibles que contengan una o más páginas manuscritas.

El sistema deberá ayudar a detectar problemas básicos que afecten el reconocimiento, por ejemplo:

- Imagen borrosa.
- Página recortada.
- Orientación incorrecta.
- Iluminación insuficiente.
- Orden dudoso de las páginas.
- Exposición extrema, sombras o reflejos.
- Perspectiva incorrecta o página incompleta.
- Contraste insuficiente entre el papel y la tinta o el lápiz.

Una captura con información irrecuperable no deberá enviarse automáticamente a OCR o IA de pago. El sistema explicará cómo recapturarla y permitirá sustituirla o conservarla para edición manual.

### Paso 2. Preparación del archivo

Antes de enviarlo al OCR, se normalizará el material cuando sea necesario: orientación, perspectiva, tamaño, iluminación, contraste y demás ajustes que mejoren la lectura sin alterar el original.

El archivo original será inmutable. Las técnicas —por ejemplo, corrección de perspectiva, CLAHE, reducción moderada de ruido o umbral adaptativo— generarán variantes trazables. No se aplicará una transformación agresiva única a todas las imágenes, porque podría borrar lápiz tenue, puntos o signos.

### Paso 3. Segmentación, clasificación y reconocimiento

La página se dividirá en bloques con geometría y orden de lectura. Mathpix será el OCR principal para contenido STEM, pero estará encapsulado detrás de un adaptador y podrá complementarse con OCR general y procesadores especializados. Se buscará recuperar, según las capacidades disponibles:

- Texto manuscrito.
- Expresiones y símbolos matemáticos.
- Estructura de párrafos y bloques.
- Listas, tablas u otros elementos reconocibles.
- Información de confianza o señales útiles para detectar ambigüedad.
- Regiones de figuras, diagramas, gráficas y estructuras químicas, aunque no siempre puedan reconstruirse automáticamente.

La respuesta original de cada proveedor deberá conservarse para trazabilidad y diagnóstico, separada del documento que edite el usuario. La confianza del proveedor será una señal, no una garantía de corrección.

### Paso 4. Normalización y estructuración

El resultado del OCR se transformará en un modelo de documento propio de AlgeTra. En lugar de manejar únicamente una cadena de texto, el sistema trabajará con bloques semánticos, por ejemplo:

- Portada.
- Título y subtítulos.
- Párrafos.
- Listas.
- Ecuaciones y procedimientos.
- Tablas.
- Estructuras químicas.
- Diagramas y diagramas de flujo.
- Gráficas, ejes y series.
- Figuras conservadas visualmente.
- Clasificaciones o etiquetas.
- Campos rellenables.
- Notas y textos resaltados.
- Fragmentos ambiguos.

Este modelo intermedio evitará depender directamente del formato de respuesta de un proveedor, de Mathpix Markdown o del editor visual y facilitará la edición, revisión y exportación.

### Paso 5. Revisión de ambigüedades

El sistema marcará los fragmentos que requieran atención. La detección podrá combinar:

- Señales de confianza proporcionadas por el OCR, cuando existan.
- Reglas sobre símbolos o estructuras incompletas.
- Inconsistencias de contexto.
- Una revisión adicional asistida por IA.

El usuario deberá poder comparar cada fragmento con la región correspondiente de la imagen original y confirmar o editar la transcripción.

### Paso 6. Revisión asistida por IA

Una vez obtenida y preferentemente validada la transcripción, se podrá solicitar una revisión del contenido. Se combinarán correctores lingüísticos, validadores deterministas y, cuando aporte valor, inteligencia artificial. Todas las observaciones se almacenarán como sugerencias y no como cambios definitivos.

Para un posible error en una ecuación o procedimiento, la sugerencia debería incluir:

1. El fragmento observado.
2. El tipo de problema detectado.
3. Una explicación de por qué podría estar mal.
4. Una propuesta de corrección.
5. El procedimiento paso a paso, cuando corresponda.
6. Una advertencia cuando la IA no tenga suficiente certeza.

La interfaz deberá diferenciar visualmente el contenido original, la transcripción, las ediciones del usuario y las sugerencias de IA.

Para español se contemplarán ortografía, gramática y puntuación. Para matemáticas se utilizará SymPy cuando el problema sea representable; para magnitudes y unidades se incorporará Pint. Las áreas sin un validador determinista deberán mostrar el carácter asistido e incierto de la revisión.

### Paso 6.1. Figuras, diagramas y gráficas

Las regiones visuales tendrán tres posibles tratamientos:

1. **Semántico:** representación editable confirmada.
2. **Asistido:** propuesta de elementos que el usuario debe completar o corregir.
3. **Visual:** recorte original preservado cuando no exista certeza suficiente.

Los diagramas de flujo podrán representarse como nodos y conexiones. Las gráficas podrán reconstruirse mediante ejes, calibración y series. El sistema nunca eliminará la referencia visual original.

### Paso 7. Composición del entregable

Con el contenido validado, el usuario podrá convertirlo en un documento presentable. La composición contemplará progresivamente:

- Formato, orientación y márgenes de página.
- Portada con campos editables.
- Títulos y subtítulos.
- Tipografía, tamaño y color del texto.
- Texto resaltado.
- Espaciado y alineación.
- Representación legible de ecuaciones.
- Tipos o clasificaciones de contenido.
- Campos rellenables.
- Plantillas o estilos de entrega.

Los estilos deberán mantenerse separados del contenido para permitir que una misma transcripción adopte diferentes presentaciones sin volver a procesar el manuscrito.

### Paso 8. Vista previa y generación final

Antes de generar el archivo final, el usuario revisará una vista previa y los asuntos pendientes, como ambigüedades sin resolver o sugerencias no atendidas.

El sistema generará el entregable en uno o más formatos habilitados. Como mínimo, la primera versión deberá soportar PDF como formato final estable y adecuado para entrega académica.

## 4. Componentes conceptuales

La solución se dividirá inicialmente en los siguientes componentes, de acuerdo con la arquitectura base aprobada:

1. **Aplicación web:** captura, calidad rápida, carga, edición, revisión y diseño del entregable con React y Vite.
2. **API modular:** administra identidad, documentos, permisos, cuotas y trabajos mediante FastAPI.
3. **Servicio de documentos:** administra páginas, bloques canónicos, versiones y estados.
4. **Procesador de imagen:** evalúa calidad y genera variantes con OpenCV y scikit-image.
5. **Orquestador asíncrono:** ejecuta pasos y reintentos con Celery y Redis, manteniendo estado durable en PostgreSQL.
6. **Adaptadores OCR:** encapsulan Mathpix y futuros proveedores generales o especializados.
7. **Procesadores de revisión:** integran LanguageTool, SymPy, Pint y proveedores de IA.
8. **Motor de composición y exportación:** aplica estilos y genera vistas y PDF mediante HTML/CSS y Playwright.
9. **Persistencia y trazabilidad:** usa PostgreSQL para metadatos y almacenamiento S3/MinIO para archivos.
10. **Observabilidad:** mide latencia, calidad, errores, costos y colas sin registrar contenido sensible por defecto.

## 5. Modelo de estados inicial

Un documento podrá avanzar por estados semejantes a los siguientes:

1. `borrador`
2. `validando_calidad`
3. `requiere_recaptura`
4. `listo_para_cargar`
5. `cargando`
6. `en_procesamiento`
7. `parcialmente_procesado`
8. `requiere_revision`
9. `en_edicion`
10. `listo_para_exportar`
11. `exportado`
12. `cancelado`, `archivado` o `con_error`

Los nombres definitivos se establecerán al diseñar el dominio y la API. El propósito de estos estados es hacer visible el progreso, permitir reintentos y evitar la pérdida de trabajo.

## 6. Entrega por etapas

### Etapa 1. Captura y transcripción base

- Carga de una o varias páginas.
- Diagnóstico previo de calidad y recaptura.
- Mejora no destructiva de imágenes recuperables.
- Integración segura con Mathpix.
- Conservación del archivo y la respuesta originales.
- Conversión a un modelo editable.
- Visualización y edición de texto y ecuaciones.

### Etapa 2. Validación y ambigüedades

- Marcado de contenido incierto.
- Comparación entre imagen y transcripción.
- Confirmación o corrección por parte del usuario.
- Historial básico de modificaciones.

### Etapa 3. Creación del entregable

- Portada y estructura del documento.
- Estilos de página y texto.
- Resaltados, clasificaciones y campos rellenables.
- Vista previa y exportación inicial a PDF.

### Etapa 4. Revisión inteligente

- Detección de posibles errores.
- Sugerencias explicadas.
- Procedimientos matemáticos paso a paso.
- Aceptación o rechazo explícito de sugerencias.
- Revisión lingüística en español.
- Uso de validadores deterministas antes de explicaciones generativas cuando sea posible.

### Etapa 5. Robustez y ampliación

- Mejora de precisión y tiempos de procesamiento.
- Nuevas plantillas y formatos de exportación.
- Colaboración o revisión docente, si se prioriza.
- Métricas de calidad y retroalimentación del usuario.
- OCR general alternativo y procesadores por disciplina.
- Reconstrucción asistida de diagramas de flujo y gráficas.
- Química, unidades y herramientas para ciencias.

El orden podrá ajustarse durante la planificación. En particular, se podrá validar tempranamente la revisión con IA mediante una experiencia limitada, sin integrarla todavía en todo el flujo.

## 7. Riesgos y medidas iniciales

| Riesgo | Medida propuesta |
| --- | --- |
| OCR incorrecto por mala calidad de imagen o escritura difícil | Validar la captura, mostrar la imagen original y destacar fragmentos inciertos. |
| Esperar por una captura irrecuperable | Ejecutar una puerta de calidad antes de OCR y solicitar recaptura con instrucciones concretas. |
| Preprocesamiento que elimina trazos | Conservar original y varias derivadas trazables; evitar una cadena agresiva universal. |
| Interpretación equivocada de símbolos matemáticos | Usar Mathpix como motor especializado y exigir revisión en casos ambiguos. |
| Confundir un error del OCR con un error académico | Revisar primero la transcripción y registrar sobre qué versión se ejecutó el análisis. |
| Sugerencias incorrectas o inventadas por la IA | Presentarlas como sugerencias, indicar incertidumbre y requerir decisión del usuario. |
| Pérdida de fidelidad al “corregir” automáticamente | Conservar por separado el original, la transcripción y la versión editada. |
| Dependencia de un proveedor externo | Encapsular Mathpix detrás de un adaptador y utilizar un modelo interno propio. |
| Costos o límites de las APIs | Medir consumo, controlar reintentos y definir límites por archivo o usuario. |
| Exposición de información académica o de menores | Minimizar datos, proteger credenciales, cifrar comunicaciones y definir retención y eliminación. |
| Generación de un entregable incompleto | Mostrar validaciones y asuntos pendientes antes de exportar. |
| Diagramas o gráficas reconstruidos incorrectamente | Usar reconstrucción asistida, comparar con el original y conservar un modo visual seguro. |
| Experiencia lenta o silenciosa | Miniaturas locales, trabajo asíncrono, resultados parciales, SSE y mensajes de fase reales. |
| Progreso o placeholders engañosos | Identificarlos, usar unidades reales y no presentarlos como resultados. |

## 8. Privacidad y seguridad desde el diseño

Debido a que el sistema puede procesar información de menores de edad y documentos escolares, las siguientes condiciones deberán considerarse requisitos de base:

- Las credenciales de Mathpix y de cualquier servicio de IA permanecerán únicamente en servicios seguros del lado del servidor.
- Se recopilarán solo los datos necesarios para prestar el servicio.
- Se informará qué contenido se envía a proveedores externos.
- Se definirán políticas de retención, descarga y eliminación de archivos.
- El contenido del alumno no se utilizará para entrenamiento sin una autorización explícita y válida.
- Se controlará el acceso a originales, transcripciones y entregables.
- Los registros técnicos evitarán almacenar contenido sensible salvo que sea estrictamente necesario.

## 9. Alcance inicial propuesto

La primera versión útil deberá demostrar el flujo completo con un alcance acotado, pero sobre un modelo multidisciplinario:

1. Cargar un trabajo manuscrito.
2. Evaluar su calidad antes de consumir OCR y mejorar las capturas recuperables.
3. Procesarlo con Mathpix a través de un adaptador y conservar figuras no soportadas.
4. Mostrar progresivamente una transcripción editable en español con soporte matemático.
5. Señalar fragmentos que requieren revisión.
6. Ofrecer revisión lingüística y una revisión académica inicial con sugerencias separadas.
7. Permitir una presentación básica con títulos, estilos y portada.
8. Conservar diagramas y gráficas visualmente aunque todavía no sean editables.
9. Generar un PDF.

## 10. Decisiones pendientes

Antes de completar la implementación del producto deberán definirse, entre otros puntos:

- Proveedor de identidad compatible con OIDC.
- Segundo OCR para español, después de un benchmark.
- Límites iniciales de entrada, páginas, costo y concurrencia.
- Tipos de contenido y disciplinas prioritarios después del MVP.
- Proveedor y modelo de IA para la revisión.
- Políticas concretas de privacidad y retención.
- Criterios medibles de precisión y calidad.
- País, nivel y currículo iniciales para revisión contextual.
- Herramienta final de edición de diagramas genéricos.

Estas decisiones se documentarán dentro de `docs/` conforme sean acordadas.


Helianthus 290 cc; offer: 246.5m, 
scatha 392 cc; offer: 340m, 
hedgedog: 24m, 
mosquito: 191m, 
glacite: 34m, 
mithril: 13.6m, 
eq de farming: 72 cc, 61.2 offer, 
cow: 17.85, 
pest vest: 8m, 
sprayonator: 20.4m, 
eq pest: 15m,
