# PRD — Documento de requisitos de producto

> **Producto:** AlgeTra  
> **Versión:** 0.1  
> **Estado:** propuesta de producto derivada de la [ERS](./03-ers-especificacion-de-requisitos.md)  
> **Fecha:** 2026-10-03

## 1. Resumen ejecutivo

AlgeTra transforma trabajos académicos manuscritos en entregables digitales editables. El producto reduce la transcripción repetitiva, conserva la relación con el manuscrito, detecta contenido incierto y ofrece revisión lingüística y académica sin modificar silenciosamente el trabajo del alumno.

El producto empezará con español, matemáticas y documentos mixtos, pero se construirá sobre un modelo capaz de incorporar ciencias, biología, química, física, mecánica, mecatrónica, diagramas y gráficas.

La velocidad forma parte del valor central. AlgeTra debe sentirse inmediato incluso cuando el procesamiento completo sea asíncrono: mostrará la captura local, validará calidad, comunicará cada fase y entregará páginas o bloques progresivamente. Esta estrategia no permitirá presentar datos inventados como resultados reales.

## 2. Visión

> Convertir cualquier trabajo académico manuscrito en un documento digital confiable, comprensible y listo para entregar, con el menor esfuerzo posible y sin perder control sobre lo que escribió el alumno.

## 3. Problema de producto

Los alumnos pueden dedicar más tiempo a volver a escribir una tarea que a comprenderla o mejorarla. Las herramientas existentes suelen resolver solo una parte del problema:

- Reconocen texto, pero no crean un entregable.
- Reconocen matemáticas, pero no revisan redacción o disciplinas distintas.
- Esperan a que termine todo el procesamiento antes de mostrar valor.
- Ocultan incertidumbre o mezclan transcripción con corrección.
- Fallan con fotografías deficientes después de haber consumido tiempo y cuota.
- Conservan diagramas como imágenes sin ayudar a reconstruirlos.
- Generan resultados de IA sin suficiente procedencia o control humano.

## 4. Oportunidad

AlgeTra puede diferenciarse mediante la combinación de:

1. Captura guiada y rechazo temprano de imágenes irrecuperables.
2. OCR especializado y general en una misma arquitectura.
3. Modelo documental propio, editable y multidisciplinario.
4. Correcciones lingüísticas y académicas explicadas.
5. Reconstrucción asistida de diagramas y gráficas.
6. Composición y exportación sin depender de otra aplicación.
7. Experiencia progresiva y comunicativa.
8. Privacidad, procedencia y decisión humana desde el diseño.

## 5. Usuarios objetivo

### 5.1. Persona principal: alumno

- Cursa primaria avanzada, secundaria, preparatoria o educación superior.
- Recibe o realiza tareas manuscritas que debe entregar digitalmente.
- Puede usar teléfono o computadora.
- Tiene conocimientos variables de procesadores de texto y edición matemática.
- Espera una solución más rápida que transcribir manualmente.
- Necesita entender qué partes requieren revisión, sin aprender herramientas complejas.

### 5.2. Persona secundaria: docente o revisor

- Quiere recibir trabajos legibles y estructurados.
- Puede requerir fidelidad respecto del manuscrito.
- En el futuro podrá comentar o revisar con autorización del alumno.

### 5.3. Persona secundaria: tutor

- Ayuda a interpretar errores y acompañar el aprendizaje.
- Requiere acceso explícitamente autorizado.

### 5.4. Persona operativa

- Supervisa salud del sistema, colas, costos y errores.
- No debe acceder al contenido académico salvo necesidad autorizada y auditable.

## 6. Trabajos que el usuario necesita realizar

