# Auditoría de consistencia documental

> **Versión auditada:** línea base 0.1  
> **Fecha:** 2026-10-03  
> **Estado:** aprobada con decisiones abiertas no bloqueantes  
> **Alcance:** documentación, no implementación

## 1. Objetivo

Verificar que la documentación de AlgeTra:

- Mantenga un alcance coherente.
- No contenga decisiones tecnológicas contradictorias.
- Use identificadores únicos y trazables.
- Separe requisitos, producto, arquitectura y validación.
- Distinga capacidades P0, P1 y P2.
- Sea consistente respecto de calidad de imagen, rendimiento, IA y privacidad.
- No prometa como implementadas pruebas o funciones que solo están especificadas.

## 2. Documentos auditados

1. [`README.md`](./README.md)
2. [Descripción de la problemática](./01-descripcion-de-la-problematica.md)
3. [Enfoque de la solución](./02-enfoque-de-la-solucion.md)
4. [ERS](./03-ers-especificacion-de-requisitos.md)
5. [PRD](./04-prd.md)
6. [Requisitos funcionales](./05-requisitos-funcionales.md)
7. [Requisitos no funcionales](./06-requisitos-no-funcionales.md)
8. [Casos de uso](./07-casos-de-uso.md)
9. [Arquitectura y tecnologías](./08-arquitectura-y-tecnologias.md)
10. [Rendimiento y experiencia percibida](./09-rendimiento-y-experiencia.md)
11. [Matriz de trazabilidad](./10-matriz-de-trazabilidad.md)

## 3. Jerarquía utilizada

1. La ERS es la autoridad normativa principal.
2. Los catálogos funcional y no funcional detallan la ERS.
3. El PRD define valor, usuarios, alcance y prioridad de producto.
4. Los casos de uso describen la interacción observable.
5. La arquitectura explica cómo satisfacer los requisitos sin convertir decisiones internas en necesidades de producto.
6. La estrategia de rendimiento concreta la experiencia de espera.
7. La matriz enlaza necesidad, diseño y validación.

## 4. Método

### 4.1. Revisión automática

Se comprobaron:

- Existencia de destinos para enlaces Markdown locales.
- Cantidad y unicidad de identificadores normativos.
- Igualdad entre requisitos resumidos en la ERS y catálogos detallados.
- Igualdad de prioridades funcionales entre ERS y catálogo.
- Existencia de casos de uso resumidos y desarrollados.
- Cobertura de requisitos en la matriz de trazabilidad, incluidas expresiones de rango.
- Definición de todos los componentes `ARC-*` referenciados.
- Definición de todas las suites `VAL-*` referenciadas.
- Inclusión de todos los documentos en el índice.
- Balance de bloques de código Markdown.

### 4.2. Revisión semántica

Se contrastaron:

- Alcance matemático frente a multidisciplinario.
- Mathpix como herramienta principal frente a proveedor único.
- Tecnologías aprobadas frente a decisiones abiertas.
- Flujo de calidad previo al consumo de OCR/IA.
- Transcripción literal frente a corrección.
- Rendimiento percibido frente a contenido engañoso.
- Diagramas y gráficas automáticos frente a reconstrucción asistida.
- P0 frente a mediano plazo.
- Estados documentales y progresivos.
- Formato inicial de exportación.

## 5. Resultado cuantitativo

| Elemento | Cantidad | Resultado |
| --- | ---: | --- |
| Objetivos `OBJ-*` | 8 | Todos definidos y trazados |
| Actores `ACT-*` | 7 | Todos definidos en ERS |
| Reglas de negocio `RN-*` | 12 | Todas trazadas a casos y requisitos |
| Requisitos funcionales `RF-*` | 80 | Únicos, presentes en ERS y catálogo |
| Requisitos no funcionales `RNF-*` | 46 | Únicos, presentes en ERS y catálogo |
| Casos de uso `CU-*` | 17 | Resumen y desarrollo coincidentes |
| Decisiones abiertas `DA-*` | 8 | Todas identificadas; ninguna se presenta como resuelta |
| Decisiones arquitectónicas `ARQ-*` | 12 | Todas definidas |
| Componentes `ARC-*` | 10 | Todos definidos y referenciados |
| Suites previstas `VAL-*` | 21 | Todas definidas y referenciadas |
| Requisitos funcionales sin traza | 0 | Conforme |
| Requisitos no funcionales sin traza | 0 | Conforme |
| Casos de uso sin traza | 0 | Conforme |
| Enlaces locales rotos | 0 | Conforme |
| Bloques de código sin cierre | 0 | Conforme |

