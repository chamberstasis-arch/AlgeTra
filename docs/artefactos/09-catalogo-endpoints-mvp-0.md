# ART-009 — Catálogo orientativo de endpoints del MVP-0

> **Tipo:** contrato HTTP y eventos propuesto<br>
> **Identificador:** `API-MVP-0`<br>
> **Estado:** propuesta para revisión; no sustituye el contrato OpenAPI generado por FastAPI<br>
> **Fecha:** 2026-11-05<br>
> **Fuentes:** [MVP-0](./08-mvp-prototipo-inicial.md), [arquitectura](../08-arquitectura-y-tecnologias.md), [requisitos funcionales](../05-requisitos-funcionales.md), [casos de uso](../07-casos-de-uso.md) y [ADR-001](./07-adr-001-arquitectura-monolito-modular.md)

## 1. Propósito

Este artefacto propone los endpoints públicos que necesita la rebanada vertical del `MVP-0`: crear un documento, cargar de una a tres páginas, pasar la puerta de calidad, iniciar un trabajo durable, recibir resultados parciales, revisar y editar bloques, guardar una versión, previsualizar, exportar a PDF y eliminar los datos.

El catálogo es **orientativo**. Los endpoints se definen por casos de uso y recursos de dominio, no por tablas de PostgreSQL. La forma final de cada esquema deberá expresarse en Pydantic, publicarse mediante OpenAPI y probarse con contratos.

## 2. Decisiones de contrato

### 2.1. Prefijo y transporte

- La versión pública inicial es `/v1`.
- El gateway puede anteponer `/api`, pero la aplicación no debe mezclar `/api/v1` y `/v1` internamente.
- JSON se usa para solicitudes y respuestas de estado.
- Los binarios no atraviesan la API: se cargan o descargan mediante URLs firmadas de S3/MinIO.
- El progreso se entrega por SSE; el mismo recurso permite recuperar un snapshot o eventos mediante consulta JSON.
- Todas las fechas se expresan en ISO 8601 UTC.
- Los identificadores son opacos y no deben ser enteros predecibles: `doc_…`, `page_…`, `asset_…`, `job_…`, `block_…`, `ver_…`, `export_…`.

### 2.2. Autenticación y alcance

El navegador obtiene la identidad mediante el proveedor OIDC o mecanismo gestionado de invitación decidido para el piloto. La API recibe un token de acceso y deriva el principal y su espacio privado.

```http
Authorization: Bearer <access-token>
Accept: application/json
X-Request-ID: req_01J...
```

- No se crearán endpoints de registro, contraseña propia ni recuperación de contraseña.
- El cliente no envía `user_id` o `workspace_id` para decidir el propietario. El servidor lo obtiene de la sesión.
- Toda consulta por `documentId`, `pageId`, `assetId`, `blockId`, `jobId`, `versionId` o `exportId` repite la autorización en servidor.
- Una referencia inexistente y una referencia ajena pueden responder `404` de forma indistinguible para no revelar datos.

### 2.3. Concurrencia e idempotencia

Las mutaciones que crean trabajo, consumen proveedor, generan una versión o producen una exportación deben aceptar:

```http
Idempotency-Key: <clave-estable-del-intento>
```

Las ediciones sobre una versión existente deben aceptar:

```http
If-Match: "version-03-etag"
```

Si el recurso cambió desde la lectura del cliente, la API responde `409 Conflict` y devuelve el estado mínimo necesario para recuperar la edición. Nunca se sobrescribe silenciosamente una versión más nueva.

### 2.4. Envelope de error

Todas las respuestas de error públicas siguen una forma común y no contienen secretos ni texto manuscrito innecesario:

```json
{
  "error": {
    "code": "quality_gate_blocked",
    "message": "La página necesita recaptura antes de procesarse.",
    "status": 422,
    "retryable": false,
    "request_id": "req_01J...",
    "details": {
      "page_id": "page_01J...",
      "issues": ["blur_critical"]
    }
  }
}
```

`code` pertenece a un catálogo estable. `message` es apto para mostrar al usuario; los detalles internos se registran solo en telemetría redactada.

## 3. Catálogo de endpoints del MVP-0

