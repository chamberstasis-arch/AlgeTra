# ART-008 — MVP experimental del prototipo inicial

> **Tipo:** definición de MVP y alcance de validación<br>
> **Identificador:** `MVP-0`<br>
> **Estado:** propuesta para la rama `feature/prototipo-inicial-mvp`<br>
> **Fecha:** 2026-11-05<br>
> **Fuentes:** [resumen de visión y prototipo](../12-resumen-vision-y-prototipo.md), [FBS](./05-feature-breakdown-structure.md), [feature model](./06-feature-model.md) y [ADR-001](./07-adr-001-arquitectura-monolito-modular.md)

## 1. Corrección terminológica

**Prototipo** y **MVP** no son sinónimos:

| Concepto | Propósito | Nivel de compromiso |
| --- | --- | --- |
| Prototipo técnico | Validar factibilidad, calidad, latencia, costo o una hipótesis de diseño. Puede ser interno y desechable. | Bajo; no promete una experiencia completa. |
| Prototipo vertical | Recorrer de extremo a extremo una experiencia estrecha con componentes reales. | Medio; demuestra integración, no producto terminado. |
| MVP | Mínima versión utilizable por un grupo definido de usuarios, con controles suficientes de seguridad, datos, soporte y medición. | Alto; debe poder usarse y evaluarse de manera repetible. |
| P0 / primera versión utilizable | Alcance de producto definido en la ERS para una liberación más amplia. | Mayor; incluye operación, privacidad y calidad de lanzamiento. |

Por eso, el nombre recomendado para esta rama no es simplemente “MVP del prototipo”. El término más preciso es:

> **MVP-0 — MVP experimental basado en la rebanada vertical del Prototipo B.**

El **Prototipo A** sigue siendo un benchmark técnico previo. El `MVP-0` incorpora sus resultados seleccionados en una experiencia limitada, evaluable e invitación solamente. No debe presentarse todavía como el MVP comercial ni como la P0 completa de AlgeTra.

## 2. Objetivo

Demostrar que un alumno o evaluador invitado puede convertir entre una y tres fotografías manuscritas en un PDF revisable sin utilizar una segunda herramienta, conservando la relación entre la imagen original, la transcripción, las ediciones y las advertencias.

El MVP-0 debe responder con evidencia:

1. si el flujo ahorra tiempo activo frente a transcribir manualmente;
2. si el usuario puede resolver ambigüedades comparando el recorte con la transcripción;
3. si el control de calidad evita procesar fotografías claramente irrecuperables;
4. si los resultados parciales reducen la sensación de espera sin inventar contenido;
5. si el modelo canónico soporta texto, matemáticas y figuras preservadas;
6. si la arquitectura mantiene trabajos y datos aislados bajo concurrencia inicial.

## 3. Usuario, contexto y límites de la evaluación

### 3.1. Usuario objetivo

Alumno o evaluador invitado que:

- tiene una tarea manuscrita de español con matemáticas ocasionales;
- puede usar un navegador de escritorio o móvil moderno;
- necesita entregar un PDF;
- no debe conocer LaTeX ni conceptos de OCR;
- acepta revisar el resultado antes de exportarlo.

### 3.2. Modo de acceso

- Acceso por invitación y autenticación gestionada; no se implementarán contraseñas propias.
- Sin organizaciones, docentes, tutores ni colaboración.
- Datos sintéticos, autorizados o anonimizados durante la evaluación.
- No se aceptará contenido de menores para un piloto abierto hasta resolver consentimiento, jurisdicción, retención y contratos de proveedores.

### 3.3. Tamaño inicial de evaluación

La primera evaluación no pretende representar estadísticamente a todo el mercado. Se propone:

- 5 a 10 evaluadores invitados para usabilidad;
- 30 a 50 páginas etiquetadas para benchmark técnico;
- 10 a 20 documentos de recorrido completo;
- al menos un escritorio y un móvil de gama media;
- red estable, lenta e intermitente durante las pruebas de resiliencia.

El corpus debe tener autorización o ser sintético y conservar una transcripción de referencia para medir texto, matemáticas, geometría y esfuerzo de corrección.

## 4. Alcance incluido

### 4.1. Flujo principal

