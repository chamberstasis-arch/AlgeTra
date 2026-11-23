# ART-012 — Arquitectura de API y procesamiento extensible por terceros

> **Tipo:** arquitectura backend, orquestación y contrato de proveedores<br>
> **Identificador:** `PROCESSING-ARCH-001`<br>
> **Estado:** propuesta reforzada para MVP-0/P1; pendiente de implementación FastAPI<br>
> **Fecha:** 2026-11-05<br>
> **Contrato público:** [`docs/api/openapi.yaml`](../api/openapi.yaml)<br>
> **Contrato interno:** [`docs/api/processing-provider-contract.md`](../api/processing-provider-contract.md)

## 1. Decisión

AlgeTra no debe modelar Mathpix como “el procesador”. Debe modelar una **capacidad de procesamiento** y resolver en backend qué proveedor o combinación de proveedores puede ejecutarla.

```text
API pública
  → perfil lógico de procesamiento
  → trabajo durable + pasos
  → orquestador
  → router de capacidades y política
  → adaptador de tercero
  → resultado bruto inmutable
  → normalizador canónico
  → bloque/procedencia/evento
```

Mathpix será el primer adaptador habilitado para `ocr-stem-v1`, pero la API pública no debe obligar al cliente a enviar `mathpix`, `app_id`, `app_key` ni tipos de respuesta de Mathpix.

## 2. Fronteras de contrato

| Capa | Contrato | Puede conocer proveedores | Fuente de verdad |
| --- | --- | --- | --- |
| Navegador | OpenAPI público, SSE/polling y modelo canónico | No | API AlgeTra |
| API | Comandos de documento, job, revisión y exportación | Solo perfiles/capacidades públicas | PostgreSQL + outbox |
| Orquestador | `ProcessingJob`, `ProcessingStep`, `ProviderAttempt` | Sí, por identificador interno | PostgreSQL |
| Adaptador | `ProviderRequest` / `ProviderResponse` | Sí | Resultado bruto en S3/MinIO |
| Normalizador | `NormalizedProviderResult` → modelo canónico | No debe depender de una respuesta concreta | Código de dominio versionado |
| Tercero | HTTP/SDK/webhook propio | Solo su propio formato | Proveedor externo, nunca como estado de AlgeTra |

Un proveedor puede fallar, cambiar de versión o ser retirado sin cambiar la identidad del documento ni el esquema canónico.

## 3. Perfiles lógicos de procesamiento

El cliente solicita un perfil, no un proveedor:

| Perfil | Capacidades requeridas | Ejemplo de proveedor inicial | Estado |
| --- | --- | --- | --- |
| `ocr-stem-v1` | texto manuscrito, matemáticas, LaTeX, layout, geometría | Mathpix | MVP-0 |
| `ocr-general-v1` | texto manuscrito, español, layout básico | OCR general futuro | P1 |
| `layout-analysis-v1` | regiones, lectura, tablas y figuras | Modelo interno/futuro | P1 |
| `language-review-v1` | ortografía y sugerencias no destructivas | LanguageTool/futuro | P1 |
| `math-validation-v1` | parseo, equivalencia y señales matemáticas | SymPy/futuro | P1 |
| `manual-v1` | ninguna llamada externa | núcleo AlgeTra | MVP-0 |

La resolución de un perfil devuelve capacidades y advertencias, no una promesa de que cada región será convertible. El sistema debe conservar visualmente lo que no pueda normalizar.

## 4. Modelo interno mínimo

### 4.1. `processor_profile`

Configuración versionada y administrada por backend:

```json
{
  "id": "ocr-stem-v1",
  "schema_version": "1.0",
  "required_capabilities": ["handwriting", "math", "line_geometry"],
  "output_contract": "normalized-ocr-v1",
  "fallback_policy": "same-capability-only",
  "enabled": true
}
```

### 4.2. `provider_descriptor`

Registro interno, nunca expuesto completo al navegador:

```json
{
  "id": "mathpix-prod",
  "adapter": "mathpix",
  "adapter_version": "1.0.0",
  "capabilities": ["handwriting", "math", "layout", "line_geometry", "confidence"],
  "supported_locales": ["es", "en"],
  "regions": ["managed-default"],
  "data_policy": "external-processing-approved",
  "cost_class": "metered",
  "rollout": "canary",
  "enabled": true
}
```