### 3.1. Identidad y espacio privado

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-001 | `GET /v1/me` | Obtener el principal, nombre visible, espacio privado y capacidades habilitadas. | `200` con `principal`, `workspace_scope` y `features`. | MVP-0 |
| API-002 | `GET /v1/me/usage` | Consultar páginas, variantes, trabajos y presupuesto consumido durante la evaluación. | `200` con límites y consumo agregado, sin contenido académico. | MVP-0 |

El inicio de sesión, cierre de sesión y renovación de credenciales pertenecen al proveedor gestionado. Si el proveedor exige una sesión de aplicación, se añadirá un adaptador específico sin convertirlo en autenticación propia.

### 3.2. Documentos

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-010 | `GET /v1/documents` | Listar documentos propios con estado, progreso útil y asuntos pendientes. | `200` paginado por cursor. | MVP-0 |
| API-011 | `POST /v1/documents` | Crear un documento vacío o borrador. | `201` con `document_id`, título, estado y `etag`. | MVP-0 |
| API-012 | `GET /v1/documents/{documentId}` | Recuperar snapshot del documento, páginas, estado y versión activa. | `200` con metadatos y enlaces autorizados. | MVP-0 |
| API-013 | `PATCH /v1/documents/{documentId}` | Renombrar, archivar o cambiar metadatos permitidos. | `200` con nuevo snapshot y `etag`. | MVP-0 |
| API-014 | `DELETE /v1/documents/{documentId}` | Revocar acceso inmediatamente y programar la purga de activos, trabajos y exportaciones. | `202` con `purge_job_id`; no implica purga física instantánea. | MVP-0 |
| API-015 | `GET /v1/documents/{documentId}/pages` | Listar páginas, posición, calidad y estado de carga/procesamiento. | `200` con páginas ordenadas. | MVP-0 |
| API-016 | `GET /v1/documents/{documentId}/jobs` | Recuperar trabajos actuales o recientes al volver al documento. | `200` con trabajos y último snapshot. | MVP-0 |

El listado debe permitir `cursor`, `limit`, `status` y `q` con límites configurables. No se deben aceptar filtros que permitan consultar documentos fuera del principal autenticado.

### 3.3. Páginas, activos y carga directa

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-020 | `POST /v1/documents/{documentId}/pages` | Registrar una página pendiente y solicitar una URL firmada para su original. | `201` con `page`, `asset` y `upload`. | MVP-0 |
| API-021 | `POST /v1/assets/{assetId}/complete` | Confirmar que la carga directa terminó y validar tamaño, MIME y checksum. | `200` con activo confirmado o `422` con causa. | MVP-0 |
| API-022 | `PATCH /v1/documents/{documentId}/pages/order` | Confirmar el orden de una a tres páginas antes de procesar. | `200` con páginas y nueva revisión. | MVP-0 |
| API-023 | `PATCH /v1/pages/{pageId}` | Cambiar rotación, posición, reemplazo pendiente o metadatos de captura. | `200` con página actualizada. | MVP-0 |
| API-024 | `DELETE /v1/pages/{pageId}` | Retirar una página aún no confirmada o solicitar su eliminación del documento. | `204` o `202` según el estado del trabajo. | MVP-0 |
| API-025 | `GET /v1/assets/{assetId}` | Consultar metadatos, hash, linaje y estado del activo sin entregar el binario. | `200` con metadatos autorizados. | MVP-0 |
| API-026 | `POST /v1/assets/{assetId}/download-url` | Obtener una URL firmada temporal para descargar el original o derivado. | `201` con URL, operación y expiración. | MVP-0 |

`API-020` no recibe el archivo en JSON. Un ejemplo de solicitud es:

```json
{
  "position": 1,
  "file_name": "pagina-01.png",
  "content_type": "image/png",
  "byte_size": 1843200,
  "sha256": "hex-or-base64-digest"
}
```

La respuesta puede incluir una carga multipart o una URL `PUT`/`POST`, pero siempre limita objeto, método, tamaño, checksum y tiempo de expiración. Las credenciales de S3/MinIO nunca llegan al navegador.

