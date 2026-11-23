# Contrato interno del adaptador Mathpix

> **Tipo:** contrato de integración de proveedor<br>
> **Estado:** propuesta para MVP-0; no es una API pública<br>
> **Proveedor inicial:** Mathpix OCR `POST https://api.mathpix.com/v3/text`

Este documento implementa el contrato genérico [`processing-provider-contract.md`](./processing-provider-contract.md). Mathpix es un adapter de `ocr-stem-v1`, no el modelo de dominio ni el nombre que debe enviar el frontend.

## 1. Regla de frontera

El navegador nunca llama a Mathpix. El flujo es:

```text
API AlgeTra
  → trabajo durable en PostgreSQL + outbox
  → cola ocr-interactive
  → worker OCR
  → adaptador Mathpix
  → respuesta bruta en S3/MinIO
  → normalizador canónico
  → bloques, procedencia y evento persistidos
  → SSE/polling hacia el navegador
```

El adaptador es reemplazable. El modelo canónico de AlgeTra no puede importar tipos de Mathpix Markdown ni hacer que `request_id`, `text` o `line_data` sean la identidad de un bloque.

## 2. Entrada del worker

El worker reclama un paso idempotente y construye esta entrada interna:

```json
{
  "job_id": "job_01J...",
  "step_id": "step_01J...",
  "attempt": 1,
  "document_id": "doc_01J...",
  "page_id": "page_01J...",
  "asset_id": "asset_01J...",
  "variant_id": "variant_01J...",
  "source": {
    "object_key": "private/workspace/doc/page/variant.png",
    "content_type": "image/png",
    "byte_size": 1843200,
    "sha256": "digest",
    "width": 1600,
    "height": 2200
  },
  "options": {
    "enable_document_layout": true,
    "include_line_data": true,
    "include_lines_json": true,
    "include_page_info": false,
    "formats": ["text", "data"],
    "data_options": {"include_latex": true},
    "rm_spaces": true,
    "auto_rotate_confidence_threshold": 0.65
  },
  "schema_version": "1.0"
}
```

El worker obtiene el objeto por una identidad interna o por una URL firmada de corta duración. No guarda una URL de proveedor en PostgreSQL como si fuera el origen permanente.

## 3. Solicitud a Mathpix

Para una página individual de imagen se usa `POST /v3/text`. Las credenciales se inyectan únicamente en el proceso worker:

```http
POST https://api.mathpix.com/v3/text
app_id: ${MATHPIX_APP_ID}
app_key: ${MATHPIX_APP_KEY}
Content-Type: application/json
```

Solicitud recomendada cuando el worker puede entregar una URL temporal de objeto:

```json
{
  "src": "https://signed-object-url.example.invalid/…",
  "formats": ["text", "data"],
  "data_options": {"include_latex": true},
  "enable_document_layout": true,
  "include_line_data": true,
  "include_lines_json": true,
  "include_page_info": false,
  "rm_spaces": true,
  "auto_rotate_confidence_threshold": 0.65,
  "metadata": {
    "improve_mathpix": false
  }
}
```

Si se usa multipart, las opciones se envían como JSON serializado en el campo `options_json`. El archivo se envía desde el worker; nunca desde el cliente ni desde el endpoint público de AlgeTra.

La configuración debe conservar:

- `text` para Mathpix Markdown y contenido mixto;
- `data` con LaTeX cuando se solicite;
- `include_line_data` para geometría y clasificación por región;
- `enable_document_layout` para páginas completas, listas y estructura;
- `include_lines_json` cuando se necesite una representación de regiones más fácil de normalizar;
- `include_page_info: false` salvo que una decisión de producto requiera conservar esos elementos.

La API de Mathpix devuelve estimaciones como `confidence`, `confidence_rate`, `is_handwritten`, `version`, `request_id`, `image_width`, `image_height` y, cuando se solicita, `line_data`. Son señales de proveedor, no afirmaciones de corrección.

