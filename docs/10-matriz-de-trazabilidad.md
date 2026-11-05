# Matriz de trazabilidad

> **Versión:** 0.1  
> **Estado:** derivada de la [ERS](./03-ers-especificacion-de-requisitos.md)  
> **Fecha:** 2026-10-03

## 1. Propósito

Esta matriz relaciona objetivos, requisitos, casos de uso, componentes arquitectónicos y evidencia de validación. Su finalidad es detectar requisitos huérfanos, implementación sin necesidad documentada y cambios incompletos.

## 2. Suites de validación previstas

| ID | Suite | Evidencia principal |
| --- | --- | --- |
| VAL-AUTH | Identidad y autorización | Integración y pruebas de acceso horizontal/vertical |
| VAL-DOCS | Gestión documental | Integración y end-to-end |
| VAL-CAPTURE | Captura y carga | Componentes, navegador, redes degradadas y end-to-end |
| VAL-QUALITY | Calidad y mejora | Conjunto etiquetado, métricas y pruebas de transformaciones |
| VAL-PIPELINE | Cola y procesamiento | Integración, contrato, idempotencia y resiliencia |
| VAL-MODEL | Modelo canónico y versiones | Unitarias, propiedades, fixtures y migraciones |
| VAL-REVIEW | Ambigüedades y sugerencias | Unitarias, componentes y end-to-end |
| VAL-LANGUAGE | Español | Dataset, LanguageTool y revisión humana |
| VAL-MATH | Matemáticas | Equivalencia, fixtures y revisión pedagógica |
| VAL-SCIENCE | Unidades y disciplinas | Fixtures por dominio y revisión experta |
| VAL-DIAGRAM | Figuras y diagramas | Dataset, superposición y pruebas de editor |
| VAL-CHART | Gráficas | Calibración, error de puntos y pruebas de editor |
| VAL-COMPOSE | Composición | Visual, snapshots controlados y end-to-end |
| VAL-EXPORT | PDF/exportadores | Integración de Chromium, comparación y accesibilidad |
| VAL-PERF | Rendimiento | RUM, laboratorio y carga con p50/p95/p99 |
| VAL-RESILIENCE | Recuperación | Inyección de fallos, reinicios y duplicación de mensajes |
| VAL-SECURITY | Seguridad | SAST/DAST, autorización, carga hostil y revisión |
| VAL-PRIVACY | Privacidad y eliminación | Inventario, inspección de telemetría y pruebas de purga |
| VAL-ACCESS | Accesibilidad | Herramientas automáticas y prueba manual |
| VAL-OPS | Operación y costos | Paneles, alertas, cuotas y correlación |
| VAL-DESIGN | Revisión de diseño futuro | Contrato, impacto y plan de pruebas antes de implementar una capacidad P2 |

## 3. Objetivos a capacidades

| Objetivo | Capacidades/requisitos | Casos de uso | Indicador principal |
| --- | --- | --- | --- |
| OBJ-001 | RF-010–RF-018, RF-020–RF-029, RF-050–RF-063 | CU-002–CU-006, CU-013, CU-014 | Tiempo activo ahorrado y tiempo hasta exportación |
| OBJ-002 | RF-016, RF-025, RF-030–RF-039, RF-042, RF-063, RF-084 | CU-005–CU-009, CU-014, CU-015 | Porcentaje de bloques con linaje completo |
| OBJ-003 | RF-012, RF-027, RF-070–RF-079; RNF-PER-* | CU-002–CU-004, CU-014 | Tiempo hasta primera respuesta/resultado útil |
| OBJ-004 | RF-013–RF-018, RF-089; RNF-QLT-002 | CU-003 | Capturas críticas enviadas a OCR y falsos rechazos |
| OBJ-005 | RF-022–RF-026, RF-030–RF-032, RF-040–RF-049, RF-064 | CU-007–CU-012 | Tiempo/cambios para añadir un procesador |
| OBJ-006 | RF-050–RF-064 | CU-006, CU-010–CU-014 | Documentos que llegan a entregable sin otra herramienta |
| OBJ-007 | RF-080–RF-088; RNF-SEC-*, RNF-PRI-* | CU-001, CU-016, CU-017 | Incidentes y solicitudes de eliminación completadas |
| OBJ-008 | RF-025, RF-084, RF-089; RNF-OBS-*, RNF-QLT-* | CU-004, CU-015, CU-017 | Cobertura de telemetría, costo y benchmark |

