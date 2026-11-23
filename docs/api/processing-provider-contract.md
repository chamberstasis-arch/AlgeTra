# Contrato interno de procesamiento multi-proveedor

> **Tipo:** contrato entre el orquestador y adaptadores de terceros<br>
> **Estado:** propuesta implementable<br>
> **Visibilidad:** interna; no se expone al navegador

## 1. Objetivo

Definir el puerto que deben cumplir Mathpix y futuros proveedores OCR, layout, revisión lingüística o validación matemática. El contrato evita que una respuesta de un proveedor se convierta directamente en el modelo canónico.

```text
ProcessingStep → ProviderAdapter → RawProviderArtifact
                              → NormalizedProviderResult
                              → CanonicalNormalizer → Domain blocks
```

## 2. Entrada común

```json
{
  "contract": "provider-input-v1",
  "job_id": "job_01JALGETRA01",
  "step_id": "step_01JALGETRA01",
  "attempt": 1,
  "profile": "ocr-stem-v1",
  "document_id": "doc_01JALGETRA01",
  "page_id": "page_01JALGETRA01",
  "asset": {
    "asset_id": "asset_01JALGETRA01",
    "variant_id": "variant_01JALGETRA01",
    "object_key": "private/workspace/page/variant.png",
    "content_type": "image/png",
    "sha256": "digest",
    "width": 1600,
    "height": 2200
  },
  "requirements": {
    "locale": "es",
    "capabilities": ["handwriting", "math", "line_geometry"],
    "formats": ["plain_text", "latex"],
    "preserve_visual_regions": true
  },
  "privacy": {
    "allow_external_processing": true,
    "region": "managed-default",
    "retention": "provider-policy-v1"
  },
  "schema_version": "1.0"
}
```

El objeto se entrega por referencia interna o URL firmada de corta duración. El adaptador no puede cambiar `document_id`, `page_id`, `asset_id` ni el alcance de autorización.

## 3. Descriptor de adaptador

```json
{
  "provider_id": "mathpix-prod",
  "adapter_id": "mathpix",
  "adapter_version": "1.0.0",
  "profiles": ["ocr-stem-v1"],
  "capabilities": ["handwriting", "math", "layout", "line_geometry", "confidence"],
  "locales": ["es", "en"],
  "input_limits": {
    "json_body_bytes": 5242880,
    "multipart_body_bytes": 5242880,
    "base64_image_bytes": 2097152,
    "image_url_bytes": 10485760,
    "image_url_timeout_ms": 15000
  },
  "timeout_ms": 45000,
  "supports_cancellation": false,
  "data_policy": "external-processing-approved",
  "cost": {"unit": "image", "class": "metered"}
}
```

Los descriptors se validan en backend y se almacenan con la versión de rollout. El frontend solo puede recibir capacidades resumidas y advertencias que sean útiles para la tarea.

## 4. Salida normalizada

```json
{
  "contract": "normalized-provider-result-v1",
  "provider_id": "mathpix-prod",
  "adapter_version": "1.0.0",
  "provider_request_id": "request_123",
  "provider_model": "SuperNet-200",
  "status": "succeeded",
  "source": {
    "asset_id": "asset_01JALGETRA01",
    "variant_id": "variant_01JALGETRA01",
    "width": 1600,
    "height": 2200
  },
  "regions": [
    {
      "provider_region_id": "region-1",
      "type": "equation",
      "text": "3x + 5 = 20",
      "representations": [
        {"format": "plain_text", "value": "3x + 5 = 20"},
        {"format": "latex", "value": "3x+5=20"}
      ],
      "polygon_px": [[120, 640], [840, 640], [840, 770], [120, 770]],
      "confidence": 0.72,
      "conversion": "converted",
      "warnings": []
    }
  ],
  "warnings": [],
  "usage": {"provider_units": 1, "estimated_cost": 0.002, "currency": "USD"}
}
```

Reglas:

- La geometría del proveedor se conserva en píxeles dentro del resultado bruto y se normaliza en el paso común.
- `type` es una categoría normalizada (`text`, `heading`, `equation`, `table`, `figure`, `unknown`), no un enum de Mathpix.
- `conversion: failed` o `preserved_visual` nunca se publica como texto confirmado.
- La confianza es una señal; no cambia por sí sola `review_status`.
- Una región que no puede convertirse debe permanecer disponible para revisión visual.

## 5. Error normalizado

```json
{
  "contract": "provider-error-v1",
  "provider_id": "mathpix-prod",
  "provider_request_id": "request_123",
  "category": "rate_limited",
  "code": "provider_rate_limited",
  "message": "El proveedor solicitó reintentar más tarde.",
  "retryable": true,
  "http_status": 429,
  "retry_after_seconds": 12,
  "safe_for_fallback": true
}
```

Categorías mínimas:

| Categoría | Reintento | Fallback |
| --- | --- | --- |
| `invalid_input` | No | Solo si otro adapter acepta otro formato y la política lo permite. |
| `auth` | No automático | No; bloquear y alertar operación. |
| `rate_limited` | Sí con backoff | Sí si hay capacidad equivalente. |
| `timeout` | Sí limitado | Sí si no se agotó presupuesto. |
| `unavailable` | Sí limitado | Sí con circuit breaker. |
| `provider_bug` | No inmediato | Sí, registrar incidente. |
| `policy_blocked` | No | No hasta cambiar consentimiento/política. |

## 6. Semántica de reintentos

La clave de deduplicación se calcula con:

```text
scope + asset_sha256 + variant_id + profile + requirements_hash
       + adapter_id + adapter_version + schema_version
```

Un nuevo proveedor o versión de adapter produce un `provider_attempt` nuevo, pero el mismo `processing_step`. El orquestador solo publica una salida canónica activa por paso; los intentos anteriores quedan auditables.

## 7. Pruebas de conformidad para terceros

Todo adapter debe pasar un conjunto común de fixtures:

1. texto manuscrito en español;
2. ecuación con LaTeX;
3. página mixta con figura;
4. baja confianza;
5. geometría fuera de límites;
6. respuesta incompleta;
7. timeout, 429, 5xx y credenciales inválidas;
8. repetición con la misma clave;
9. cancelación o declaración explícita de que no la soporta;
10. ausencia de secretos y contenido en logs.

Las pruebas con credenciales reales están desactivadas por defecto. El adapter se puede habilitar primero en `shadow`, después en `canary` y finalmente en `default`.

## 8. Contrato con Mathpix

[`mathpix-adapter-contract.md`](./mathpix-adapter-contract.md) documenta cómo se traduce este contrato común a `POST /v3/text`, incluyendo `line_data`, LaTeX, respuesta bruta, privacidad y límites específicos. Si Mathpix cambia su API, solo ese adapter y sus fixtures deben cambiar; el perfil `ocr-stem-v1` y el modelo canónico no.