```text
invitación y acceso
  → crear documento
  → seleccionar 1–3 imágenes JPEG/PNG
  → miniaturas locales
  → diagnóstico básico de calidad
  → recapturar o confirmar
  → cargar original a almacenamiento
  → crear trabajo asíncrono
  → generar variante no destructiva
  → OCR mediante adaptador Mathpix
  → normalizar bloques
  → mostrar página o bloque real conforme termina
  → comparar una ambigüedad con su recorte
  → editar texto o LaTeX básico
  → guardar una versión
  → vista previa
  → exportar PDF
```

### 4.2. Capacidades del MVP-0

| ID | Capacidad | Criterio de inclusión | FBS / requisitos |
| --- | --- | --- | --- |
| MVP-0.01 | Acceso privado | Cada evaluador solo ve sus documentos y trabajos. | FBS-01, FBS-09; RF-001, RF-002 |
| MVP-0.02 | Entrada reducida | Admitir una a tres imágenes JPEG/PNG dentro de límites visibles. | FBS-02; RF-010, RF-011 |
| MVP-0.03 | Miniatura inmediata | Mostrar preview local sin esperar la API. | FBS-02.02; RF-012, RF-070 |
| MVP-0.04 | Puerta de calidad | Rechazar una captura críticamente irrecuperable con explicación accionable. | FBS-03; RF-013–RF-015 |
| MVP-0.05 | Original inmutable | Guardar original, variante y relación de procedencia separadamente. | FBS-03.04–03.05, FBS-05; RF-016–RF-018 |
| MVP-0.06 | Trabajo durable | Crear trabajo y pasos con estado en PostgreSQL; usar Celery/Redis para ejecución. | FBS-04; RF-020, RF-028 |
| MVP-0.07 | Progreso real | Mostrar fases, errores y resultados parciales mediante SSE con consulta de respaldo. | FBS-04.07, FBS-10; RF-027, RF-071–RF-076 |
| MVP-0.08 | Bloques canónicos | Representar `heading`, `paragraph`, `equation`, `figure` y `unknown` con geometría y origen. | FBS-05; RF-026, RF-030–RF-032 |
| MVP-0.09 | Revisión visual | Mostrar el recorte original junto a la transcripción y marcar una ambigüedad. | FBS-06.01–06.02; RF-035, RF-036 |
| MVP-0.10 | Edición controlada | Editar texto y LaTeX básico sin alterar la transcripción bruta. | FBS-05.04, FBS-07; RF-033, RF-034, RF-055 |
| MVP-0.11 | Persistencia de versión | Guardar cambios y recuperar el trabajo después de cerrar el navegador. | FBS-05.05; RF-037, RNF-REL-004 |
| MVP-0.12 | Composición mínima | Aplicar portada sencilla, estilos mínimos y vista previa paginada. | FBS-07.03–07.04; RF-050–RF-053, RF-060 |
| MVP-0.13 | PDF trazable | Generar PDF con texto, ecuaciones y figuras disponibles, asociado a la versión. | FBS-07.05; RF-061–RF-063 |
| MVP-0.14 | Métricas | Medir latencia, error, costo aproximado, recaptura, ambigüedad y corrección manual. | FBS-10; RF-084, RF-089, RNF-OBS-002 |
| MVP-0.15 | Eliminación | Permitir eliminar el trabajo y programar la purga conforme a la política de evaluación. | FBS-09.02; RF-005, RF-082 |

## 5. Alcance explícitamente excluido

No forma parte del MVP-0:

- aplicación móvil nativa;
- colaboración simultánea o compartir con docentes/tutores;
- organizaciones, planes comerciales o facturación de usuarios;
- PDF de entrada, DOCX, PPTX u otros exportadores;
- segundo OCR o selección automática entre varios OCR;
- reconstrucción editable de diagramas y gráficas;
- química estructural, biología especializada, mecánica o mecatrónica;
- revisión académica generativa completa;
- entrenamiento con contenido del usuario;
- notificaciones externas;
- multi-región, alta disponibilidad contractual o residencia configurable por país;
- editor visual avanzado;
- modo offline completo.

El contenido no soportado no se elimina: se conserva como `figure` o `unknown` y debe poder incluirse visualmente en la exportación.