El descriptor debe incluir límites, timeout, tamaño máximo, formatos, retención declarada, política de datos, salud y fecha de expiración de credenciales.

### 4.3. Entidades de ejecución

PostgreSQL debe separar al menos:

- `processing_jobs`: intención del usuario, perfil, estado y alcance;
- `processing_steps`: fase, página/bloque, intento, estado y deduplicación;
- `provider_attempts`: proveedor elegido, versión, timestamps, error normalizado, costo y latencia;
- `raw_provider_artifacts`: respuesta completa inmutable, hash, retención y referencia S3/MinIO;
- `normalized_results`: salida estable del adaptador antes del modelo canónico;
- `processor_events`: eventos reanudables y snapshot versionado;
- `provider_rollouts`: peso, audiencia, entorno y ventana de canary;
- `provider_health`: latencia, errores, circuit breaker y última prueba de contrato.

La tabla de `provider_attempts` es la auditoría que permite explicar por qué se usó un tercero y por qué se hizo fallback.

## 5. Puerto de adaptador

El código de dominio debe depender de un puerto, no de Mathpix:

```python
class ProcessorAdapter(Protocol):
    descriptor: ProviderDescriptor

    async def prepare(
        self,
        request: ProviderInput,
        context: ExecutionContext,
    ) -> ProviderRequest: ...

    async def execute(
        self,
        request: ProviderRequest,
        context: ExecutionContext,
    ) -> ProviderResponse: ...

    def normalize(
        self,
        response: ProviderResponse,
        context: ExecutionContext,
    ) -> NormalizedProviderResult: ...

    def classify_error(self, error: Exception) -> ProviderError: ...
```

Reglas del puerto:

1. `prepare` solo recibe un activo autorizado y opciones del perfil.
2. `execute` tiene timeout, cancelación, límite de bytes y correlación.
3. `normalize` produce un contrato versionado, no `Block` directamente.
4. Los errores se clasifican como `invalid_input`, `auth`, `rate_limited`, `timeout`, `unavailable`, `provider_bug` o `policy_blocked`.
5. El adaptador nunca escribe directamente el documento ni emite eventos de negocio.
6. La respuesta bruta se persiste antes de normalizar cuando la política de retención lo permite.

El contrato completo de entrada, salida, errores y pruebas está en [`processing-provider-contract.md`](../api/processing-provider-contract.md). El contrato específico de Mathpix implementa este puerto en [`mathpix-adapter-contract.md`](../api/mathpix-adapter-contract.md).

## 6. Selección y fallback

El router recibe:

- perfil lógico;
- capacidades requeridas;
- locale y tipo de contenido;
- política de datos del espacio;
- presupuesto y clase de cola;
- salud actual del proveedor;
- elegibilidad de fallback.

El router devuelve un plan determinista:

```json
{
  "profile": "ocr-stem-v1",
  "capabilities": ["handwriting", "math", "line_geometry"],
  "candidates": ["mathpix-prod", "ocr-stem-shadow"],
  "selected": "mathpix-prod",
  "fallback_allowed": true,
  "decision_reason": "capabilities_and_policy_match",
  "routing_version": "route-2026-11-05-01"
}
```

Reglas:

- No hacer fallback a un proveedor que no cumpla las capacidades mínimas.
- No hacer fallback a una política de datos menos permisiva.
- No cambiar de proveedor dentro del mismo intento sin registrar un nuevo `provider_attempt`.
- Un reintento puede cambiar de proveedor solo si la política lo permite y la entrada es idempotente.
- Un resultado válido se reutiliza aunque el proveedor primario esté temporalmente caído.
- Un proveedor con circuit breaker abierto no recibe trabajo interactivo.

## 7. Ciclo de vida del trabajo

```text
accepted
  → planned
  → quality_verified
  → step_queued
  → provider_selected
  → provider_running
  → raw_saved
  → normalized
  → canonical_persisted
  → partial_published
  → completed
```

Estados alternativos:

- `waiting_for_retry`: error transitorio con próximo intento;
- `blocked_by_policy`: falta de consentimiento, presupuesto o política de datos;
- `manual_required`: no existe proveedor elegible o la calidad impide procesar;
- `cancel_requested` / `cancelled`;
- `failed`: error terminal con acción explicable.

