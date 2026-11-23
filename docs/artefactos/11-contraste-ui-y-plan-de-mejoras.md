# ART-011 — Contraste de la UI y plan de mejora del frontend

> **Tipo:** revisión de producto, arquitectura de interacción y alcance frontend<br>
> **Identificador:** `UI-CONTRAST-001`<br>
> **Estado:** diagnóstico accionable; no sustituye pruebas de usabilidad<br>
> **Fecha:** 2026-11-05<br>
> **Superficie revisada:** [`src/PrototypeApp.tsx`](../../src/PrototypeApp.tsx), [`src/styles.css`](../../src/styles.css)

## 1. Propósito

Registrar qué funciona en el prototipo actual, qué está saturando la experiencia y cuál debe ser el siguiente diseño de interacción antes de conectar la API real.

La conclusión principal es que el frontend ya expresa el recorrido completo, pero todavía mezcla **demasiadas decisiones del sistema en una sola vista**. La próxima iteración debe reducir carga cognitiva sin esconder las garantías importantes de privacidad, procedencia y revisión humana.

Este documento separa:

- mejoras de presentación y navegación que pertenecen al frontend;
- contratos que el frontend necesita consumir del backend;
- responsabilidades que no deben resolverse con estado local cuando exista la API.

## 2. Diagnóstico de contraste

| Área | Situación actual del prototipo | Riesgo | Dirección objetivo | Prioridad |
| --- | --- | --- | --- | --- |
| Inicio | Dashboard con estadísticas, documento destacado, listado, guía y muchas acciones simultáneas. | La acción principal compite con información secundaria. | Una acción primaria visible: continuar o crear documento. Estadísticas y ayuda pasan a segundo nivel. | P0 |
| Navegación | La barra lateral expone documentos, actividad, archivados, métricas, guía y ajustes al mismo nivel. | El usuario puede interpretar módulos de validación como tareas obligatorias. | Agrupar en `Trabajo`, `Revisión` y `Cuenta`; mostrar validación avanzada bajo demanda. | P0 |
| Captura | Carga, fixture, título, reordenamiento, calidad y modo manual aparecen en la misma pantalla. | Exceso de decisiones antes de tener una imagen. | Progresión de tres pasos: añadir páginas → confirmar orden → evaluar calidad. | P0 |
| Calidad | Expone señales, variantes y políticas internas en una vista densa. | El lenguaje técnico puede bloquear a una persona no experta. | Resumen `Lista / Revisa / Recaptura`, con detalles técnicos en un panel expandible. | P0 |
| Procesamiento | La línea de eventos y los pasos son claros, pero el usuario puede recibir demasiado detalle operativo. | Se confunde infraestructura con progreso útil. | Mostrar estado por página y el último evento; dejar el log completo en “Detalles”. | P1 |
| Revisión | Es la vista más valiosa y también la más saturada: rail, origen, bloques, editor, inspector y procedencia. | Poco espacio para el contenido; difícil priorizar la ambigüedad. | Priorizar `origen + bloque actual + decisión`; inspector contextual plegable. | P0 |
| Edición | El editor aparece junto con todos los metadatos de procedencia. | La edición compite con la explicación técnica. | Mantener una barra de edición corta y abrir procedencia/raw result en drawer o modal. | P0 |
| Preview | Incluye composición, configuración, advertencias, privacidad y exportación a la vez. | La salida se percibe como formulario, no como documento. | Preview dominante; configuración en panel lateral plegable en desktop y sheet en móvil. | P1 |
| Tamaños | El prototipo anterior usaba textos de 8–11 px en varias superficies; la nueva capa los aumenta, pero aún hay estilos heredados. | Legibilidad y accesibilidad inconsistentes. | Base mínima 12 px para metadatos, 14 px para texto de tarea y controles de 40–44 px. | P0 |
| Tema oscuro | Existe como preferencia local. | Contraste de estados y superficies puede variar entre componentes heredados. | Tokens semánticos únicos, contraste AA y revisión específica de imágenes/overlays. | P1 |
| Feedback | Toasts y badges comunican acciones locales. | No distinguen siempre `guardado local`, `persistiendo`, `guardado durable` y `conflicto`. | Estado de sincronización explícito en la barra de contexto, sin fingir persistencia. | P0 |
| Responsive | Hay breakpoints y adaptación de columnas. | La revisión todavía puede volverse una columna demasiado larga. | En móvil usar navegación por pestañas: `Origen`, `Bloques`, `Decisión`, `Procedencia`. | P1 |

## 3. Principios de la siguiente iteración

### 3.1. Una tarea primaria por pantalla

Cada estado debe tener una sola pregunta principal:

1. **Captura:** “¿Qué páginas quiero procesar?”
2. **Calidad:** “¿Qué insumo es seguro para procesar?”
3. **Procesamiento:** “¿Qué resultado está disponible ahora?”
4. **Revisión:** “¿Qué decisión debo tomar en este bloque?”
5. **Entrega:** “¿Qué versión quiero exportar?”

Las métricas, contratos, nombres de proveedor y detalles de infraestructura no deben competir con esa pregunta.

### 3.2. Divulgación progresiva

- Nivel 1: estado comprensible y acción siguiente.
- Nivel 2: explicación de la decisión y advertencias.
- Nivel 3: procedencia, respuesta bruta, identificadores, intentos y costos.

El nivel 3 debe estar disponible para una evaluación, pero no ocupar permanentemente el espacio de lectura.

### 3.3. No confundir estado local con estado del sistema

El frontend debe usar etiquetas distintas:

| Estado | Significado |
| --- | --- |
| `local` | Cambio todavía en memoria o en IndexedDB del navegador. |
| `enviando` | La API recibió una mutación y aún no confirmó persistencia. |
| `guardado` | El backend confirmó la versión o decisión. |
| `parcial` | El trabajo publicó solo una parte durable. |
| `conflicto` | El recurso cambió y requiere reconciliación. |

La UI nunca debe mostrar “guardado” solo porque un `setState` terminó.

## 4. Visor de imágenes: sub-sistema frontend independiente

El visor no debe ser un conjunto de estilos dentro de la pantalla de revisión. Debe ser un componente reutilizable que pueda vivir en captura, calidad, revisión, procedencia y preview.

### 4.1. Contrato propuesto

```ts
type ImageViewerSource = {
  id: string
  kind: 'local-file' | 'object-url' | 'signed-url' | 'fixture'
  url: string
  width?: number
  height?: number
  expiresAt?: string
}

type ImageViewerOverlay = {
  id: string
  label?: string
  polygon: Array<[number, number]> // coordenadas normalizadas 0..1
  tone: 'selected' | 'warning' | 'confirmed' | 'visual'
  interactive?: boolean
}

type ImageViewerProps = {
  source: ImageViewerSource
  overlays?: ImageViewerOverlay[]
  mode?: 'fit' | 'actual' | 'compare'
  initialZoom?: number
  allowRotate?: boolean
  allowCrop?: boolean
  onOverlaySelect?: (overlayId: string) => void
  onSourceError?: (reason: 'expired' | 'not-found' | 'decode-error') => void
}
```

La API real entregará metadatos y una URL temporal; el visor no conocerá Mathpix, S3, MinIO ni el proveedor que originó la geometría.

### 4.2. Comportamiento mínimo

- `fit width`, `fit page` y `100%`.
- Zoom con rueda/pinch, botones y teclado `+`, `-`, `0`.
- Pan con pointer capture sin seleccionar texto accidentalmente.
- Rotación `0/90/180/270` como transformación de vista, sin sobrescribir el original.
- Navegación anterior/siguiente y contador de página.
- Overlays SVG o canvas sobre coordenadas normalizadas.
- Selección de bloque desde el overlay y selección de overlay desde la lista.
- Modo comparar: original a la izquierda y variante/resultado a la derecha en desktop; pestañas en móvil.
- Estado de carga, expiración de URL, error de decodificación y ausencia de crop.
- Acción “ver original” que siempre vuelve al activo inmutable.
- Restablecer vista sin perder el bloque seleccionado.

### 4.3. Fluidez y rendimiento

1. No usar base64 para activos grandes salvo la previsualización inmediata de una captura local.
2. Liberar `URL.createObjectURL` al desmontar o reemplazar una imagen.
3. Decodificar con `HTMLImageElement.decode()` y mostrar un placeholder estable.
4. Mantener overlays fuera del bitmap para que cambiar selección no vuelva a decodificar la imagen.
5. Virtualizar el rail de páginas cuando el límite deje de ser tres.
6. No descargar el original completo para un crop si existe un activo derivado autorizado.
7. Cancelar una carga anterior con `AbortController` al cambiar de página o URL firmada.
8. Guardar solo preferencias de vista —zoom, modo, rotación—, nunca contenido manuscrito en `localStorage` sin política explícita.

### 4.4. Criterios de aceptación del visor

- Cambiar entre tres páginas no produce salto de layout ni pierde el foco.
- Hacer zoom y arrastrar funciona con mouse, touchpad y touch.
- Un overlay permanece alineado después de zoom, rotación y cambio de tamaño.
- Una URL firmada expirada muestra una acción de renovación, no una pantalla rota.
- En móvil el visor mantiene la imagen legible sin obligar a ver simultáneamente todos los paneles.
- Un lector de pantalla recibe nombre de página, zoom actual, bloque seleccionado y estado del recurso.

## 5. Alcance frontend

### P0 — antes de conectar la API

- Extraer `ImageViewer` y `ImageOverlayLayer` como componentes independientes.
- Reducir navegación y eliminar acciones redundantes de la pantalla principal.
- Rediseñar revisión alrededor de una ambigüedad activa.
- Unificar tokens de tamaño, color, foco, estado y tema oscuro.
- Separar drawers/modales de raw result, procedencia e historial.
- Mantener el fixture local como fuente para pruebas visuales y de interacción.

### P1 — con contrato API disponible

- Adaptar el visor a `Asset`, `SignedUrl`, `Geometry` y `BlockSourceResponse`.
- Consumir SSE/polling con estados de conexión visibles.
- Reconciliar ediciones locales con `ETag`/`If-Match`.
- Cargar solo previews/crops necesarios y renovar URLs temporales.
- Añadir pruebas Playwright para captura, revisión, conflicto, URL expirada y exportación.

## 6. No pertenece al frontend

El navegador no debe decidir de manera autoritativa:

- si la calidad bloquea un trabajo;
- qué proveedor se usa o cuándo se hace fallback;
- cuánto cuesta un intento;
- si un callback externo es válido;
- el estado durable de un trabajo;
- la autorización de un activo o documento.

La UI puede predecir, explicar y solicitar; el backend debe validar, persistir y publicar el resultado real. La arquitectura backend correspondiente está en [ART-012](./12-arquitectura-api-procesamiento-extensible.md).

## 7. Definition of Done visual

Una pantalla no se considera lista si:

1. tiene más de una acción primaria sin jerarquía clara;
2. necesita texto técnico para explicar un estado básico;
3. muestra un identificador de proveedor como parte del flujo principal;
4. pierde contexto al cambiar de página, zoom o tema;
5. afirma persistencia durable sin respuesta del backend;
6. no puede recorrerse con teclado y foco visible;
7. no tiene estado vacío, carga, error, parcial y conflicto.
