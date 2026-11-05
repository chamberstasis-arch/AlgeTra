# ART-002 — Requisitos funcionales en formato EARS

> **Tipo:** requisitos funcionales del prototipo  
> **Versión:** 1.0  
> **Estado:** propuesta implementable en `develop`  
> **Fecha:** 2026-11-05  
> **Fuente global:** [ERS](../03-ers-especificacion-de-requisitos.md)

## 1. Propósito y alcance

Este artefacto expresa en formato EARS los requisitos funcionales necesarios para los prototipos A y B descritos en el [resumen de visión y prototipo](../12-resumen-vision-y-prototipo.md).

No intenta convertir todas las capacidades futuras de AlgeTra en una primera implementación. Las disciplinas y funciones avanzadas conservarán un contrato extensible, pero se validarán posteriormente.

## 2. Convenciones EARS utilizadas

| Patrón | Forma | Uso |
| --- | --- | --- |
| **Ubiquitous** | El sistema deberá `<respuesta>` | Comportamiento siempre aplicable. |
| **Event-driven** | Cuando `<evento>`, el sistema deberá `<respuesta>` | Respuesta a una acción o evento. |
| **State-driven** | Mientras `<estado>`, el sistema deberá `<respuesta>` | Comportamiento durante un estado. |
| **Unwanted behavior** | Si `<condición no deseada>`, el sistema deberá `<respuesta>` | Fallos, riesgos o excepciones. |
| **Optional feature** | Cuando `<función esté habilitada>`, el sistema deberá `<respuesta>` | Capacidades configurables o futuras. |

Cada requisito se formula con una sola obligación verificable principal. Los detalles de aceptación se mantienen separados para evitar requisitos ambiguos.

## 3. Requisitos del prototipo A — prueba técnica

| ID | Patrón | Requisito EARS | Prioridad | Traza |
| --- | --- | --- | --- | --- |
| EARS-F-001 | Event-driven | **Cuando** el usuario seleccione una imagen compatible, el sistema deberá crear una vista previa local sin esperar al backend. | P0 | RF-012 |
| EARS-F-002 | Event-driven | **Cuando** una imagen seleccionada exceda el formato o límite permitido, el sistema deberá rechazarla antes de invocar OCR y explicar la corrección necesaria. | P0 | RF-010, RF-076 |
| EARS-F-003 | Event-driven | **Cuando** la evaluación de calidad clasifique una captura como críticamente irrecuperable, el sistema deberá bloquear el procesamiento facturable y solicitar recaptura, reemplazo o modo manual. | P0 | RF-013–RF-015 |
| EARS-F-004 | Event-driven | **Cuando** la evaluación de calidad clasifique una captura como aceptable o recuperable, el sistema deberá permitir generar una variante derivada sin modificar el original. | P0 | RF-016–RF-018 |
| EARS-F-005 | Ubiquitous | El sistema deberá conservar el archivo original como un activo inmutable relacionado con todos sus derivados. | P0 | RF-016 |
| EARS-F-006 | Event-driven | **Cuando** el usuario solicite procesar una variante aceptada, el sistema deberá registrar la solicitud con archivo, variante, proveedor y opciones identificables. | P0 | RF-023, RF-025 |
| EARS-F-007 | Event-driven | **Cuando** termine un procesamiento de OCR, el sistema deberá conservar la respuesta original del proveedor y sus metadatos técnicos. | P0 | RF-025 |
| EARS-F-008 | Event-driven | **Cuando** existan varias variantes de una misma imagen, el sistema deberá permitir comparar sus resultados sin declarar automáticamente una variante como verdadera. | P0 | RF-017, RF-018, RNF-QLT-001 |
| EARS-F-009 | Event-driven | **Cuando** un resultado incluya texto, matemáticas o geometría reconocible, el sistema deberá transformarlo a un modelo canónico independiente del proveedor. | P0 | RF-026, RF-030–RF-032 |
| EARS-F-010 | Event-driven | **Cuando** el benchmark reciba una muestra, el sistema deberá registrar tiempo, costo estimado, proveedor, variante y resultado para compararlos. | P0 | OBJ-008, RNF-OBS-002 |

## 4. Requisitos del prototipo B — rebanada vertical