Las suites `VAL-*` representan evidencia exigida para la futura implementación. Todavía no existen pruebas ejecutables porque esta auditoría cubre únicamente la base documental.

## 6. Consistencia por tema

| Tema | Decisión consistente | Estado |
| --- | --- | --- |
| Producto | Plataforma de transformación documental académica, no solo OCR matemático | Conforme |
| Primer alcance | Español, matemáticas, calidad, revisión, edición y PDF | Conforme |
| Expansión | Ciencias, química, biología, mecánica, mecatrónica, diagramas y gráficas por etapas | Conforme |
| Frontend | React + TypeScript + Vite | Conforme |
| Astro | Solo candidato para sitio público/documental, no aplicación principal | Conforme |
| Backend | Python + FastAPI | Conforme |
| Persistencia | PostgreSQL para estado/metadatos; S3/MinIO para binarios | Conforme |
| Asincronía | Celery + Redis inicialmente; estado durable en PostgreSQL | Conforme |
| Evolución de workflows | Temporal solo cuando la complejidad medida lo justifique | Conforme |
| OCR | Mathpix principal para STEM detrás de adaptador; segundo OCR pendiente de benchmark | Conforme |
| Calidad | Evaluación cliente + servidor antes de pasos facturables | Conforme |
| Imagen original | Inmutable; todas las mejoras son derivadas trazables | Conforme |
| IA | Sugerencias separadas, nunca cambios silenciosos | Conforme |
| Español | LanguageTool inicial y glosarios P1 | Conforme |
| Matemáticas | Mathpix para extracción y SymPy para validación representable | Conforme |
| Unidades | Pint en P1 | Conforme |
| Química | Procesador especializado y validación humana en P2 | Conforme |
| Diagramas | Modos semántico, asistido o visual preservado | Conforme |
| Gráficas | Calibración y series editables en P1; original conservado | Conforme |
| Exportación | PDF es el primer formato | Conforme |
| Progreso | Unidades/fases reales, SSE y polling de respaldo | Conforme |
| Placeholders | Identificables, no copiables/exportables como resultado | Conforme |
| Privacidad | Minimización, no entrenamiento predeterminado y evaluación de proveedores | Conforme con decisiones legales abiertas |

## 7. Hallazgos corregidos durante la auditoría

### AUD-RES-001 — Alcance inicialmente demasiado matemático

**Problema:** los documentos iniciales enfatizaban texto y matemáticas, mientras la visión actual incluye materias y representaciones adicionales.

**Corrección:** se actualizaron problemática y enfoque; la ERS y el modelo canónico contemplan texto, tablas, química, diagramas, gráficas y figuras desde P0 estructuralmente.

### AUD-RES-002 — Mathpix podía interpretarse como único OCR

**Problema:** el enfoque original describía a Mathpix como capa principal sin establecer claramente el enrutamiento por bloque.

**Corrección:** Mathpix quedó definido como adaptador STEM principal; `RF-022`, `RF-023` y `RF-024` establecen clasificación, adaptador y OCR alternativo.

### AUD-RES-003 — Tecnologías decididas todavía figuraban como pendientes

**Problema:** plataforma, frontend, backend, persistencia y exportación seguían listados como decisiones por tomar.

**Corrección:** se fijaron React/Vite, FastAPI, PostgreSQL, S3/MinIO, Celery/Redis y PDF; la lista pendiente se redujo a proveedores, políticas y límites aún no acordados.

### AUD-RES-004 — Falta de requisito explícito para calidad del reconocimiento

**Problema:** existían métricas en texto, pero no una familia normativa de calidad.

**Corrección:** se agregaron `RNF-QLT-001` a `RNF-QLT-004` en ERS, catálogo y trazabilidad.

### AUD-RES-005 — Suite de validación no definida

**Problema:** la primera versión de trazabilidad utilizó una referencia provisional no declarada para exportadores futuros.

**Corrección:** se definió `VAL-DESIGN` y se vinculó a `RF-064`.

### AUD-RES-006 — Cobertura P0 expresada con un rango incorrecto

**Problema:** una expresión de rango podía incluir identificadores reservados no definidos y una excepción fuera del rango.

**Corrección:** la sección de horizontes enumera ahora los intervalos existentes de forma explícita.

### AUD-RES-007 — Riesgo de interpretar “engañar” como resultado falso

**Problema:** mejorar percepción de velocidad podría confundirse con inventar progreso o contenido.