### 3.4. Puerta de calidad y variantes

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-030 | `GET /v1/pages/{pageId}/quality` | Recuperar el último diagnóstico durable y sus señales. | `200` con severidad, señales, explicación y decisión. | MVP-0 |
| API-031 | `POST /v1/pages/{pageId}/quality` | Ejecutar o recalcular la puerta autoritativa antes de OCR facturable. | `202` con `quality_job_id` o `200` si ya existe resultado válido. | MVP-0 |
| API-032 | `POST /v1/pages/{pageId}/variants` | Crear una variante no destructiva cuando la calidad sea recuperable. | `202` con variante y trabajo de calidad. | MVP-0 |
| API-033 | `GET /v1/pages/{pageId}/variants` | Listar original, variantes, transformaciones y cuál fue seleccionada. | `200` con procedencia y parámetros. | MVP-0 |

Una página con decisión `critical` no puede llegar a `POST /v1/documents/{documentId}/jobs`. La API debe responder `422 quality_gate_blocked` aunque el cliente intente saltarse la pantalla.

### 3.5. Trabajos, pasos y progreso

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-040 | `POST /v1/documents/{documentId}/jobs` | Crear el trabajo durable para una a tres páginas aceptadas. | `202` con `job_id`, estado `queued` y pasos. | MVP-0 |
| API-041 | `GET /v1/jobs/{jobId}` | Recuperar snapshot del trabajo, pasos, errores y resultados parciales. | `200` con estado durable. | MVP-0 |
| API-042 | `POST /v1/jobs/{jobId}/retry` | Reintentar un paso o página elegible sin duplicar bloques ni cargos. | `202` con nuevo intento y clave de deduplicación. | MVP-0 |
| API-043 | `POST /v1/jobs/{jobId}/cancel` | Solicitar cancelación cuando el paso aún lo permita. | `202` con estado `cancelling` o `409` si ya no es cancelable. | MVP-0 |
| API-044 | `GET /v1/jobs/{jobId}/events` | Recibir eventos SSE reanudables o recuperar eventos JSON. | `text/event-stream` o `application/json`. | MVP-0 |
| API-045 | `GET /v1/jobs/{jobId}/partial-results` | Recuperar páginas y bloques reales publicados hasta el momento. | `200` con alcance parcial explícito. | MVP-0 |

El cuerpo de creación del trabajo debe declarar el alcance, no confiar en todos los activos del documento:

```json
{
  "page_ids": ["page_01J...", "page_01K..."],
  "variant_policy": "quality-approved",
  "processor_profile": "ocr-stem-v1",
  "execution_policy": {
    "allow_fallback": true,
    "max_attempts": 3
  },
  "queue": "ocr-interactive",
  "schema_version": "1.0"
}
```

El endpoint histórico orientativo `POST /v1/pages/{pageId}/process` puede conservarse como alias interno para reprocesamiento aislado. El flujo principal multipágina debe usar `API-040`, porque el trabajo durable pertenece al documento y coordina sus páginas. `processor_profile` expresa capacidades lógicas (`ocr-stem-v1`, `ocr-general-v1`, `manual-v1`); el cliente no selecciona Mathpix ni otro tercero. El router registra el proveedor elegido, los fallbacks y el `routing_version` en el estado interno.

### 3.6. SSE y recuperación por polling

Para SSE:

```http
GET /v1/jobs/job_01J.../events
Accept: text/event-stream
Last-Event-ID: evt_00042
```

Ejemplo de evento:

```text
id: evt_00043
event: page.result.available
data: {"job_id":"job_01J...","page_id":"page_01J...","scope":"page","status":"partial","block_count":5,"snapshot_version":7}
```

El mismo endpoint con `Accept: application/json` devuelve eventos posteriores a `after_event_id` y un cursor de continuación:

```http
GET /v1/jobs/job_01J.../events?after_event_id=evt_00042&limit=100
Accept: application/json
```

Eventos mínimos del MVP-0:

| Evento | Cuándo se publica | Datos mínimos |
| --- | --- | --- |
| `job.accepted` | El trabajo durable fue creado y encolado. | `job_id`, alcance, estado, `snapshot_version`. |
| `step.started` | Un paso reclama ejecución. | `step_id`, página, fase, intento. |
| `quality.completed` | La puerta autoritativa terminó. | decisión, señales resumidas, acción permitida. |
| `page.result.available` | Una página tiene bloques reales persistidos. | `page_id`, bloque/cantidad, versión de snapshot. |
| `provider.fallback` | El router cambió a otro adapter compatible. | perfil, intento anterior/nuevo, motivo normalizado. |
| `provider.blocked` | Ningún tercero es elegible por capacidad, política o presupuesto. | perfil, acción requerida, `retryable`. |
| `step.failed` | Un paso falla de forma recuperable o terminal. | `step_id`, código normalizado, `retryable`, acción. |
| `job.completed` | El alcance solicitado terminó. | estado final, páginas sanas, advertencias. |
| `job.cancelled` | La cancelación se hizo efectiva. | alcance cancelado, resultados conservados. |
| `heartbeat` | Mantener viva la conexión sin fingir progreso. | `job_id`, timestamp, estado durable. |