## 4. Requisitos funcionales a diseño y prueba

### 4.1. Cuenta y documentos

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-001, RF-002 | CU-001 | ARC-WEB, ARC-API, ARC-DATA | VAL-AUTH, VAL-SECURITY |
| RF-003, RF-004 | CU-001, CU-002 | ARC-WEB, ARC-API, ARC-DOC, ARC-DATA | VAL-DOCS |
| RF-005 | CU-016 | ARC-API, ARC-DATA, ARC-ORCH | VAL-DOCS, VAL-PRIVACY |

### 4.2. Captura y calidad

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-010, RF-011 | CU-002 | ARC-WEB, ARC-API, ARC-DATA | VAL-CAPTURE |
| RF-012 | CU-002 | ARC-WEB | VAL-CAPTURE, VAL-PERF |
| RF-013, RF-014, RF-015 | CU-003 | ARC-WEB, ARC-QUALITY, ARC-ORCH | VAL-QUALITY, VAL-PERF |
| RF-016, RF-017, RF-018 | CU-003, CU-004 | ARC-QUALITY, ARC-DATA | VAL-QUALITY, VAL-MODEL |
| RF-019 | CU-002, CU-015 | ARC-API, ARC-ORCH, ARC-DATA | VAL-CAPTURE, VAL-PIPELINE |

### 4.3. Procesamiento y OCR

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-020 | CU-004 | ARC-API, ARC-ORCH | VAL-PIPELINE, VAL-RESILIENCE |
| RF-021, RF-022 | CU-004, CU-010–CU-012 | ARC-OCR, ARC-DOC | VAL-PIPELINE, VAL-MODEL |
| RF-023, RF-024 | CU-004, CU-015 | ARC-OCR | VAL-PIPELINE |
| RF-025, RF-026 | CU-004–CU-012 | ARC-OCR, ARC-DOC, ARC-DATA | VAL-PIPELINE, VAL-MODEL |
| RF-027 | CU-004 | ARC-ORCH, ARC-WEB | VAL-PIPELINE, VAL-PERF |
| RF-028, RF-029 | CU-004, CU-015 | ARC-ORCH, ARC-DATA | VAL-PIPELINE, VAL-RESILIENCE |

### 4.4. Documento y versiones

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-030, RF-031, RF-032 | CU-004–CU-012 | ARC-DOC, ARC-DATA | VAL-MODEL |
| RF-033, RF-034 | CU-005–CU-009 | ARC-WEB, ARC-DOC | VAL-MODEL, VAL-REVIEW |
| RF-035, RF-036 | CU-005 | ARC-WEB, ARC-DOC, ARC-DATA | VAL-REVIEW |
| RF-037, RF-038 | CU-006 | ARC-WEB, ARC-API, ARC-DOC, ARC-DATA | VAL-DOCS, VAL-MODEL, VAL-RESILIENCE |
| RF-039 | CU-015 | ARC-ORCH, ARC-OCR, ARC-DOC | VAL-PIPELINE, VAL-MODEL |

### 4.5. Revisión multidisciplinaria

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-040, RF-041 | CU-007 | ARC-REVIEW, ARC-WEB | VAL-LANGUAGE |
| RF-042 | CU-005, CU-007–CU-009 | ARC-REVIEW, ARC-DOC, ARC-WEB | VAL-REVIEW |
| RF-043 | CU-009 | ARC-REVIEW | VAL-MATH |
| RF-044 | CU-008 | ARC-REVIEW | VAL-SCIENCE |
| RF-045 | CU-012 | ARC-OCR, ARC-REVIEW | VAL-SCIENCE, VAL-MODEL |
| RF-046 | CU-010–CU-012 | ARC-DOC, ARC-WEB | VAL-DIAGRAM, VAL-MODEL |
| RF-047 | CU-010 | ARC-WEB, ARC-REVIEW, ARC-DOC | VAL-DIAGRAM |
| RF-048 | CU-011 | ARC-WEB, ARC-REVIEW, ARC-DOC | VAL-CHART |
| RF-049 | CU-008 | ARC-REVIEW, ARC-DATA | VAL-SCIENCE, VAL-PRIVACY |

