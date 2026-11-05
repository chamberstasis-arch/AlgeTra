# ART-003 — Requisitos no funcionales en formato EARS

> **Tipo:** requisitos no funcionales del prototipo  
> **Versión:** 1.0  
> **Estado:** propuesta implementable en `develop`  
> **Fecha:** 2026-11-05  
> **Fuente global:** [ERS](../03-ers-especificacion-de-requisitos.md)

## 1. Propósito

Este artefacto convierte en frases EARS los atributos de calidad más importantes para el prototipo. Los umbrales son objetivos iniciales; deberán medirse con el corpus y los dispositivos definidos en el [resumen de visión y prototipo](../12-resumen-vision-y-prototipo.md).

## 2. Requisitos EARS

### 2.1. Rendimiento y experiencia

| ID | Patrón | Requisito EARS | Medida de aceptación | Traza |
| --- | --- | --- | --- | --- |
| EARS-NF-001 | Event-driven | **Cuando** el usuario realice una acción local del flujo principal, la interfaz deberá mostrar retroalimentación visual en un máximo de 100 ms p95. | Medición de interacción a siguiente pintura. | RNF-PER-001 |
| EARS-NF-002 | Event-driven | **Cuando** el usuario seleccione una página típica, el cliente deberá mostrar una miniatura local en un máximo de 300 ms p95 sin bloquear la interacción. | Prueba en escritorio y móvil de referencia. | RNF-PER-004 |
| EARS-NF-003 | Event-driven | **Cuando** el sistema evalúe una página típica en el dispositivo de referencia, deberá mostrar el diagnóstico inicial en un máximo de 1.5 s p95. | Instrumentación desde selección hasta diagnóstico. | RNF-PER-003 |
| EARS-NF-004 | State-driven | **Mientras** un trabajo esté activo, el cliente deberá recibir un evento de estado o latido cada 2 s como máximo, salvo desconexión detectada. | Prueba SSE y fallback de consulta. | RNF-PER-007 |
| EARS-NF-005 | Event-driven | **Cuando** el proveedor OCR esté saludable y una página típica se procese, el sistema deberá mostrar un primer resultado útil en un máximo objetivo de 15 s p95. | Medición separada de cola, proveedor y normalización. | RNF-PER-006 |
| EARS-NF-006 | Event-driven | **Cuando** no exista una medición fiable de porcentaje de avance, el sistema deberá mostrar un estado indeterminado con fase y tiempo transcurrido, no un porcentaje inventado. | Simulación de proveedor sin progreso. | RNF-USA-003, RNF-USA-004 |
| EARS-NF-007 | State-driven | **Mientras** el usuario edite un documento típico, las operaciones de escritura y selección deberán responder en un máximo de 100 ms p95. | Prueba con contenido y bloques representativos. | RNF-PER-008 |
| EARS-NF-008 | Event-driven | **Cuando** el usuario deje de editar durante 2 s, el sistema deberá iniciar el autoguardado y confirmar persistencia en un máximo de 5 s p95. | Medición de pausa, request y confirmación. | RNF-PER-009 |
| EARS-NF-009 | Event-driven | **Cuando** el usuario solicite un PDF típico de hasta 10 páginas, el sistema deberá producirlo en un máximo de 15 s p95 bajo carga normal. | Prueba de exportación con Chromium. | RNF-PER-010 |

### 2.2. Calidad, disponibilidad y escalabilidad

| ID | Patrón | Requisito EARS | Medida de aceptación | Traza |
| --- | --- | --- | --- | --- |
| EARS-NF-010 | Unwanted behavior | **Si** una captura se clasifica como críticamente irrecuperable, el sistema no deberá enviar una solicitud OCR o IA facturable automáticamente. | Revisar llamadas externas y eventos de admisión. | RN-002, RF-015 |
| EARS-NF-011 | Unwanted behavior | **Si** un mensaje o callback se entrega más de una vez, el sistema deberá evitar duplicar bloques, cargos o exportaciones. | Reentrega controlada y claves de idempotencia. | RNF-REL-003 |
| EARS-NF-012 | Unwanted behavior | **Si** el navegador se desconecta después de confirmar un trabajo, el sistema deberá conservarlo y permitir recuperarlo posteriormente. | Interrumpir cliente y reabrir sesión. | RNF-REL-004 |
| EARS-NF-013 | Unwanted behavior | **Si** falla una página durante un trabajo multipágina, el sistema deberá aislar el fallo y conservar las páginas sanas cuando sea posible. | Inyección de fallo por página. | RNF-REL-005 |
| EARS-NF-014 | Ubiquitous | El sistema deberá mantener el estado durable de documentos y trabajos en PostgreSQL, sin depender de Redis como única fuente. | Reiniciar Redis y workers y recuperar estado. | RNF-REL-002 |
| EARS-NF-015 | Event-driven | **Cuando** la profundidad de una cola supere su capacidad configurada, el sistema deberá aplicar contrapresión, límites o prioridad controlada antes de agotar recursos. | Prueba de carga y recuperación. | RNF-CAP-003 |
| EARS-NF-016 | Ubiquitous | El sistema deberá permitir escalar horizontalmente workers separados por tipo de carga sin cambiar el modelo documental. | Añadir réplicas y comprobar throughput e idempotencia. | RNF-CAP-002 |
| EARS-NF-017 | Ubiquitous | El sistema deberá evaluar cada procesador mediante métricas apropiadas al tipo de contenido y no mediante una precisión global única. | Reporte separado para texto, matemáticas y estructura. | RNF-QLT-001 |
| EARS-NF-018 | Event-driven | **Cuando** se incorpore un procesador nuevo, el equipo deberá disponer de un benchmark de precisión, latencia, costo, privacidad y fallback antes de habilitarlo por defecto. | Registro de evaluación aprobado. | RNF-QLT-004 |