El cliente no debe convertir `heartbeat` o un porcentaje estimado en contenido. Si el historial ya expiró, primero consulta `API-041` y después continúa desde el snapshot indicado.

### 3.7. Bloques, revisión y procedencia

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-050 | `GET /v1/documents/{documentId}/blocks` | Listar bloques por página, tipo, confianza o estado de revisión. | `200` con geometría y procedencia resumida. | MVP-0 |
| API-051 | `GET /v1/blocks/{blockId}` | Abrir un bloque canónico con capas separadas. | `200` con bruto, transcripción, contenido actual y revisión. | MVP-0 |
| API-052 | `GET /v1/blocks/{blockId}/source` | Obtener el recorte autorizado y sus coordenadas. | `200` con URL firmada y geometría normalizada. | MVP-0 |
| API-053 | `PATCH /v1/blocks/{blockId}` | Editar contenido, tipo u orden permitidos en el borrador actual. | `200` con revisión, `etag` y estado de guardado. | MVP-0 |
| API-054 | `POST /v1/blocks/{blockId}/decisions` | Confirmar, rechazar, editar o dejar pendiente una ambigüedad. | `201` con decisión y nueva revisión. | MVP-0 |
| API-055 | `GET /v1/documents/{documentId}/ambiguities` | Obtener la cola navegable de ambigüedades pendientes. | `200` ordenado por impacto, confianza y página. | MVP-0 |
| API-056 | `GET /v1/blocks/{blockId}/suggestions` | Consultar sugerencias asociadas a una revisión. | `200` con origen y estado. | P1 / opcional |

Un `PATCH` nunca modifica `raw_provider_result`, `transcription` ni el activo original. La mutación solo crea una capa editable o una revisión humana sobre la versión indicada.

### 3.8. Versiones y autoguardado

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-060 | `GET /v1/documents/{documentId}/versions` | Listar versiones recuperables y su estado. | `200` con cursor y versión activa. | MVP-0 |
| API-061 | `POST /v1/documents/{documentId}/versions` | Crear snapshot de cambios confirmados y decisiones humanas. | `201` con `version_id`, `etag` y resumen. | MVP-0 |
| API-062 | `GET /v1/versions/{versionId}` | Recuperar una versión canónica para edición o composición. | `200` con esquema y bloques. | MVP-0 |
| API-063 | `POST /v1/versions/{versionId}/restore` | Crear una nueva versión basada en una versión anterior. | `201` con nueva versión; no elimina historia. | P1 |

El autoguardado puede usar `PATCH API-053` para cambios pequeños y `POST API-061` para una versión explícita. La interfaz debe distinguir `local`, `persisting`, `saved` y `conflict`; recibir `200` de una operación local no equivale a persistencia durable.

### 3.9. Revisión lingüística y matemática

Estas rutas tienen contrato reservado, pero LanguageTool y SymPy permanecen sujetos a la decisión pendiente de entrada al MVP-0.

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-070 | `POST /v1/documents/{documentId}/review-runs` | Solicitar una revisión habilitada sobre una versión. | `202` con `review_run_id`. | P1 / feature flag |
| API-071 | `GET /v1/review-runs/{reviewRunId}` | Recuperar sugerencias y estado del análisis. | `200` con resultados estructurados. | P1 / feature flag |
| API-072 | `POST /v1/suggestions/{suggestionId}/decisions` | Aceptar, rechazar u omitir una sugerencia. | `201` con edición o decisión auditada. | P1 / feature flag |

Una sugerencia nunca reemplaza el contenido por el solo hecho de existir. Su aceptación crea una edición explícita en una revisión nueva.