## 6. Hipótesis y resultados esperados

| ID | Hipótesis | Cómo se prueba | Señal inicial de éxito |
| --- | --- | --- | --- |
| H-001 | La revisión asistida es más rápida que volver a transcribir todo. | Comparar tiempo activo con una tarea manual de referencia. | La mediana de tiempo activo del MVP-0 es menor que la línea base en páginas calificadas. |
| H-002 | El usuario entiende qué debe confirmar. | Prueba de usabilidad con ambigüedades reales y entrevista breve. | Al menos 8 de 10 evaluadores identifican y resuelven la ambigüedad sin explicación del equipo. |
| H-003 | La puerta de calidad evita gasto inútil. | Inyectar capturas críticas y revisar llamadas externas. | Ninguna captura clasificada como crítica se envía automáticamente a un proveedor facturable. |
| H-004 | Los resultados parciales reducen la espera percibida. | Comparar sesión con progreso real contra pantalla bloqueada. | Los evaluadores pueden describir la fase y continuar sin asumir que la aplicación falló. |
| H-005 | El modelo canónico conserva contenido mixto. | Fixtures de texto, ecuaciones y figuras con round-trip a PDF. | Cero originales sobrescritos y ningún bloque `figure`/`unknown` desaparece en preview o PDF. |
| H-006 | El sistema recupera trabajos confirmados. | Desconectar navegador, API y worker en momentos controlados. | Todos los trabajos confirmados se recuperan; los reintentos no duplican bloques ni cargos. |
| H-007 | La arquitectura escala el cuello de botella correcto. | Prueba con API, colas y workers escalados por separado. | La carga de OCR o exportación no bloquea la admisión ni la lectura de documentos. |

Las señales son objetivos de validación iniciales, no promesas de precisión comercial. Los umbrales de OCR se fijarán después del benchmark del Prototipo A y se separarán por texto, matemáticas y estructura.

## 7. Criterios de aceptación del recorrido

### AC-01 — Captura y calidad

- **Dado** que un evaluador selecciona una imagen válida, **cuando** termina la lectura local, **entonces** aparece una miniatura y el usuario puede continuar interactuando.
- **Dado** que la imagen tiene un defecto crítico, **cuando** termina la evaluación servidor, **entonces** se explica el defecto y no se invoca automáticamente OCR facturable.
- **Dado** que la imagen es recuperable, **cuando** inicia procesamiento, **entonces** el original queda inmutable y la variante queda relacionada.

### AC-02 — Procesamiento

- **Dado** que el usuario confirma una a tres páginas, **cuando** crea el trabajo, **entonces** la API responde sin esperar la finalización de OCR.
- **Dado** que una página termina antes que otra, **cuando** se persiste su resultado, **entonces** esa página queda disponible para revisión.
- **Dado** que un paso falla, **cuando** se muestra el error, **entonces** se conserva el alcance sano y se ofrece reintento acotado.

### AC-03 — Revisión y edición

- **Dado** que existe un bloque ambiguo, **cuando** el usuario lo abre, **entonces** ve recorte, interpretación y estado de confianza.
- **Dado** que edita un bloque, **cuando** guarda, **entonces** la edición pertenece a una revisión nueva y la transcripción original sigue consultable.
- **Dado** que una sugerencia o validación está habilitada, **cuando** se muestra, **entonces** no cambia el contenido hasta una acción explícita.

### AC-04 — Exportación

- **Dado** que el documento tiene una versión válida, **cuando** solicita preview, **entonces** se renderizan texto, ecuaciones y figuras disponibles.
- **Dado** que no hay bloqueantes o el usuario confirma la advertencia, **cuando** solicita PDF, **entonces** el archivo queda asociado a versión, plantilla y estado.
- Ningún skeleton, placeholder o resultado no confirmado puede copiarse o exportarse como contenido real.

### AC-05 — Seguridad y datos

- Un usuario no puede leer, descargar, recibir eventos SSE ni eliminar activos de otro usuario.
- El original no se sobrescribe en ninguna operación.
- Los logs no contienen por defecto texto manuscrito, imágenes, ecuaciones ni secretos.
- La eliminación revoca acceso de inmediato y deja trazabilidad de la purga sin retener contenido innecesario.