Referencia externa consultada: [Mathpix — Process Images](https://docs.mathpix.com/reference/post-v3-text).

## 4. Salida interna normalizada del adaptador

El adaptador no devuelve directamente `Block` del dominio. Devuelve un resultado de proveedor estable para que el normalizador pueda decidir cómo representar cada región:

```json
{
  "provider": "mathpix",
  "provider_request_id": "14b53567-9f6c-4895-ab3d-e4a8ae18f9c1",
  "provider_version": "SuperNet-200",
  "status": "succeeded",
  "received_at": "2026-11-05T18:30:00Z",
  "source": {
    "asset_id": "asset_01J...",
    "variant_id": "variant_01J...",
    "width": 1600,
    "height": 2200
  },
  "document_output": {
    "text": "Resuelve \\( 3x + 5 = 20 \\)",
    "data": [{"type": "latex", "value": "3x+5=20"}]
  },
  "regions": [
    {
      "provider_region_id": "line-1",
      "provider_type": "math",
      "contour_px": [[120, 640], [840, 640], [840, 770], [120, 770]],
      "text": "\\(3x + 5 = 20\\)",
      "latex": "3x + 5 = 20",
      "confidence": 0.72,
      "confidence_rate": 0.81,
      "conversion_output": true,
      "error_id": null
    }
  ],
  "warnings": [],
  "usage": {"images": 1, "provider_units": 1}
}
```

Errores del proveedor también se normalizan:

```json
{
  "provider": "mathpix",
  "provider_request_id": "request-if-present",
  "status": "failed",
  "error": {
    "code": "provider_timeout",
    "message": "Mathpix no respondió dentro del límite configurado.",
    "retryable": true,
    "http_status": 504
  },
  "usage": {"images": 0, "provider_units": 0}
}
```

La respuesta completa, incluyendo campos no normalizados, se guarda como artefacto bruto con retención definida. No se incluye en logs ni se devuelve al frontend por defecto.

## 5. Mapeo al modelo canónico

| Señal Mathpix | Transformación de AlgeTra | Regla |
| --- | --- | --- |
| `line_data[].type: text` | `paragraph` o `heading` después de clasificación | Conservar `text`, geometría, confianza y `provider_region_id`. |
| `line_data[].type: math` o `word_data[].type: math` | `equation` | Conservar LaTeX y Mathpix Markdown como transcripción; la edición vive en otra capa. |
| `type: table` | `figure` o estructura de tabla cuando el benchmark lo permita | Nunca eliminar una tabla por no poder reconstruirla. |
| `type: diagram`, `chart`, `figure_label` | `figure` o `unknown` | `/v3/text` no entrega automáticamente un recorte de figura; conservar la región de la página. |
| `conversion_output: false` o `error_id` | `unknown`/`figure` con advertencia | No publicar como texto confirmado. |
| `cnt` | Polígono `normalized-page` | Dividir `x / image_width` y `y / image_height`; registrar transformación y dimensiones. |
| `confidence`, `confidence_rate` | Señales separadas en `review.confidence` | No convertir a `confirmed` automáticamente. |
| `request_id`, `version` | Procedencia de proveedor | No son identidad de bloque ni versión del documento. |

Una región sin conversión no desaparece. Si la API de proveedor no entrega el crop, AlgeTra puede crear su propio recorte a partir de la variante y la geometría, manteniendo `source.asset_id` y `source.variant_id`.

## 6. Timeouts, reintentos y costo

- El timeout del adaptador es configurable por cola; no debe mantener abierta la petición HTTP del usuario.
- Un timeout, `429` o error 5xx del proveedor puede reintentarse con backoff y límite de intentos.
- Un `400`/`422` de contenido no se reintenta automáticamente; se conserva como fallo accionable.
- La clave de deduplicación interna es `document_id + page_id + variant_id + profile + adapter_id + options_hash + schema_version`.
- Antes de una nueva llamada se consulta si existe un `provider_result` exitoso para esa clave.
- El costo se registra como estimación por unidad facturable/intento, separado del contenido y del proveedor.
- Un reintento no debe duplicar bloques, versiones ni cargos evitables.
- Si Mathpix está deshabilitado o no hay presupuesto, el adaptador no realiza llamadas y el trabajo termina con un estado explícito de configuración.

## 7. Privacidad y secretos

- `MATHPIX_APP_ID` y `MATHPIX_APP_KEY` viven en el gestor de secretos del worker.
- Las credenciales no aparecen en frontend, OpenAPI público, trazas, excepciones ni logs.
- El worker envía únicamente el objeto/variante autorizado para el paso.
- La política de Mathpix y su retención deben documentarse antes de invitar evaluadores.
- `metadata.improve_mathpix` permanece desactivado salvo consentimiento separado y auditable.
- La purga del documento debe incluir respuesta bruta, variantes, crops, caches y referencias a proveedor según la política acordada.

## 8. Pruebas de contrato del adaptador

El adaptador debe probarse sin llamadas externas por defecto:

1. fixture exitoso de texto manuscrito en español;
2. fixture mixto con ecuación y `line_data`;
3. región `diagram` con `conversion_output: false`;
4. respuesta con baja confianza;
5. `429`, timeout, 5xx y error de credenciales;
6. respuesta incompleta sin `text`;
7. reintento con deduplicación;
8. transformación de `cnt` pixel a polígono normalizado;
9. preservación del original y del resultado bruto;
10. ausencia de secretos y contenido en telemetría.

La prueba con credenciales reales debe estar desactivada por defecto y habilitarse mediante configuración explícita, límite de presupuesto y corpus autorizado.