### 2.3. Seguridad y privacidad

| ID | Patrón | Requisito EARS | Medida de aceptación | Traza |
| --- | --- | --- | --- | --- |
| EARS-NF-019 | Ubiquitous | El sistema deberá autenticar y autorizar en el servidor toda operación privada, descarga, evento y acceso a activo. | Pruebas de acceso horizontal y vertical. | RNF-SEC-001 |
| EARS-NF-020 | Event-driven | **Cuando** el sistema genere una URL firmada, deberá limitarla al activo, operación y tiempo estrictamente necesarios. | Intentar reutilización, operación contraria y acceso expirado. | RNF-SEC-003 |
| EARS-NF-021 | Ubiquitous | El sistema deberá mantener secretos de proveedores exclusivamente en componentes protegidos del servidor. | Inspección de bundle, respuestas, repositorio y logs. | RF-083, RNF-SEC-004 |
| EARS-NF-022 | Ubiquitous | El sistema deberá proteger comunicaciones mediante TLS y datos persistentes mediante cifrado administrado. | Revisión de configuración y políticas de almacenamiento. | RNF-SEC-002 |
| EARS-NF-023 | Ubiquitous | El sistema no deberá incluir por defecto texto, imágenes, ecuaciones o secretos del usuario en telemetría operativa. | Muestreo automatizado y manual de logs y trazas. | RNF-PRI-003 |
| EARS-NF-024 | Event-driven | **Cuando** el usuario solicite eliminar un documento, el sistema deberá revocar el acceso inmediatamente y ejecutar la purga conforme a la política documentada. | Prueba sobre base, objetos, caché y trabajos. | RF-082, RNF-PRI-002 |
| EARS-NF-025 | Ubiquitous | El sistema no deberá usar contenido académico para entrenamiento sin consentimiento explícito, separado y auditable. | Valor predeterminado negativo y revisión de configuración. | RF-085, RNF-PRI-004 |

### 2.4. Usabilidad, accesibilidad y mantenimiento

| ID | Patrón | Requisito EARS | Medida de aceptación | Traza |
| --- | --- | --- | --- | --- |
| EARS-NF-026 | Ubiquitous | El sistema deberá comunicar los estados mediante texto o semántica además de color. | Revisión monocromática, teclado y lector de pantalla. | RNF-USA-002 |
| EARS-NF-027 | State-driven | **Mientras** exista un trabajo prolongado, la interfaz deberá indicar fase, alcance, estado de conectividad y acción disponible. | Pruebas con demoras y fallos simulados. | RNF-USA-003 |
| EARS-NF-028 | Unwanted behavior | **Si** una interfaz muestra un esqueleto, estimación o resultado no confirmado, el usuario no deberá poder copiarlo ni exportarlo como contenido real. | Pruebas de selección, copiar y exportar. | RNF-USA-004 |
| EARS-NF-029 | Ubiquitous | El sistema deberá mantener el modelo documental, API y eventos versionados y migrables. | Abrir fixtures de versiones anteriores y ejecutar migraciones. | RNF-MAN-003 |
| EARS-NF-030 | Ubiquitous | Los adaptadores de proveedores deberán poder probarse mediante contratos y sustitutos controlados. | Ejecutar flujo con fake y fixtures versionados. | RNF-MAN-002 |
| EARS-NF-031 | Ubiquitous | El sistema deberá asignar un identificador de correlación a cada petición, trabajo, paso y llamada externa. | Seguir una página de extremo a extremo sin usar contenido sensible. | RNF-OBS-001 |

## 3. Reglas para medir estos requisitos

- Usar p50, p95 y p99; no depender únicamente de promedios.
- Separar latencia propia, red, proveedor, cola y normalización.
- Medir en al menos un escritorio y un móvil de gama media.
- Ejecutar redes rápidas, lentas e intermitentes.
- Registrar versión del frontend, backend, worker, proveedor y dataset.
- No convertir los objetivos iniciales en promesas de precisión antes del benchmark.