### 4.6. Editor y composición

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-050 | CU-006, CU-013 | ARC-WEB, ARC-DOC | VAL-DOCS, VAL-COMPOSE |
| RF-051, RF-052, RF-053 | CU-013 | ARC-WEB, ARC-COMP | VAL-COMPOSE |
| RF-054 | CU-013 | ARC-WEB, ARC-DOC, ARC-COMP | VAL-COMPOSE |
| RF-055 | CU-006, CU-009 | ARC-WEB, ARC-DOC | VAL-MATH, VAL-COMPOSE |
| RF-056 | CU-010 | ARC-WEB, ARC-DOC | VAL-DIAGRAM |
| RF-057 | CU-011 | ARC-WEB, ARC-DOC | VAL-CHART |
| RF-058 | CU-005, CU-013, CU-014 | ARC-DOC, ARC-WEB | VAL-REVIEW, VAL-EXPORT |
| RF-059 | CU-013 | ARC-COMP, ARC-DOC | VAL-COMPOSE |

### 4.7. Exportación

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-060, RF-061 | CU-013, CU-014 | ARC-COMP, ARC-ORCH, ARC-DATA | VAL-COMPOSE, VAL-EXPORT, VAL-PERF |
| RF-062, RF-063 | CU-014 | ARC-WEB, ARC-COMP, ARC-DATA | VAL-EXPORT, VAL-MODEL |
| RF-064 | CU-014 | ARC-COMP, ARC-DOC | VAL-EXPORT, VAL-DESIGN |

`VAL-DESIGN` en RF-064 deberá complementarse con una suite de contrato específica al planificar cada exportador.

### 4.8. Fluidez y comunicación

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-070, RF-071 | CU-001–CU-004, CU-014 | ARC-WEB | VAL-PERF, VAL-ACCESS |
| RF-072, RF-073, RF-074 | CU-004, CU-014 | ARC-WEB, ARC-API, ARC-ORCH | VAL-PIPELINE, VAL-PERF, VAL-RESILIENCE |
| RF-075 | CU-002–CU-004 | ARC-WEB | VAL-ACCESS, VAL-PERF |
| RF-076 | CU-002–CU-004, CU-014, CU-017 | Todos los contenedores con UI/API | VAL-DOCS, VAL-ACCESS |
| RF-077, RF-078 | CU-004, CU-015 | ARC-WEB, ARC-ORCH | VAL-PIPELINE, VAL-RESILIENCE |
| RF-079 | CU-004 | ARC-WEB, ARC-API | VAL-DOCS, VAL-PRIVACY |

### 4.9. Seguridad, privacidad y operación

| Requisitos | Casos de uso | Componentes | Validación |
| --- | --- | --- | --- |
| RF-080 | CU-001, CU-016, CU-017 | ARC-WEB, ARC-API, ARC-DATA | VAL-AUTH, VAL-SECURITY |
| RF-081, RF-082 | CU-008, CU-016 | ARC-API, ARC-DATA | VAL-PRIVACY |
| RF-083 | CU-017 | ARC-API, ARC-OCR, ARC-REVIEW | VAL-SECURITY |
| RF-084 | CU-005–CU-017 | ARC-DATA, ARC-OBS | VAL-OPS, VAL-SECURITY |
| RF-085 | CU-016 | ARC-API, ARC-DATA | VAL-PRIVACY |
| RF-086, RF-087, RF-088 | CU-001, CU-016, CU-017 | Todos los contenedores | VAL-SECURITY, VAL-PRIVACY |
| RF-089 | CU-003, CU-004, CU-015, CU-017 | ARC-API, ARC-ORCH, ARC-DATA, ARC-OBS | VAL-OPS, VAL-PIPELINE |

## 5. Requisitos no funcionales a arquitectura y prueba