**Corrección:** `RN-007`, `RF-070` a `RF-078`, `RNF-USA-003`, `RNF-USA-004` y la estrategia de rendimiento permiten anticipación visual y progreso, pero prohíben presentar simulaciones como resultados.

### AUD-RES-008 — Diagramas no tenían fallback obligatorio

**Problema:** una reconstrucción fallida podía dejar el contenido incompleto.

**Corrección:** `RN-009`, `RF-031` y `RF-046` exigen conservar el recorte visual aunque falle la interpretación semántica.

## 8. Decisiones abiertas no bloqueantes para el esqueleto

| ID | Decisión | Impacto | Bloquea ahora |
| --- | --- | --- | --- |
| DA-001 | Proveedor OIDC | Implementación final de sesión e identidad | No bloquea módulos de dominio; sí autenticación productiva |
| DA-002 | Segundo OCR | Fallback y español general | No bloquea adaptador Mathpix ni contrato |
| DA-003 | Proveedor/modelo IA | Revisión generativa y residencia | No bloquea sugerencias ni validadores deterministas |
| DA-004 | Límites por plan | Políticas de admisión y producto comercial | No bloquea límites configurables |
| DA-005 | Retención exacta | Purga, términos y backups | No bloquea interfaces; sí datos reales en producción |
| DA-006 | País/currículo inicial | Revisión académica contextual | No bloquea transcripción P0 |
| DA-007 | Notificaciones externas | Trabajos prolongados | No bloquea notificación dentro de la aplicación |
| DA-008 | Editor genérico de diagramas | RF-046/RF-047 | No bloquea conservación visual P0 |

## 9. Riesgos o validaciones pendientes

### 9.1. Umbrales de exactitud

No se fijó un porcentaje universal porque sería engañoso mezclar texto, matemáticas, diagramas y química. Antes del piloto deben crearse datasets representativos y establecer umbrales por tipo conforme a `RNF-QLT-001`.

### 9.2. SLO dependiente de terceros

`RNF-PER-006` define un objetivo end-to-end condicionado a un proveedor saludable. Deben medirse por separado:

- Espera interna.
- Transferencia.
- Latencia de proveedor.
- Normalización y publicación.

Un incumplimiento externo sigue afectando la experiencia y debe comunicarse, aunque no se atribuya al tiempo propio.

### 9.3. Privacidad de menores

La arquitectura contiene controles técnicos, pero jurisdicción, edad, consentimiento y contrato no pueden resolverse solo con código. `DA-005` y la evaluación de proveedores son bloqueantes antes de usar datos reales en producción.

### 9.4. Costos y variantes de imagen

Generar variantes es barato localmente, pero enviar varias a OCR puede multiplicar costos. El benchmark debe definir cuándo una segunda variante aporta suficiente mejora.

### 9.5. Alcance P0

El modelo es multidisciplinario, pero no se debe presentar P1/P2 como ya disponible. En P0, diagramas, gráficas y química pueden conservarse visualmente; su reconstrucción especializada permanece explícitamente en horizontes posteriores.

## 10. Cobertura y límites de la auditoría

### Cubierto

- Coherencia interna de documentos.
- Identificadores y enlaces.
- Prioridades y horizontes.
- Correspondencia entre requisitos, casos, arquitectura y validación prevista.
- Decisiones técnicas declaradas.

### No cubierto todavía

- Viabilidad demostrada mediante prototipo.
- Rendimiento medido.
- Precisión real de Mathpix u otro proveedor con el dataset del producto.
- Costos comerciales finales.
- Revisión legal o contractual.
- Amenazas mediante un threat model formal.
- Pruebas ejecutables, porque aún no existe implementación.

## 11. Dictamen

La línea base documental 0.1 es **consistente y suficiente para iniciar el diseño detallado y el esqueleto técnico**, con estas condiciones:

1. No tratar objetivos de rendimiento como resultados ya demostrados.
2. Construir primero el benchmark de calidad y latencia.
3. Mantener adaptadores y modelo canónico independientes.
4. No habilitar datos reales en producción antes de resolver retención, consentimiento y proveedores.
5. Repetir la auditoría cuando cambie un requisito, prioridad, tecnología central o proveedor.

No quedan contradicciones documentales bloqueantes conocidas.

## 12. Próxima auditoría

Debe repetirse después de cualquiera de estos eventos:

- Selección de OIDC, OCR general o proveedor de IA.
- Definición de límites y planes.
- Primer benchmark.
- Primer esquema de base de datos o API.
- Primer prototipo de captura y calidad.
- Cambio de prioridades P0/P1/P2.
- Incorporación de una nueva disciplina.
- Preparación para piloto o producción.
