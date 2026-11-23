# ART-013 — Alcance separado de frontend y backend

> **Tipo:** matriz de responsabilidades y plan de entrega<br>
> **Identificador:** `SCOPE-FRONT-BACK-001`<br>
> **Estado:** propuesta de coordinación<br>
> **Fecha:** 2026-11-05

## 1. Regla de separación

El frontend debe poder demostrar el recorrido con fixtures, pero no debe convertirse en una implementación disfrazada del backend. El backend debe poder validar y persistir el mismo recorrido sin depender de cómo se dibuja la interfaz.

```text
Frontend: intención, vista, interacción y estado de conexión
Backend: autorización, estado durable, procesamiento, procedencia y políticas
Contrato compartido: OpenAPI, SSE, schemas canónicos y errores
```

## 2. Matriz de alcance

| Capacidad | Frontend | Backend/API | No mezclar |
| --- | --- | --- | --- |
| Captura | Selector, drag & drop, miniaturas, orden local, validación rápida. | Registro de página, checksum, carga firmada, límites y autorización. | El cliente no confirma que el objeto durable existe. |
| Visor | Zoom, pan, rotación visual, overlays, comparación y accesibilidad. | Metadatos, geometría normalizada, crops autorizados y URLs temporales. | El visor no conoce S3, Mathpix ni tablas internas. |
| Calidad | Explicar señales rápidas y acciones disponibles. | Decisión autoritativa, bloqueo, variantes, versión del diagnóstico. | Un score cliente no habilita OCR por sí solo. |
| Variantes | Selección visual y parámetros comprensibles. | Transformación, linaje, hash, almacenamiento y trabajo durable. | No sobrescribir el original. |
| Procesamiento | Estado, eventos, parcial, reintento/cancelación solicitados. | Plan, cola, worker, adapter, fallback, retry, costo y transición durable. | El porcentaje no es resultado. |
| Revisión | Bloques, edición, decisiones, filtros y drawers. | ETag, capas, decisiones, ambigüedad, historial y autorización. | Editar no muta OCR bruto. |
| Proveedores | Mostrar “procesamiento gestionado” y advertencias de fallback. | Registro, selección, secretos, rollout, health y auditoría. | No exponer un selector libre de proveedor en MVP. |
| Preview | Composición visual, navegación y opciones de plantilla. | Snapshot de versión, render durable y caché. | La preview no inventa contenido. |
| Exportación | Confirmación, progreso y descarga. | Job de exportación, PDF, URL firmada, retención y reintento. | No generar un PDF final desde texto no confirmado sin advertencia. |
| Eliminación | Confirmación, estado de purga y feedback. | Revocación inmediata, purga de activos, jobs, caches y auditoría. | Ocultar una tarjeta no equivale a eliminar datos. |

## 3. Frontend: entregables

### F0 — fundación visual

- Sistema de tokens para tamaño, color, foco, estado y tema.
- Shell con una acción primaria por contexto.
- Componentes `StatusBadge`, `AsyncState`, `Drawer`, `ConfirmDialog` y `Toast`.
- Estados completos: vacío, carga, parcial, error, conflicto, offline y guardado local.

### F1 — visor

- `ImageViewer` sin dependencia de proveedor.
- `ImageSource` compatible con fixture, `File`, `object URL` y signed URL.
- Overlay de polígonos normalizados y selección bidireccional.
- Gestos, teclado, fit/actual, rotación y comparación.
- Pruebas visuales y de interacción con imágenes grandes.

### F2 — revisión

- Layout centrado en bloque activo.
- Inspector técnico plegable.
- Edición con estado de sincronización real.
- Historial y procedencia como superficies secundarias.

### F3 — integración

- Cliente generado/validado contra OpenAPI.
- TanStack Query para snapshots, invalidación y reintentos.
- SSE con reconexión mediante `Last-Event-ID` y fallback a polling.
- Reconciliación de `ETag`/`If-Match`.

## 4. Backend: entregables

### B0 — procesamiento fake y contrato

- Entidades `processing_jobs`, `processing_steps`, `processor_events`.
- Outbox y transiciones idempotentes.
- Fake adapter con fixtures.
- Resultado normalizado y publicación parcial.

### B1 — activos y calidad

- S3/MinIO, URLs firmadas, checksum, crops y linaje.
- Calidad autoritativa y variantes no destructivas.
- Bloqueo antes de llamadas facturables.

### B2 — adapter y router

- Puerto `ProcessorAdapter`.
- Registro de perfiles/capacidades/proveedores.
- Mathpix detrás de adapter.
- Reintentos, fallback permitido, circuit breaker y `provider_attempts`.

### B3 — revisión y composición

- Bloques, capas humanas, ETag, decisiones, versiones.
- Preview/PDF desde versión canónica.
- Purga y retención.

## 5. Contratos compartidos

Los siguientes schemas son responsabilidad conjunta y deben probarse en CI:

- `Asset`, `SignedUrl`, `Geometry`, `ImageSource`;
- `QualityAssessment`, `Variant`;
- `Job`, `JobStep`, `JobEvent`, `PartialResultsResponse`;
- `Block`, `ReviewState`, `BlockDecision`, `Version`;
- `Problem` y catálogo de códigos de error;
- `processor_profile`, `output_contract` y política de fallback resumida.

El contrato público no incluye credenciales, SDKs, payloads de proveedores ni URLs de objetos permanentes.

## 6. Orden de trabajo recomendado

1. **Ahora:** cerrar el contraste visual y extraer el visor usando fixtures.
2. **Después:** implementar B0 con fake adapter y OpenAPI, sin proveedor real.
3. **Luego:** conectar la carga directa y calidad autoritativa.
4. **Después:** habilitar Mathpix mediante el puerto común y pruebas de contrato.
5. **Finalmente:** integrar SSE, revisión durable, preview y exportación.

No conviene conectar Mathpix antes de que exista el contrato normalizado: eso convertiría el proveedor inicial en el modelo de dominio y haría costoso aceptar terceros.

## 7. Criterios de aceptación de la separación

- El frontend ejecuta todo el flujo con `FakeProcessingAdapter` sin cambiar componentes de revisión.
- El backend puede sustituir Mathpix por otro adapter sin cambiar `Block`, `JobEvent` ni la UI.
- Un tercero nuevo puede incorporarse mediante descriptor, adapter, fixtures y rollout; no requiere modificar documentos históricos.
- El visor puede abrir un fixture, un `File` local o una URL firmada con la misma API de componente.
- Las pruebas no necesitan credenciales reales por defecto.
- La documentación pública y la interna no se mezclan en el mismo contrato.