| ID | Cuando... | Quiero... | Para... |
| --- | --- | --- | --- |
| JTBD-001 | Tengo varias páginas manuscritas | capturarlas y ordenarlas rápidamente | no volver a escribir todo el trabajo. |
| JTBD-002 | Una foto quedó borrosa u oscura | saberlo antes de enviarla | repetirla inmediatamente y evitar esperar un resultado inútil. |
| JTBD-003 | El sistema no entiende una palabra o símbolo | ver exactamente la región problemática | corregirla con confianza. |
| JTBD-004 | Mi texto tiene faltas | recibir sugerencias separadas de la transcripción | mejorar el entregable sin falsear lo que escribí. |
| JTBD-005 | Un procedimiento parece incorrecto | entender dónde y por qué | aprender y decidir si corrijo. |
| JTBD-006 | Mi tarea contiene una gráfica o diagrama | conservarlo o reconstruirlo con ayuda | entregar una versión digital legible. |
| JTBD-007 | El procesamiento tarda algunos segundos | ver progreso y contenido disponible | no sentir que la aplicación se detuvo. |
| JTBD-008 | Ya validé el contenido | aplicar una presentación | obtener un archivo listo para entregar. |

## 7. Principios de experiencia

### 7.1. Inmediatez honesta

- Toda acción debe tener respuesta visual inmediata.
- La aplicación debe mostrar miniaturas locales antes de completar la carga.
- Los esqueletos deben representar espacios reservados, no contenido supuesto.
- El texto “listo” solo se utilizará cuando el resultado correspondiente exista.
- Las estimaciones deben basarse en mediciones; si no hay una estimación confiable se mostrarán fases, no tiempos inventados.

### 7.2. Progreso que aporta valor

- Mostrar qué página se valida, carga, procesa o revisa.
- Habilitar resultados parciales de inmediato.
- Permitir comenzar la revisión mientras otras páginas continúan.
- Mantener el trabajo al cerrar la vista o perder temporalmente la conexión.

### 7.3. Incertidumbre accionable

- Resaltar el fragmento y la razón de duda.
- Mostrar el recorte original junto con la interpretación.
- Ofrecer alternativas cuando existan.
- Permitir confirmar, editar, omitir o reprocesar.

### 7.4. Control del alumno

- Toda corrección será una propuesta.
- Se podrá revisar cada cambio antes de exportar.
- El original y la transcripción literal seguirán disponibles.

### 7.5. Complejidad progresiva

- La ruta principal debe ser simple: capturar, revisar, presentar y exportar.
- Las opciones avanzadas aparecerán cuando sean relevantes.
- La disciplina podrá inferirse, pero el usuario podrá corregirla.

## 8. Viaje principal

### Etapa 1. Crear y capturar

1. El usuario crea un documento.
2. Selecciona o fotografía páginas.
3. Ve miniaturas de inmediato.
4. El sistema evalúa cada captura localmente.
5. Una página irrecuperable se detiene y explica cómo repetirla.
6. Una página recuperable se carga mientras el usuario continúa.

### Etapa 2. Procesar

1. El backend conserva el original.
2. Genera variantes no destructivas.
3. Segmenta y clasifica bloques.
4. Enruta texto, matemáticas, tablas y figuras.
5. Publica resultados conforme terminan.
6. Si un proveedor falla, aísla el fallo y ofrece reintento.

### Etapa 3. Validar

1. El usuario recibe una lista priorizada de ambigüedades.
2. Compara transcripción y recorte.
3. Confirma o edita.
4. Puede reprocesar una región sin repetir todo el documento.

### Etapa 4. Mejorar

1. Ejecuta revisión lingüística o académica.
2. Ve sugerencias con categoría y explicación.
3. Acepta, rechaza o edita individualmente.
4. Conserva el historial de decisión.

### Etapa 5. Componer y entregar

1. Selecciona plantilla o formato.
2. Configura portada, página y estilos.
3. Revisa asuntos pendientes.
4. Previsualiza el resultado.
5. Exporta a PDF.

## 9. Propuesta de alcance por horizonte

### 9.1. P0 — Primera versión utilizable

#### Captura y procesamiento