## 8. Arquitectura del MVP-0

El MVP-0 utiliza la decisión del [ADR-001](./07-adr-001-arquitectura-monolito-modular.md), reducida a un recorrido operativo:

| Componente | Responsabilidad | Escalado inicial |
| --- | --- | --- |
| React + TypeScript + Vite | Captura, preview, estados, revisión y edición. | Hosting estático/CDN. |
| FastAPI modular | Autorización, documentos, activos, trabajos, bloques, versiones y exportaciones. | Réplicas stateless. |
| Worker de calidad/OCR | Variantes, llamada Mathpix, normalización y persistencia parcial. | Cola `ocr-interactive`; concurrencia limitada por proveedor. |
| Worker de exportación | HTML/CSS, KaTeX y Chromium mediante Playwright. | Cola `export`; límites de memoria y tiempo. |
| PostgreSQL | Estado durable, metadatos, bloques, versiones, outbox y auditoría mínima. | Una instancia gestionada para evaluación; índices y pool. |
| S3/MinIO | Originales, variantes, recortes y PDFs. | Almacenamiento de objetos y lifecycle. |
| Redis/Celery | Broker, colas y ejecución asíncrona. | Separación de colas; no fuente de verdad. |
| SSE + polling | Progreso y recuperación de estado. | Eventos con `event_id` y snapshot durable. |

No se crearán servicios independientes por `texto`, `matemáticas`, `figuras` o `revisión`. Los límites internos deben ser respetados para poder extraer un worker o adaptador si el benchmark lo justifica.

## 9. Plan de implementación por slice

| Slice | Entrega | Dependencias | Evidencia |
| --- | --- | --- | --- |
| S0 — Fixtures y base | Corpus autorizado/sintético, esquema canónico mínimo, fake de Mathpix, configuración y trazas. | Prototipo A y FBS-05. | Fixtures reproducibles y llamadas externas desactivadas por defecto. |
| S1 — Captura | Acceso invitado, documento, selección, preview local, validación de formato y carga directa. | S0, FBS-01–02. | AC-01 parte local y pruebas de aislamiento. |
| S2 — Calidad | Señales cliente/servidor, recaptura, variantes y linaje. | S1, benchmark. | AC-01 completo y no envío crítico. |
| S3 — Pipeline | Trabajo durable, outbox, colas, Mathpix, normalización, SSE y reintento. | S2, FBS-04. | AC-02 y pruebas de desconexión/duplicación. |
| S4 — Revisión | Comparación por recorte, ambigüedad, edición de texto/LaTeX y autoguardado. | S3, FBS-05–06. | AC-03 y medición de tiempo activo. |
| S5 — Entrega | Portada mínima, preview paginada, PDF, advertencias y eliminación. | S4, FBS-07/09. | AC-04/05 y recorrido E2E. |
| S6 — Evaluación | Instrumentación, carga inicial, pruebas con invitados y decisión de continuación. | S0–S5. | Informe de hipótesis, métricas, defectos y backlog P0. |

## 10. Métricas del MVP-0

### 10.1. Producto y usuario

- tiempo activo desde carga hasta PDF;
- comparación con línea base manual;
- porcentaje de documentos que llegan al primer resultado útil;
- porcentaje que llega a PDF;
- tiempo para resolver una ambigüedad;
- cantidad de ediciones por bloque y por página;
- errores percibidos y razones de abandono;
- diferencia entre confianza mostrada y corrección humana.

### 10.2. Técnica y costo

- p50, p95 y p99 por fase;
- tiempo en cola y edad del trabajo más antiguo;
- tiempo hasta primer resultado útil;
- tasa de reintento, duplicación y fallo parcial;
- costo por página, variante y proveedor;
- uso de CPU/memoria de calidad y Playwright;
- conexiones, latencia y tamaño de PostgreSQL;
- bytes y errores de S3/MinIO;
- conexiones SSE, reconexiones y eventos recuperados por polling.

### 10.3. Guardas de confianza

Objetivo cero para:

- originales sobrescritos;
- placeholders exportados como resultado;
- correcciones aplicadas sin aceptación;
- llamadas facturables para capturas críticas rechazadas;
- accesos cruzados confirmados;
- contenido del usuario usado para entrenamiento sin consentimiento.