### 3.10. Vista previa, composición y exportación

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-080 | `POST /v1/documents/{documentId}/previews` | Solicitar o regenerar una preview para una versión, plantilla y opciones. | `202` con `preview_id` o `200` si la caché es válida. | MVP-0 |
| API-081 | `GET /v1/documents/{documentId}/preview` | Obtener el snapshot paginado de preview y advertencias. | `200` con páginas renderizadas y estado. | MVP-0 |
| API-082 | `POST /v1/documents/{documentId}/exports` | Crear un PDF desde una versión válida, con confirmación de advertencias. | `202` con `export_id`. | MVP-0 |
| API-083 | `GET /v1/exports/{exportId}` | Consultar estado, versión, plantilla, advertencias y errores. | `200` con estado de exportación. | MVP-0 |
| API-084 | `GET /v1/exports/{exportId}/download` | Obtener URL firmada para el PDF terminado. | `201` con URL temporal. | MVP-0 |
| API-085 | `POST /v1/exports/{exportId}/retry` | Reintentar una exportación fallida sin duplicar el artefacto válido. | `202` con nuevo intento. | MVP-0 |

Solicitud mínima de exportación:

```json
{
  "version_id": "ver_01J...",
  "template_id": "academic-clean-v1",
  "options": {
    "page_size": "A4",
    "orientation": "portrait"
  },
  "confirm_warnings": ["preserved_figure_01"]
}
```

`API-082` debe rechazar una versión con asuntos bloqueantes. Si existen advertencias permitidas, `confirm_warnings` debe enumerar sus identificadores; no se aceptará una confirmación global ambigua.

### 3.11. Eliminación, auditoría y operación

| ID | Método y ruta | Propósito | Respuesta principal | Prioridad |
| --- | --- | --- | --- | --- |
| API-090 | `GET /v1/documents/{documentId}/audit` | Mostrar al propietario un resumen de procedencia y decisiones de su documento. | `200` sin cuerpos sensibles innecesarios. | MVP-0 |
| API-091 | `GET /healthz` | Liveness del proceso API. | `200` sin autenticación ni datos de usuario. | Operación |
| API-092 | `GET /readyz` | Readiness contra dependencias requeridas para admitir tráfico. | `200` o `503` sin secretos. | Operación |
| API-093 | `GET /metrics` | Exponer métricas para el colector interno. | `200` protegido por red/identidad operativa. | Operación |

La purga física no se expone como mutación directa de objetos. `DELETE API-014` crea o reutiliza un trabajo de purga auditable y revoca el acceso antes de iniciar su ejecución.

## 4. Estados y códigos HTTP

### 4.1. Estados visibles mínimos

| Recurso | Estados sugeridos |
| --- | --- |
| Documento | `draft`, `uploading`, `processing`, `partial`, `review`, `ready_for_export`, `exporting`, `exported`, `error`, `deleting`, `deleted`. |
| Página | `local`, `pending_upload`, `uploaded`, `quality_checking`, `quality_blocked`, `accepted`, `processing`, `partial`, `ready`, `error`, `manual`. |
| Trabajo | `queued`, `running`, `partial`, `retryable_error`, `completed`, `cancel_requested`, `cancelled`, `failed`. |
| Bloque | `pending`, `confirmed`, `ambiguous`, `edited`, `preserved_visual`, `unknown`. |
| Exportación | `queued`, `rendering`, `ready`, `warning_confirmation_required`, `failed`, `expired`. |

### 4.2. Códigos HTTP

| Código | Uso en el MVP-0 |
| --- | --- |
| `200` | Lectura o mutación síncrona completada. |
| `201` | Recurso, decisión o URL firmada creada. |
| `202` | Trabajo aceptado; todavía no implica finalización. |
| `204` | Eliminación de una relación sin cuerpo de respuesta. |
| `400` | Solicitud malformada o parámetro inválido. |
| `401` | Token ausente, inválido o expirado. |
| `403` | Principal válido sin permiso; puede ocultarse como `404` para recursos ajenos. |
| `404` | Recurso no visible para el principal. |
| `409` | Conflicto de versión, estado o idempotencia incompatible. |
| `410` | URL firmada o exportación expirada. |
| `413` | Archivo o solicitud fuera del límite de tamaño. |
| `415` | MIME no admitido. |
| `422` | Regla de negocio no satisfecha, como puerta de calidad bloqueada. |
| `429` | Cuota, concurrencia o presupuesto temporalmente excedido. |
| `503` | Dependencia no disponible o sistema no listo; incluir `Retry-After` cuando aplique. |