- Aplicación web adaptable.
- Cuenta y documentos privados.
- JPEG, PNG y PDF.
- Varias páginas y reordenamiento.
- Miniaturas locales y carga directa.
- Evaluación previa de calidad.
- Recaptura guiada para fallos críticos.
- Original inmutable y variantes derivadas.
- Procesamiento asíncrono.
- Mathpix como OCR STEM.
- Modelo documental canónico.
- Resultados progresivos.

#### Revisión

- Texto en español y matemáticas.
- Comparación por región.
- Ambigüedades visibles.
- Edición de texto y ecuaciones.
- LanguageTool para ortografía y gramática.
- Sugerencias académicas limitadas y claramente separadas.
- Validación matemática determinista donde sea posible.

#### Entregable

- Portada.
- Títulos, subtítulos y párrafos.
- Colores, resaltado, tipografía y márgenes.
- Vista previa.
- Advertencias de contenido pendiente.
- Exportación a PDF.

#### Operación

- Estado durable de trabajos.
- Reintentos idempotentes.
- Métricas de latencia, error y costo.
- Retención y eliminación básica.
- Registros sin contenido sensible por defecto.

### 9.2. P1 — Expansión funcional

- OCR alternativo para español tras benchmark.
- Glosarios por materia.
- Unidades físicas con Pint.
- Contexto por nivel y materia.
- Reprocesamiento por bloque.
- Diagramas en modo de reconstrucción asistida.
- Diagramas de flujo editables.
- Digitalización de gráficas con calibración.
- Plantillas reutilizables.
- Campos rellenables.
- Restauración de versiones.
- Notificaciones de trabajos prolongados.

### 9.3. P2 — Especialización y organizaciones

- Química con estructuras editables, SMILES y validación especializada.
- Procesadores de biología, mecánica y mecatrónica.
- Fuentes académicas verificables por currículo.
- Formatos adicionales de exportación.
- Colaboración autorizada con docentes o tutores.
- Organizaciones educativas, membresías y políticas.
- Modelos especializados autoalojados cuando sea conveniente.

## 10. Tratamiento por tipo de contenido

| Tipo | Resultado P0 | Evolución |
| --- | --- | --- |
| Texto español | Transcripción, edición y revisión lingüística | Glosarios, estilo y contexto educativo |
| Matemáticas | LaTeX editable, ambigüedades y validación inicial | Más dominios y explicación pedagógica especializada |
| Tablas | Estructura editable cuando OCR lo permita | Mejoras de celdas y exportación de datos |
| Química | Preservación visual y texto circundante | SMILES, editor y RDKit/DECIMER |
| Diagramas | Recorte preservado y etiquetas detectables | Reconstrucción asistida y edición semántica |
| Diagrama de flujo | Imagen conservada | Nodos, conexiones y editor React Flow |
| Gráfica | Imagen conservada y etiquetas cuando existan | Ejes calibrados, series y Plotly |
| Biología | Imagen y etiquetas | Regiones semánticas y revisión contextual |
| Mecánica/mecatrónica | Imagen, texto, ecuaciones y unidades | Símbolos, circuitos y diagramas especializados |

## 11. Métricas de producto

### 11.1. Métrica principal

**Tiempo activo ahorrado por documento terminado:** diferencia estimada entre la transcripción manual de referencia y el tiempo activo que el usuario invierte en AlgeTra, sin contar espera pasiva.

### 11.2. Activación

- Porcentaje de usuarios que llegan de la primera captura al primer resultado útil.
- Tiempo hasta primera respuesta visual.
- Tiempo hasta primer resultado útil.
- Porcentaje de documentos que llegan a exportación.

### 11.3. Calidad

- Tasa de corrección manual por tipo de bloque.
- Error de caracteres y palabras en muestras controladas.
- Equivalencia matemática en muestras controladas.
- Porcentaje de ambigüedades relevantes detectadas.
- Porcentaje de sugerencias aceptadas, rechazadas o editadas.
- Tasa de diagramas o gráficas que requieren volver al modo visual.

### 11.4. Captura

- Tasa de recaptura solicitada.
- Tasa de falsos rechazos de calidad.
- Tasa de capturas irrecuperables que alcanzan un proveedor de pago.
- Mejora de precisión atribuible al preprocesamiento.