| ID | Patrón | Requisito EARS | Prioridad | Traza |
| --- | --- | --- | --- | --- |
| EARS-F-011 | Event-driven | **Cuando** el usuario confirme entre una y tres páginas, el sistema deberá crear un trabajo asíncrono durable sin bloquear la interfaz hasta finalizar OCR. | P0 | RF-020, RF-028 |
| EARS-F-012 | State-driven | **Mientras** un trabajo esté activo, el sistema deberá mostrar la fase real, el alcance afectado y la posibilidad de volver posteriormente. | P0 | RF-071–RF-074 |
| EARS-F-013 | Event-driven | **Cuando** una página termine un paso de procesamiento, el sistema deberá publicar su resultado real aunque otras páginas continúen pendientes. | P0 | RF-027, RF-073 |
| EARS-F-014 | Unwanted behavior | **Si** un proveedor falla para una página, el sistema deberá conservar los resultados sanos, marcar la página afectada y ofrecer un reintento acotado. | P0 | RF-028, RF-076 |
| EARS-F-015 | Event-driven | **Cuando** el OCR devuelva regiones identificables, el sistema deberá crear bloques de tipo párrafo, encabezado, ecuación, figura o desconocido según la clasificación disponible. | P0 | RF-021, RF-022, RF-031 |
| EARS-F-016 | Event-driven | **Cuando** un bloque tenga señales de baja confianza, interpretación múltiple o estructura incompleta, el sistema deberá marcarlo como ambiguo y conservar su región de origen. | P0 | RF-026, RF-032, RF-035 |
| EARS-F-017 | Event-driven | **Cuando** el usuario abra un bloque ambiguo, el sistema deberá mostrar el recorte original, la interpretación actual y las alternativas disponibles. | P0 | RF-035, RF-036 |
| EARS-F-018 | Event-driven | **Cuando** el usuario confirme una interpretación, el sistema deberá guardar la decisión como una revisión de usuario sin alterar la evidencia original. | P0 | RF-033, RF-037 |
| EARS-F-019 | Event-driven | **Cuando** el usuario edite un bloque, el sistema deberá crear o actualizar una versión editable y mantener separada la transcripción original. | P0 | RF-033, RF-034, RF-037 |
| EARS-F-020 | State-driven | **Mientras** el usuario edite un documento, el sistema deberá guardar automáticamente los cambios después de una pausa y comunicar si aún no están persistidos. | P0 | RF-037, RNF-PER-009 |
| EARS-F-021 | Event-driven | **Cuando** el usuario solicite una revisión lingüística habilitada, el sistema deberá devolver sugerencias estructuradas sin modificar automáticamente el texto. | P1 | RF-040, RF-042 |
| EARS-F-022 | Event-driven | **Cuando** el usuario acepte una sugerencia, el sistema deberá convertirla en una edición trazable del usuario y conservar la sugerencia original. | P1 | RF-033, RF-042 |
| EARS-F-023 | Event-driven | **Cuando** el usuario solicite una validación matemática representable, el sistema deberá registrar si la conclusión proviene de un validador determinista, heurística o IA. | P1 | RF-042, RF-043 |
| EARS-F-024 | Unwanted behavior | **Si** un bloque no puede reconstruirse semánticamente, el sistema deberá conservarlo como figura visual y permitir continuar con el documento. | P0 | RF-031, RF-046 |
| EARS-F-025 | Event-driven | **Cuando** el usuario solicite la vista previa, el sistema deberá renderizar la versión canónica con estilos, ecuaciones y figuras disponibles. | P0 | RF-050–RF-060 |
| EARS-F-026 | Unwanted behavior | **Si** existen ambigüedades o campos bloqueantes antes de exportar, el sistema deberá dirigir al usuario a esos asuntos y no generar el PDF sin confirmación válida. | P0 | RF-058, RF-062 |
| EARS-F-027 | Event-driven | **Cuando** el usuario confirme una exportación válida, el sistema deberá generar un PDF asociado a una versión, plantilla y estado concretos. | P0 | RF-061–RF-063 |
| EARS-F-028 | Event-driven | **Cuando** el usuario solicite eliminar un documento, el sistema deberá revocar su acceso y programar la eliminación de sus activos según la política vigente. | P0 | RF-005, RF-082 |

## 5. Condiciones de aceptación comunes

Un requisito EARS funcional se considera verificable cuando:

- Tiene un evento, estado o condición reproducible.
- Indica una respuesta observable del sistema.
- Tiene prioridad y trazabilidad a la ERS.
- Puede probarse sin depender de una interpretación subjetiva.
- Conserva el original y la procedencia cuando afecta contenido reconocido.

## 6. Requisitos fuera de este artefacto

Los siguientes requisitos permanecen en la ERS y no son objetivo del primer prototipo:

- Reconstrucción editable de gráficas y diagramas.
- Estructuras químicas semánticas.
- Procesadores específicos de biología, mecánica o mecatrónica.
- Colaboración, instituciones y notificaciones externas.
- Exportadores distintos de PDF.

Su ausencia aquí no elimina su lugar en el producto futuro; evita convertir hipótesis no validadas en trabajo inmediato.
