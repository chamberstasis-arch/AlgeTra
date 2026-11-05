# ART-004 — Historias de usuario

> **Tipo:** historias de usuario del prototipo  
> **Versión:** 1.0  
> **Estado:** propuesta para planificación en `develop`  
> **Fecha:** 2026-11-05

## 1. Objetivo

Estas historias traducen la visión técnica a resultados que un usuario pueda experimentar. Cada historia debe poder convertirse en tareas, pruebas y una demostración del prototipo.

Formato utilizado:

> **Como** `<rol>`, **quiero** `<capacidad>`, **para** `<beneficio>`.

Los criterios siguen una forma Given/When/Then adaptada al español.

## 2. Épica A — Captura y calidad

### US-001 — Ver la página inmediatamente

**Prioridad:** P0  
**Como** alumno, **quiero** ver una miniatura al seleccionar una página, **para** saber que la aplicación recibió mi acción sin esperar al servidor.

**Criterios de aceptación:**

- **Dado** que selecciono una imagen compatible, **cuando** termina su lectura local, **entonces** aparece una miniatura identificada como pendiente de carga.
- La interfaz no bloquea la selección de otra página durante la vista previa.
- La acción cumple el objetivo de `EARS-NF-001` y `EARS-NF-002`.

**Trazabilidad:** EARS-F-001, RF-012.

### US-002 — Saber si debo repetir una foto

**Prioridad:** P0  
**Como** alumno, **quiero** recibir una advertencia sobre desenfoque, iluminación o recorte, **para** corregir la captura antes de esperar un OCR inútil.

**Criterios de aceptación:**

- **Dado** que una página tiene un defecto crítico, **cuando** termina la evaluación, **entonces** se explica el defecto y cómo capturarla mejor.
- La página no se envía automáticamente a un servicio facturable.
- Puedo reemplazarla o conservarla para transcripción manual.

**Trazabilidad:** EARS-F-003, EARS-NF-010, RF-013–RF-015.

### US-003 — Procesar una foto recuperable

**Prioridad:** P0  
**Como** alumno, **quiero** que el sistema mejore una imagen recuperable sin destruir la original, **para** aumentar las posibilidades de reconocimiento.

**Criterios de aceptación:**

- **Dado** que la página es recuperable, **cuando** inicio el procesamiento, **entonces** se crea un derivado trazable.
- La imagen original permanece disponible y sin modificaciones.
- Puedo consultar qué variante se utilizó.

**Trazabilidad:** EARS-F-004, EARS-F-005, RF-016–RF-018.

## 3. Épica B — Transcripción progresiva

### US-004 — Procesar varias páginas sin bloquearme

**Prioridad:** P0  
**Como** alumno, **quiero** iniciar el procesamiento y continuar revisando la interfaz, **para** no esperar frente a una pantalla congelada.

**Criterios de aceptación:**

- **Dado** que confirmé entre una y tres páginas, **cuando** inicio el trabajo, **entonces** la API confirma el trabajo sin esperar el OCR completo.
- Puedo cerrar la vista y volver posteriormente.
- El estado se conserva si se interrumpe el navegador.

**Trazabilidad:** EARS-F-011, EARS-F-012, EARS-NF-012.

### US-005 — Ver la primera página lista

**Prioridad:** P0  
**Como** alumno, **quiero** ver una página terminada aunque otra continúe procesándose, **para** comenzar la revisión cuanto antes.

**Criterios de aceptación:**

- **Dado** que una página finalizó, **cuando** el sistema persiste su resultado, **entonces** puedo abrirla sin esperar el documento completo.
- La interfaz identifica qué páginas siguen pendientes.
- Un resultado parcial real no se confunde con el documento final.

**Trazabilidad:** EARS-F-013, EARS-NF-004–EARS-NF-006.

### US-006 — Recuperarme de un fallo parcial

**Prioridad:** P0  
**Como** alumno, **quiero** que un fallo en una página no destruya las demás, **para** poder continuar con mi trabajo.

**Criterios de aceptación:**

- **Dado** que falla el proveedor para una página, **cuando** el worker registra el error, **entonces** las páginas sanas permanecen disponibles.
- Se muestra el alcance del fallo y una opción de reintento.
- No se duplican resultados al reintentar.

**Trazabilidad:** EARS-F-014, EARS-NF-011–EARS-NF-013.

## 4. Épica C — Comprensión y revisión

### US-007 — Comparar transcripción con la hoja

**Prioridad:** P0  
**Como** alumno, **quiero** ver el recorte original junto a la transcripción, **para** corregir interpretaciones dudosas con rapidez.

**Criterios de aceptación:**

- **Dado** que un bloque fue marcado como ambiguo, **cuando** lo abro, **entonces** veo su región original y la interpretación actual.
- Puedo editar, confirmar o dejar pendiente el bloque.
- La decisión no modifica el original.

**Trazabilidad:** EARS-F-016–EARS-F-019, RF-035–RF-037.

### US-008 — Editar texto y ecuaciones

**Prioridad:** P0  
**Como** alumno, **quiero** editar el texto reconocido y el LaTeX de una ecuación, **para** dejar correcta mi transcripción antes de darle formato.

