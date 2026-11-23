# ART-010 — Contrato API y documentación Scalar del MVP-0

> **Tipo:** contrato técnico de API y schemas<br>
> **Identificador:** `API-CONTRACT-001`<br>
> **Estado:** propuesta implementable; pendiente de backend FastAPI y decisiones de despliegue<br>
> **Fecha:** 2026-11-05<br>
> **Contrato canónico:** [`docs/api/openapi.yaml`](../api/openapi.yaml)<br>
> **Documentación interactiva:** [`docs/api/index.html`](../api/index.html)

## 1. Propósito

Definir una superficie API mínima, versionada y consumible por Scalar para implementar los slices S0–S5 del MVP-0 sin acoplar el frontend a PostgreSQL, Redis, S3/MinIO o Mathpix.

El contrato OpenAPI contiene:

- operaciones HTTP por caso de uso;
- schemas de documentos, páginas, activos, calidad, trabajos, eventos, bloques, versiones, preview y exportación;
- envelope de errores;
- parámetros de autorización, correlación, idempotencia y concurrencia;
- estados y códigos HTTP;
- ejemplos para el recorrido de imagen a PDF.

## 2. Cómo visualizarlo

```bash
python3 -m http.server 9000 --directory docs/api
```

Abrir [http://localhost:9000](http://localhost:9000). La página carga Scalar desde CDN y consume `openapi.yaml`. En la imagen Docker de producción queda publicada en `/api-docs/`.

También se puede importar directamente el YAML en la documentación OpenAPI de FastAPI, Insomnia, Postman o Redocly.

## 3. Separación de contratos

| Contrato | Ubicación | Consumidor | Regla |
| --- | --- | --- | --- |
| API pública | [`openapi.yaml`](../api/openapi.yaml) | Aplicación React y clientes autorizados | Nunca expone credenciales ni detalles internos del proveedor. |
| Catálogo de rutas | [ART-009](./09-catalogo-endpoints-mvp-0.md) | Producto, frontend y backend | Explica intención, estados, errores y orden de implementación. |
| Adaptador Mathpix | [`mathpix-adapter-contract.md`](../api/mathpix-adapter-contract.md) | Worker OCR | Recibe un paso durable, llama al proveedor y devuelve salida normalizada. |
| Procesamiento multi-proveedor | [`processing-provider-contract.md`](../api/processing-provider-contract.md) | Orquestador y adapters | Define capacidades, fallback, errores, rollout y normalización sin acoplar el dominio a un tercero. |
| Modelo canónico | [Arquitectura, sección 10](../08-arquitectura-y-tecnologias.md) | Normalizador, revisión y composición | No depende de Mathpix Markdown, Tiptap ni del exportador. |

## 4. Frontera con Mathpix

El frontend llama únicamente a AlgeTra. El worker de la cola `ocr-interactive` es el único componente que puede utilizar `MATHPIX_APP_ID` y `MATHPIX_APP_KEY`.

```text
React → FastAPI → PostgreSQL + outbox → Celery/Redis
                                      → worker OCR
                                      → Mathpix /v3/text
                                      → respuesta bruta en S3/MinIO
                                      → normalizador canónico
                                      → bloques + evento durable
                                      → SSE/polling → React
```

La integración se basa en `POST https://api.mathpix.com/v3/text` con opciones de layout, `line_data`, `lines_json` y formatos `text`/`data`. La respuesta conserva `request_id`, `version`, confianza, dimensiones y regiones; `cnt` se transforma de píxeles a geometría normalizada. Una región no convertible se conserva como `figure` o `unknown`.

La especificación común de entrada, salida, reintentos, privacidad y pruebas se encuentra en [`processing-provider-contract.md`](../api/processing-provider-contract.md). La traducción específica de Mathpix se encuentra en [`mathpix-adapter-contract.md`](../api/mathpix-adapter-contract.md).

## 5. Garantías que debe cumplir el backend

1. La autenticación procede de OIDC gestionado; no se implementan contraseñas propias.
2. El alcance se deriva del principal autenticado; el cliente no puede elegir propietario.
3. El original es inmutable y las variantes, crops, OCR bruto, ediciones y PDF son activos/capas distintas.
4. `POST /v1/documents/{documentId}/jobs` responde `202` antes de finalizar OCR.
5. Una captura `critical` no puede iniciar una llamada facturable.
6. Un trabajo tiene snapshot durable en PostgreSQL y eventos reanudables; Redis no es fuente de verdad.
7. `Last-Event-ID` y polling recuperan el estado después de una desconexión.
8. Las ediciones usan `ETag`/`If-Match` y crean una capa o versión, nunca reescriben la transcripción bruta.
9. El PDF solo se genera desde una versión canónica y una plantilla identificadas.
10. Las URLs firmadas limitan activo, operación, alcance y tiempo de expiración.
11. Los errores contienen `code`, `retryable` y `request_id`, pero no secretos ni contenido innecesario.
12. Las acciones con efectos externos aceptan `Idempotency-Key` y no duplican bloques, versiones, exportaciones ni cargos evitables.
13. La creación de un trabajo solicita un `processor_profile` lógico; la selección de terceros, fallback, circuit breaker y costo pertenecen al worker/orquestador.
14. Un proveedor nuevo debe cumplir el contrato interno normalizado y pasar fixtures antes de entrar en `shadow`, `canary` o `default`.

## 6. Orden de implementación

| Slice | Contrato que se implementa | Pruebas mínimas |
| --- | --- | --- |
| S0 | Schemas, errors, `GET /v1/me`, snapshot de job, fake Mathpix | Validación OpenAPI, fixtures y contrato del adaptador. |
| S1 | Documentos, páginas, carga directa y URLs firmadas | Aislamiento horizontal, MIME, tamaño, checksum y orden. |
| S2 | Calidad y variantes | Bloqueo crítico antes de OCR, linaje y no sobrescritura. |
| S3 | Jobs, pasos, SSE y polling | Desconexión, `Last-Event-ID`, reintento e idempotencia. |
| S4 | Bloques, ambigüedad, decisiones y versiones | Conflicto `If-Match`, capas separadas y procedencia. |
| S5 | Preview, exportación y purga | PDF trazable, advertencias, URLs temporales y eliminación. |

La extensión multi-proveedor se implementa transversalmente: fake adapter en S0, Mathpix detrás del puerto en S1, router/fallback en S2 y rollout de terceros en S3. El detalle está en [ART-012](./12-arquitectura-api-procesamiento-extensible.md).

## 7. Estado y decisiones pendientes

Este contrato no afirma que la API ya exista. Antes de habilitar evaluadores deben definirse:

- proveedor OIDC y claims de aislamiento;
- prefijo final del gateway (`/v1` frente a `/api/v1`);
- límites de carga, variantes, reintentos y presupuesto Mathpix;
- retención de respuestas brutas, eventos, previews y exportaciones;
- habilitación real de Mathpix y corpus autorizado;
- entrada de LanguageTool y SymPy en MVP-0;
- publicación del schema OpenAPI desde FastAPI y pruebas de contrato en CI.

La especificación puede evolucionar con cambios compatibles dentro de `v1`. Un cambio incompatible requiere una nueva versión o un ADR explícito.