## 5. Matriz de autorización resumida

| Operación | Alumno propietario | Otro alumno | Operador | Servicio worker |
| --- | --- | --- | --- | --- |
| Listar/abrir sus documentos | Sí | No | No por defecto | No |
| Crear/cargar/editar/exportar | Sí | No | No | Mediante comando interno acotado |
| Recibir SSE de su trabajo | Sí | No | Solo herramienta operativa sin contenido | No |
| Leer original o recorte | Sí mediante URL firmada | No | No por defecto | Sí, con alcance del paso |
| Eliminar documento | Sí | No | Procedimiento controlado | Ejecuta purga, no decide |
| Leer métricas agregadas | Propias | No | Sí, sin contenido | Propias del paso |

El worker no recibe permisos generales del usuario: utiliza una identidad de servicio y un alcance firmado por `job_id`, `step_id` y activos autorizados. Las URLs de objetos expiran y se invalidan al eliminar o revocar el activo.

## 6. Observabilidad y trazabilidad

Cada petición debe correlacionarse sin registrar el contenido académico:

```text
request_id → document_id → page_id → job_id → step_id → provider_attempt_id → export_id
```

Se deben medir como mínimo:

- latencia y estado por endpoint;
- tamaño y resultado de cargas;
- tiempo en cola y primer resultado útil;
- reconexiones SSE, `Last-Event-ID` y eventos recuperados por polling;
- reintentos y claves de idempotencia duplicadas;
- costo aproximado por página, variante, proveedor y exportación;
- códigos de error y alcance afectado.

Los logs no deben incluir por defecto texto manuscrito, imágenes, LaTeX completo, cuerpos de documentos, tokens ni URLs firmadas completas.

## 7. Orden sugerido de implementación

| Slice | Endpoints mínimos | Evidencia |
| --- | --- | --- |
| S0 — Fixtures | `API-041`, `API-044`, `API-050`, adaptadores fake y schemas. | Contratos reproducibles sin proveedor externo. |
| S1 — Captura | `API-001`, `API-010`–`API-026`. | Documento, páginas, carga directa y aislamiento. |
| S2 — Calidad | `API-030`–`API-033`. | Captura crítica bloqueada antes de OCR y linaje conservado. |
| S3 — Pipeline | `API-040`–`API-045`. | Trabajo durable, eventos reanudables, parcial y reintento. |
| S4 — Revisión | `API-050`–`API-062`. | Ambigüedad, recorte, edición y versión recuperable. |
| S5 — Entrega | `API-080`–`API-085`, `API-014`. | Preview, PDF trazable, advertencias y eliminación. |
| S6 — Operación | `API-002`, `API-090`–`API-093`. | Métricas, auditoría mínima y pruebas de carga. |

## 8. Decisiones pendientes

1. Confirmar si el gateway público usará `/v1` o `/api/v1`; el contrato interno debe conservar un único prefijo.
2. Elegir el mecanismo OIDC/sesión gestionada y los claims que determinan el espacio privado.
3. Definir el proveedor S3/MinIO, tamaño máximo, expiración de URLs y estrategia multipart.
4. Fijar los límites de páginas, variantes, reintentos, cuota y presupuesto.
5. Decidir si `API-070`–`API-072` entra en MVP-0 o se mantiene detrás de feature flag.
6. Definir la retención de eventos SSE y exportaciones expiradas.
7. Generar el contrato OpenAPI y pruebas de autorización horizontal antes de conectar el frontend a datos reales.

## 9. Exclusiones explícitas

Este catálogo no habilita todavía:

- colaboración, organizaciones o compartir con docentes;
- PDF de entrada, DOCX u otros exportadores;
- segundo OCR automático;
- reconstrucción semántica de gráficas, diagramas o química;
- notificaciones externas;
- endpoints de entrenamiento con contenido del usuario;
- acceso operativo al contenido manuscrito sin autorización y procedimiento específico.

La existencia de una ruta futura en este documento no convierte la capacidad en alcance implementado. Toda ampliación debe mantener trazabilidad con la ERS, el FBS, el feature model y una prueba de aceptación.