## 11. Objetivos de rendimiento iniciales

Se heredan los objetivos de la ERS; se medirán bajo una carga de referencia y no se presentarán como garantía del producto:

| Medición | Objetivo inicial |
| --- | --- |
| Retroalimentación de acción local | ≤100 ms p95 |
| Diagnóstico inicial de calidad | ≤1.5 s p95 en dispositivo de referencia |
| Primer resultado útil con proveedor saludable | ≤15 s p95 |
| Actualización de estado | Cada ≤2 s mientras exista actividad o latido equivalente |
| Edición | ≤100 ms p95 en documento de referencia |
| PDF de hasta 10 páginas | ≤15 s p95 bajo carga normal |

El objetivo de precisión no se inventará antes del benchmark: se reportará por texto, matemáticas, estructura y geometría con una línea base manual.

## 12. Seguridad, privacidad y operación del piloto

Antes de invitar evaluadores:

1. definir origen y permiso del corpus;
2. elegir autenticación gestionada para acceso por invitación;
3. documentar qué datos recibe Mathpix y su retención;
4. fijar un presupuesto máximo y límites de páginas/variantes;
5. configurar retención corta de evaluación y un proceso de purga;
6. probar aislamiento, URLs firmadas, SSE y eliminación;
7. desactivar uso para entrenamiento salvo consentimiento explícito y separado;
8. definir contacto de soporte y procedimiento de incidente;
9. no procesar datos de menores en un entorno abierto sin revisión legal y consentimiento válido.

## 13. Definition of Done del MVP-0

El MVP-0 puede pasar a evaluación con invitados solo si:

- los slices S0–S5 tienen pruebas automatizadas y un recorrido E2E;
- el flujo completo funciona con un fake reproducible y con Mathpix habilitado explícitamente;
- los originales, derivados, OCR, ediciones y PDF están separados;
- una captura crítica se detiene antes de la llamada facturable;
- el trabajo sobrevive a la desconexión del navegador;
- los reintentos no duplican bloques, versiones ni cargos evitables;
- el usuario ve estados reales y ningún placeholder se exporta;
- la autorización se prueba en acceso permitido, horizontal y expirado;
- la purga elimina o programa todos los activos definidos por la política;
- existe telemetría de latencia, costo, errores y corrección sin contenido sensible;
- se ejecuta una prueba de carga inicial con API, colas, workers y PostgreSQL;
- el equipo registra las hipótesis que se confirmaron, rechazaron o quedaron pendientes.

## 14. Criterio de salida

El MVP-0 no se convierte automáticamente en P0. Al terminar la evaluación se debe producir una decisión:

| Resultado | Acción |
| --- | --- |
| Hipótesis confirmadas | Priorizar endurecimiento, ampliar corpus y planificar P0. |
| OCR útil solo en ciertos tipos | Reducir promesa, ajustar feature model y mejorar calidad/procesadores. |
| Revisión demasiado costosa | Rediseñar interacción antes de ampliar disciplinas. |
| Costo o latencia no viables | Ajustar variantes, colas, proveedor o modelo de negocio antes de añadir funciones. |
| Fallos de confianza o privacidad | Bloquear usuarios reales y corregir controles; no compensar con UI. |
| Frontera de escala identificada | Crear ADR de extracción únicamente para el módulo demostrado. |

La salida correcta puede ser continuar, acotar, repetir el benchmark o detener el MVP. El artefacto no debe convertir una hipótesis en compromiso irreversible.

## 15. Decisiones pendientes antes de implementar

1. Proveedor OIDC o mecanismo gestionado de invitación (`DA-001`).
2. Presupuesto y credenciales de Mathpix para evaluación.
3. Corpus autorizado y transcripciones de referencia.
4. Retención exacta del entorno de evaluación.
5. Dispositivo y red de referencia.
6. Límite máximo de páginas, tamaño, variantes y reintentos.
7. Elección de si LanguageTool y SymPy entran en `MVP-0` o después del primer recorrido.
8. Plataforma de despliegue del piloto.

No es necesario decidir todavía un segundo OCR, una arquitectura de microservicios, un proveedor definitivo de IA, colaboración o multi-región.