Cada transición debe ser válida para el estado anterior, idempotente y acompañada de un evento durable. Redis/Celery transporta mensajes; no autoriza transiciones por sí mismo.

## 8. Aceptación de terceros y extensión gradual

### 8.1. Checklist de onboarding

Un tercero no entra al registro productivo solo por implementar HTTP. Debe entregar:

1. Descriptor de capacidades y límites.
2. Adaptador que cumpla el puerto común.
3. Fixtures sin datos personales y respuestas versionadas.
4. Pruebas de timeout, `429`, 5xx, credenciales inválidas y respuesta incompleta.
5. Prueba de idempotencia y deduplicación.
6. Mapeo de geometría y confianza al contrato normalizado.
7. Política de retención, región, subprocesadores y eliminación.
8. Estimación de costo, cuota y límites de concurrencia.
9. Healthcheck y métrica de latencia/error.
10. Revisión de secretos, permisos y logs redactados.

### 8.2. Estados de rollout

```text
registered → contract-tested → disabled → shadow → canary → pilot → default → deprecated → retired
```

- `shadow`: recibe una copia autorizada o fixture, pero no cambia el resultado del usuario.
- `canary`: porcentaje pequeño de espacios explícitamente habilitados.
- `pilot`: corpus y presupuesto limitados, con observación diaria.
- `default`: elegible para el router general.
- `deprecated`: no recibe trabajos nuevos, pero conserva lectura de resultados.
- `retired`: se impide reintento con ese adaptador; no se borra la procedencia histórica.

El rollout se controla por configuración de backend, no por un flag enviado por el navegador.

## 9. API pública versus administración interna

La API pública debe seguir hablando de perfiles y trabajos:

- `POST /v1/documents/{documentId}/jobs` recibe `processor_profile` y opciones de resultado.
- `GET /v1/jobs/{jobId}` expone estado, pasos, advertencias y si hubo fallback, sin secretos.
- SSE publica `provider.fallback` como evento de transparencia resumida, no el payload del tercero.
- `GET /v1/me/usage` agrega intentos y unidades sin revelar credenciales ni facturación interna.

La administración de proveedores pertenece a un plano interno protegido, fuera del OpenAPI del navegador:

- registrar descriptor y versión de adaptador;
- activar/desactivar proveedor;
- configurar rollout y circuit breaker;
- rotar secretos;
- aprobar política de datos;
- consultar costo, salud y pruebas de contrato.

No se debe crear un endpoint público `POST /providers/{provider}/run`.

## 10. Compatibilidad y versionado

- `processor_profile` y `output_contract` tienen versión explícita.
- Se pueden añadir campos opcionales a `NormalizedProviderResult` sin romper consumidores.
- Un cambio incompatible crea `normalized-ocr-v2` y una nueva versión de perfil.
- La procedencia conserva `adapter_version`, `provider_model`, `routing_version` y `schema_version`.
- Un documento antiguo se puede renderizar aunque el proveedor original esté retirado.
- La API no devuelve tipos de SDK del tercero; solo schemas propios.

## 11. Observabilidad y seguridad

Cada intento debe correlacionar:

```text
request_id → job_id → step_id → provider_attempt_id → raw_artifact_id → event_id
```

Se registran latencia, tamaño, código normalizado, costo estimado, intento, proveedor y versión. Se redactan imágenes, texto manuscrito, credenciales, URLs firmadas y tokens.

El worker debe recibir secretos por gestor de secretos, usar egress permitido, limitar el objeto al alcance del trabajo y borrar URLs temporales de memoria después del intento.

## 12. Plan por fases

| Fase | Backend | Terceros |
| --- | --- | --- |
| S0 | Puerto, fake adapter, normalizador, fixtures, estados y outbox. | Mathpix simulado; sin red. |
| S1 | Registro de perfiles y descriptor interno; Mathpix detrás del adaptador. | Mathpix en entorno controlado. |
| S2 | Router de capacidades, reintentos y `provider_attempts`. | Segundo adapter en `shadow`. |
| S3 | Canaries, circuit breaker, costo y healthchecks. | Tercero habilitado para corpus piloto. |
| S4 | Administración interna, deprecación y migración de contrato. | Proveedores adicionales por capacidad. |

La regla de salida de S0 es que el núcleo documental pueda procesar un fixture completo aunque Mathpix y cualquier tercero estén desactivados.