| Requisitos | Componentes/decisiones | Validación |
| --- | --- | --- |
| RNF-PER-001–RNF-PER-004 | ARC-WEB; Web Workers, miniaturas locales | VAL-PERF |
| RNF-PER-005–RNF-PER-007 | ARC-API, ARC-ORCH; SSE, colas separadas | VAL-PERF, VAL-PIPELINE |
| RNF-PER-008, RNF-PER-009 | ARC-WEB, ARC-DOC; virtualización y autoguardado | VAL-PERF, VAL-DOCS |
| RNF-PER-010 | ARC-COMP, ARC-ORCH | VAL-PERF, VAL-EXPORT |
| RNF-CAP-001–RNF-CAP-003 | ARQ-004, ARQ-005; configuración y workers horizontales | VAL-PERF, VAL-RESILIENCE |
| RNF-REL-001–RNF-REL-006 | ARC-DATA, ARC-ORCH; PostgreSQL durable, outbox y backups | VAL-RESILIENCE, VAL-OPS |
| RNF-SEC-001–RNF-SEC-005 | ARC-API, ARC-DATA y controles transversales | VAL-SECURITY |
| RNF-PRI-001–RNF-PRI-004 | Minimización, retención, adaptadores y telemetría redactada | VAL-PRIVACY |
| RNF-USA-001–RNF-USA-005 | ARC-WEB y estrategia de comunicación | VAL-ACCESS |
| RNF-MAN-001–RNF-MAN-004 | ARQ-004, ARQ-008, ARQ-012; contratos y versionado | VAL-MODEL, VAL-PIPELINE |
| RNF-POR-001, RNF-POR-002 | Contenedores y S3/MinIO | VAL-RESILIENCE, VAL-OPS |
| RNF-OBS-001–RNF-OBS-003 | ARC-OBS; OpenTelemetry y correlación | VAL-OPS |
| RNF-QLT-001–RNF-QLT-004 | ARC-QUALITY, ARC-OCR, ARC-REVIEW; datasets versionados | VAL-QUALITY, VAL-LANGUAGE, VAL-MATH, VAL-SCIENCE |

## 6. Reglas de negocio a casos de uso

| Regla | Casos de uso | Requisitos que la instrumentan |
| --- | --- | --- |
| RN-001 | CU-003, CU-005, CU-010–CU-012 | RF-016, RF-032, RF-033 |
| RN-002 | CU-003 | RF-013–RF-015, RF-089 |
| RN-003 | CU-003 | RF-015, RF-050 |
| RN-004 | CU-004–CU-012 | RF-025, RF-032, RF-084 |
| RN-005 | CU-007–CU-009 | RF-033, RF-042 |
| RN-006 | CU-008, CU-009 | RF-035, RF-042, RF-043, RF-049 |
| RN-007 | CU-002–CU-004 | RF-070, RF-071, RF-075, RF-078 |
| RN-008 | CU-004, CU-010–CU-012 | RF-021, RF-022 |
| RN-009 | CU-010–CU-014 | RF-031, RF-046, RF-060 |
| RN-010 | CU-016 | RF-081, RF-085, RNF-PRI-001 |
| RN-011 | CU-014 | RF-058, RF-062 |
| RN-012 | CU-002, CU-004, CU-015 | RF-010, RF-089, RNF-CAP-001 |

## 7. Cobertura por horizonte

| Horizonte | Requisitos principales | Casos de uso |
| --- | --- | --- |
| P0 | RF-001–RF-005; RF-010–RF-018; RF-020–RF-023 y RF-025–RF-028; base de RF-030–RF-037; RF-040, RF-042, RF-043; RF-050–RF-053, RF-055, RF-058, RF-060–RF-063; RF-070–RF-076, RF-078; RF-080–RF-089 | CU-001–CU-009, CU-013, CU-014, CU-016, CU-017 |
| P1 | RF-019, RF-024, RF-029, RF-038, RF-039, RF-041, RF-044, RF-046–RF-049, RF-054, RF-056, RF-057, RF-059, RF-077, RF-079 | CU-010, CU-011, CU-015 y ampliaciones de CU-004/CU-008/CU-013 |
| P2 | RF-045, RF-064 y especializaciones de RF-031 | CU-012 y nuevos exportadores/organizaciones |

## 8. Política de mantenimiento

Al cambiar un requisito:

1. Actualizar su fila funcional o no funcional.
2. Revisar casos de uso afectados.
3. Revisar componente arquitectónico y decisión.
4. Actualizar suite o evidencia.
5. Cambiar cobertura de horizonte si corresponde.
6. Ejecutar la auditoría de identificadores y enlaces.
7. Registrar contradicciones o decisiones pendientes en la [auditoría](./11-auditoria-de-consistencia.md).