### 11.5. Rendimiento y fiabilidad

- p50, p95 y p99 por fase.
- Tiempo en cola.
- Primer resultado por página.
- Disponibilidad y tasa de error.
- Éxito de reintentos.
- Costo por página y documento exportado.

### 11.6. Guardas éticas

- Incidentes donde un placeholder se percibió como resultado real.
- Correcciones aplicadas sin aceptación explícita: objetivo cero.
- Uso de contenido para entrenamiento sin autorización: objetivo cero.
- Accesos no autorizados confirmados: objetivo cero.

## 12. Criterios de lanzamiento P0

La primera versión no deberá liberarse a usuarios reales hasta demostrar:

1. El flujo completo funciona desde carga hasta PDF.
2. Las capturas críticas se detienen antes del OCR con una explicación útil.
3. Los originales nunca son sobrescritos.
4. Texto y matemáticas pueden editarse y compararse con su origen.
5. Las sugerencias no modifican contenido automáticamente.
6. El usuario recibe progreso continuo o una explicación de espera.
7. Una interrupción del navegador no elimina el trabajo confirmado.
8. Los límites y costos de proveedores están protegidos.
9. La eliminación y autorización han sido probadas.
10. Los objetivos iniciales de rendimiento se midieron en una carga de referencia.
11. Se realizó una prueba con muestras variadas, incluida escritura tenue.
12. Los asuntos pendientes aparecen antes de exportar.

## 13. Estrategia de validación

### 13.1. Prototipo técnico

- Evaluar calidad de imagen con muestras reales.
- Comparar original contra variantes CLAHE, umbral adaptativo y corrección de iluminación.
- Medir Mathpix en español, matemáticas y páginas mixtas.
- Medir el costo y latencia por página.
- Comprobar extracción de geometría y recortes.

### 13.2. Prototipo de experiencia

- Probar captura, recaptura y carga progresiva.
- Comprobar que el usuario diferencia esqueletos, transcripción y sugerencias.
- Medir cuánto tarda en resolver ambigüedades.
- Evaluar si los mensajes reducen incertidumbre durante esperas.

### 13.3. Benchmark multidisciplinario

El segundo OCR y los procesadores especializados no se seleccionarán solo por documentación comercial. Se compararán con un conjunto representativo, métricas por tipo de bloque, costo, latencia, privacidad y facilidad de integración.

## 14. Riesgos de producto

| Riesgo | Impacto | Respuesta |
| --- | --- | --- |
| Prometer reconstrucción universal | Pérdida de confianza | Comunicar niveles semántico, asistido y visual. |
| Procesamiento lento | Abandono | Calidad local, carga directa, resultados progresivos y trabajo en segundo plano. |
| Progreso ficticio | Frustración cuando se detiene | Estados reales, progreso ponderado y modo indeterminado honesto. |
| Rechazo excesivo de fotos | Fricción | Explicar, permitir reemplazo rápido y medir falsos rechazos. |
| Sugerencias académicas erróneas | Daño educativo | Validadores deterministas, contexto, fuentes y aceptación humana. |
| Costos altos | Producto inviable | Calidad previa, caché, idempotencia, cuotas y enrutamiento selectivo. |
| Alcance demasiado amplio | Retraso | Modelo general desde el inicio y capacidades especializadas por fases. |
| Manejo de datos de menores | Riesgo legal y reputacional | Minimización, consentimiento, eliminación y proveedores evaluados. |

## 15. Dependencias y decisiones pendientes

- Proveedor de identidad.
- Segundo OCR para texto general.
- Proveedor de IA y residencia de datos.
- Mercado, país y nivel educativo inicial.
- Límites comerciales por usuario.
- Política de retención.
- Herramienta final de diagramas genéricos.
- Fuentes académicas autorizadas para revisión contextual.

Estas decisiones corresponden a `DA-001` a `DA-008` en la ERS y no invalidan la arquitectura base.