**Criterios de aceptación:**

- **Dado** que existe un bloque editable, **cuando** lo modifico, **entonces** se actualiza la versión del documento.
- La transcripción del proveedor y la edición quedan diferenciadas.
- El cambio se guarda automáticamente o muestra que sigue pendiente.

**Trazabilidad:** EARS-F-019–EARS-F-020, EARS-NF-007–EARS-NF-008.

### US-009 — Recibir sugerencias lingüísticas separadas

**Prioridad:** P1  
**Como** alumno, **quiero** recibir sugerencias de ortografía y gramática, **para** mejorar la presentación sin cambiar automáticamente lo que escribí.

**Criterios de aceptación:**

- **Dado** que solicito revisión lingüística, **cuando** termina, **entonces** cada sugerencia muestra categoría, explicación y propuesta.
- Puedo aceptar, rechazar o editar la sugerencia.
- Aceptarla crea una edición trazable y conserva el texto original.

**Trazabilidad:** EARS-F-021–EARS-F-022, RF-040–RF-042.

### US-010 — Entender una posible equivocación matemática

**Prioridad:** P1  
**Como** alumno, **quiero** conocer por qué un procedimiento matemático puede estar mal, **para** aprender y decidir si lo corrijo.

**Criterios de aceptación:**

- **Dado** que la expresión puede analizarse, **cuando** solicito validación, **entonces** se identifica la herramienta o método utilizado.
- La respuesta diferencia validación determinista, heurística y explicación de IA.
- La sugerencia no cambia la tarea sin mi aceptación.

**Trazabilidad:** EARS-F-023, RF-043.

## 5. Épica D — Entregable

### US-011 — Conservar una figura no soportada

**Prioridad:** P0  
**Como** alumno, **quiero** que una gráfica o diagrama no reconocido se conserve como imagen, **para** no perder contenido de mi tarea.

**Criterios de aceptación:**

- **Dado** que una región no puede reconstruirse, **cuando** termina la normalización, **entonces** queda disponible como figura visual.
- Puedo incluirla en la vista previa y en el PDF.
- El sistema no afirma que conoce las conexiones o datos que no pudo interpretar.

**Trazabilidad:** EARS-F-024, RF-031, RF-046.

### US-012 — Crear una portada sencilla

**Prioridad:** P0  
**Como** alumno, **quiero** completar una portada con título, nombre, materia, docente y fecha, **para** entregar un documento académico presentable.

**Criterios de aceptación:**

- **Dado** que estoy editando un documento, **cuando** selecciono la portada, **entonces** puedo completar sus campos.
- La portada aparece en la vista previa y PDF.
- Los campos faltantes se indican antes de exportar si son obligatorios.

**Trazabilidad:** RF-050–RF-053, RF-058.

### US-013 — Exportar a PDF

**Prioridad:** P0  
**Como** alumno, **quiero** exportar mi documento a PDF, **para** enviarlo como entregable sin usar otra herramienta.

**Criterios de aceptación:**

- **Dado** que no hay asuntos bloqueantes o los confirmé explícitamente, **cuando** solicito exportar, **entonces** se genera un PDF asociado a la versión actual.
- El PDF contiene texto, ecuaciones y figuras disponibles.
- Puedo saber qué versión y plantilla originaron el archivo.

**Trazabilidad:** EARS-F-025–EARS-F-027, EARS-NF-009, RF-060–RF-063.

## 6. Épica E — Privacidad y confianza

### US-014 — Saber qué ocurre con mi archivo

**Prioridad:** P0  
**Como** alumno, **quiero** conocer el estado y proveedor usado para procesar mi contenido, **para** mantener confianza en el sistema.

**Criterios de aceptación:**

- **Dado** que una página se envía a un proveedor, **cuando** consulto su procedencia, **entonces** veo el propósito y el proveedor configurado.
- Los secretos no son visibles.
- El estado comunica si el resultado es parcial, confirmado o pendiente.

**Trazabilidad:** EARS-F-006–EARS-F-007, EARS-NF-019–EARS-NF-023.

### US-015 — Eliminar mi trabajo

**Prioridad:** P0  
**Como** alumno, **quiero** eliminar mi documento y sus activos, **para** controlar la permanencia de mi información.

**Criterios de aceptación:**

- **Dado** que soy propietario autorizado, **cuando** confirmo la eliminación, **entonces** el acceso se revoca inmediatamente.
- El sistema muestra el estado de la purga.
- El evento queda registrado sin guardar innecesariamente el contenido.

**Trazabilidad:** EARS-F-028, EARS-NF-024–EARS-NF-025, RF-005, RF-082.

## 7. Historias deliberadamente posteriores

Estas historias pertenecen a incrementos posteriores y no deben entrar al primer prototipo:

- **US-016:** reconstruir un diagrama de flujo como nodos y conexiones.
- **US-017:** digitalizar una gráfica mediante calibración y series.
- **US-018:** convertir una estructura química manuscrita a una representación validada.
- **US-019:** compartir el documento con un docente o tutor.
- **US-020:** administrar documentos dentro de una organización educativa.
