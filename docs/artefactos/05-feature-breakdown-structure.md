# ART-006 — Feature Breakdown Structure (FBS)

> **Tipo:** estructura jerárquica de características del producto<br>
> **Versión:** 1.0<br>
> **Estado:** propuesta de alcance y descomposición para `develop`<br>
> **Fecha:** 2026-11-05<br>
> **Fuentes:** [ERS](../03-ers-especificacion-de-requisitos.md), [PRD](../04-prd.md) y [arquitectura](../08-arquitectura-y-tecnologias.md)

## 1. Propósito

La **Feature Breakdown Structure** descompone AlgeTra desde el producto completo hasta capacidades implementables y verificables. Sirve para:

- ordenar el alcance sin convertir cada característica en un microservicio;
- relacionar capacidades con requisitos, módulos y validación;
- separar el núcleo P0 de las expansiones P1 y P2;
- identificar dependencias entre funciones antes de construirlas;
- mantener una unidad común para el backlog, el feature model y la arquitectura.

Este FBS es una estructura de **producto**, no un WBS de tareas de proyecto. No prescribe sprints, personas ni fechas. Tampoco implica que cada rama deba desplegarse de manera independiente.

## 2. Convenciones

| Elemento | Significado |
| --- | --- |
| `FBS-00` | Producto raíz. |
| `FBS-01` a `FBS-10` | Capacidades de primer nivel. |
| `FBS-xx.yy` | Característica de segundo nivel. |
| `FBS-xx.yy.zz` | Subcaracterística o comportamiento observable. |
| `P0`, `P1`, `P2` | Horizonte de entrega definido por la ERS. |
| `MVP` | Mínimo necesario para una primera versión utilizable. |
| `Extensible` | Debe existir el contrato o espacio de modelo aunque la automatización sea posterior. |

Las características se implementarán inicialmente como módulos del monolito modular, endpoints, componentes web, pasos de trabajo y adaptadores. **FBS no equivale a una lista de servicios.**

## 3. Vista jerárquica

```text
FBS-00 AlgeTra — manuscrito académico a entregable confiable
├── FBS-01 Identidad, espacios y ciclo de vida documental
│   ├── FBS-01.01 Cuenta, sesión y autorización
│   ├── FBS-01.02 Espacio privado del usuario
│   ├── FBS-01.03 Crear, listar, abrir, archivar y eliminar documentos
│   └── FBS-01.04 Retención, recuperación y control de versiones
├── FBS-02 Captura, entrada y carga
│   ├── FBS-02.01 Selección, cámara y formatos admitidos
│   ├── FBS-02.02 Miniaturas y cola local
│   ├── FBS-02.03 Páginas múltiples y orden
│   └── FBS-02.04 Carga directa, reanudable y confirmación
├── FBS-03 Calidad de imagen y linaje de activos
│   ├── FBS-03.01 Señales rápidas en cliente
│   ├── FBS-03.02 Puerta autoritativa en servidor
│   ├── FBS-03.03 Recaptura, reemplazo y modo manual
│   ├── FBS-03.04 Variantes no destructivas
│   └── FBS-03.05 Hash, deduplicación y procedencia
├── FBS-04 Procesamiento y orquestación
│   ├── FBS-04.01 Trabajo durable y pasos idempotentes
│   ├── FBS-04.02 Segmentación y clasificación
│   ├── FBS-04.03 Enrutamiento por bloque
│   ├── FBS-04.04 Colas, prioridades y límites
│   ├── FBS-04.05 Resultados parciales y eventos
│   └── FBS-04.06 Reintento, cancelación, reanudación y aislamiento
├── FBS-05 Modelo documental canónico y procedencia
│   ├── FBS-05.01 Esquema versionado
│   ├── FBS-05.02 Bloques y geometría normalizada
│   ├── FBS-05.03 Separación de capas de contenido
│   ├── FBS-05.04 Revisiones, snapshots y restauración
│   └── FBS-05.05 Fallback visual y contenido desconocido
├── FBS-06 Comprensión, revisión y control humano
│   ├── FBS-06.01 Cola de ambigüedades
│   ├── FBS-06.02 Comparación con imagen de origen
│   ├── FBS-06.03 Revisión lingüística
│   ├── FBS-06.04 Validación matemática y de unidades
│   ├── FBS-06.05 Sugerencias académicas explicadas
│   └── FBS-06.06 Aceptar, rechazar, editar y auditar decisiones
├── FBS-07 Edición, composición y entrega
│   ├── FBS-07.01 Editor estructurado
│   ├── FBS-07.02 Texto, ecuaciones y figuras
│   ├── FBS-07.03 Portada, estilos y plantilla
│   ├── FBS-07.04 Vista previa paginada
│   └── FBS-07.05 PDF y exportadores posteriores
├── FBS-08 Procesadores y dominios de contenido
│   ├── FBS-08.01 Texto español
│   ├── FBS-08.02 Matemáticas y STEM
│   ├── FBS-08.03 Tablas y formularios
│   ├── FBS-08.04 Figuras preservadas
│   ├── FBS-08.05 Diagramas y gráficas editables
│   └── FBS-08.06 Química y disciplinas especializadas
├── FBS-09 Confianza, seguridad y gobierno
│   ├── FBS-09.01 Aislamiento y autorización
│   ├── FBS-09.02 Privacidad y eliminación
│   ├── FBS-09.03 Transparencia de proveedores
│   ├── FBS-09.04 Cuotas, costo y consentimiento
│   └── FBS-09.05 Accesibilidad y estados honestos
└── FBS-10 Operación, escalabilidad y evolución
    ├── FBS-10.01 Observabilidad de extremo a extremo
    ├── FBS-10.02 Escalado por API, cola y worker
    ├── FBS-10.03 Resiliencia y recuperación
    ├── FBS-10.04 Despliegue y configuración
    └── FBS-10.05 Contratos para futura extracción
```

## 4. Capacidades de primer nivel

| ID | Capacidad | Resultado de negocio | Horizonte | Componentes principales |
| --- | --- | --- | --- | --- |
| FBS-01 | Identidad y ciclo documental | El usuario controla trabajos privados y sus versiones. | P0 | `ARC-WEB`, `ARC-API`, `ARC-DOC`, `ARC-DATA` |
| FBS-02 | Captura y carga | Una o varias páginas llegan al sistema con respuesta inmediata. | P0 | `ARC-WEB`, `ARC-API`, `ARC-DATA` |
| FBS-03 | Calidad y linaje | Se evita OCR inútil y se conserva cada original y derivado. | P0 | `ARC-QUALITY`, `ARC-DATA`, `ARC-ORCH` |
| FBS-04 | Procesamiento y orquestación | El trabajo pesado es durable, parcial, reintentable y escalable. | P0 | `ARC-ORCH`, `ARC-OCR`, `ARC-OBS` |
| FBS-05 | Modelo canónico | El contenido no depende de Mathpix, Tiptap ni un exportador. | P0 | `ARC-DOC`, `ARC-DATA` |
| FBS-06 | Revisión y control humano | El usuario identifica, entiende y decide sobre incertidumbres. | P0/P1 | `ARC-REVIEW`, `ARC-DOC`, `ARC-WEB` |
| FBS-07 | Edición y entrega | El manuscrito se convierte en un documento presentable y PDF. | P0 | `ARC-WEB`, `ARC-COMP`, `ARC-ORCH` |
| FBS-08 | Dominios y procesadores | Nuevos tipos de contenido se incorporan mediante contratos. | P0/P1/P2 | `ARC-OCR`, `ARC-REVIEW`, `ARC-DOC` |
| FBS-09 | Confianza y gobierno | El sistema protege datos, costo y decisiones del alumno. | P0 | `ARC-API`, `ARC-DATA`, `ARC-OBS`, todos los módulos |
| FBS-10 | Operación y evolución | El producto puede crecer sin perder control operativo. | P0/P1 | `ARC-ORCH`, `ARC-OBS`, plataforma de despliegue |

## 5. Catálogo de características

### 5.1. FBS-01 — Identidad, espacios y ciclo de vida documental

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-01.01 | Cuenta y sesión | Iniciar, renovar y cerrar una sesión con un principal verificable. | RF-001, RNF-SEC-001 |
| FBS-01.02 | Espacio privado | Aislar documentos, activos y trabajos por usuario y futuro workspace. | RF-002, RF-080, RF-088 |
| FBS-01.03 | Ciclo documental | Crear, listar, abrir, renombrar, archivar y eliminar un documento. | RF-003–RF-005 |
| FBS-01.04 | Retención y recuperación | Aplicar retención, purga y recuperación de trabajos confirmados. | RF-005, RF-082, RNF-PRI-002 |

### 5.2. FBS-02 — Captura, entrada y carga

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-02.01 | Entrada multimodal | Admitir JPEG, PNG y PDF dentro de límites visibles; cámara web cuando aplique. | RF-010 |
| FBS-02.02 | Vista local | Mostrar miniatura y estado local antes de completar la transferencia. | RF-012, RF-070 |
| FBS-02.03 | Lote de páginas | Añadir, quitar, sustituir y reordenar varias páginas. | RF-011 |
| FBS-02.04 | Carga directa | Transferir a S3 compatible mediante URL firmada y confirmar integridad. | RF-010, RF-080, RNF-SEC-003 |
| FBS-02.05 | Carga recuperable | Reanudar una transferencia interrumpida cuando el tamaño y el proveedor lo justifiquen. | RF-010, RNF-REL-004 |

### 5.3. FBS-03 — Calidad de imagen y linaje de activos

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-03.01 | Señales rápidas | Medir desenfoque, exposición, recorte, rotación, perspectiva y contraste en cliente. | RF-013, RF-014 |
| FBS-03.02 | Puerta servidor | Recalcular calidad de forma autoritativa antes de OCR facturable. | RF-013–RF-015, RN-002 |
| FBS-03.03 | Recaptura guiada | Explicar el defecto y ofrecer recaptura, reemplazo o modo manual. | RF-015, RN-003 |
| FBS-03.04 | Variantes derivadas | Generar corrección de perspectiva, iluminación, escala o contraste sin sobrescribir el origen. | RF-016–RF-018 |
| FBS-03.05 | Linaje de imagen | Relacionar original, variante, recorte, transformación, parámetros y hash. | RF-016–RF-018, RN-004 |
| FBS-03.06 | Deduplicación segura | Detectar duplicados sin revelar activos privados ni reutilizar contenido entre usuarios sin política. | RF-019, RNF-PRI-001 |

### 5.4. FBS-04 — Procesamiento y orquestación

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-04.01 | Trabajo durable | Crear un trabajo y sus pasos en PostgreSQL antes de delegar ejecución. | RF-020, RNF-REL-002 |
| FBS-04.02 | Outbox y publicación | Publicar trabajos desde una intención durable sin perder ni duplicar mensajes. | RF-020, RF-028, RNF-REL-003 |
| FBS-04.03 | Segmentación | Dividir páginas en regiones con orden, geometría y contexto. | RF-021 |
| FBS-04.04 | Clasificación | Asignar tipo de bloque y nivel de incertidumbre. | RF-022, RF-026 |
| FBS-04.05 | Enrutamiento | Elegir procesador por bloque, capacidad, costo y política. | RF-022–RF-024, RN-008 |
| FBS-04.06 | Colas aisladas | Separar calidad, OCR interactivo, OCR batch, revisión y exportación. | RNF-CAP-002, RNF-CAP-003 |
| FBS-04.07 | Resultados progresivos | Publicar páginas o bloques reales al terminar, sin esperar el lote completo. | RF-027, RF-073 |
| FBS-04.08 | Recuperación | Reintentar con idempotencia, cancelar cuando sea seguro y aislar fallos por página. | RF-028, RF-029, RNF-REL-003–RNF-REL-005 |

### 5.5. FBS-05 — Modelo documental canónico y procedencia

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-05.01 | Esquema versionado | Validar documentos y bloques contra una versión explícita del esquema. | RF-030, RNF-MAN-003 |
| FBS-05.02 | Bloques tipados | Representar texto, título, ecuación, tabla, figura, diagrama, gráfica, química y desconocido. | RF-031 |
| FBS-05.03 | Geometría | Asociar bloque, página, polígono normalizado, recorte y transformación. | RF-032 |
| FBS-05.04 | Capas separadas | Mantener resultado bruto, transcripción, edición, sugerencia y exportación como capas distintas. | RF-025, RF-033, RN-001, RN-005 |
| FBS-05.05 | Revisiones | Guardar cambios, snapshots, restauración y base de sugerencias sin destruir historia. | RF-037, RF-038 |
| FBS-05.06 | Fallback visual | Conservar regiones no interpretadas como figura utilizable en vista previa y PDF. | RF-046, RN-009 |

### 5.6. FBS-06 — Comprensión, revisión y control humano

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-06.01 | Cola de ambigüedades | Ordenar bloques dudosos por impacto, confianza, tipo y página. | RF-035 |
| FBS-06.02 | Comparación de origen | Mostrar recorte, transcripción, alternativas y geometría en la misma revisión. | RF-036 |
| FBS-06.03 | Revisión lingüística | Proponer ortografía, gramática y puntuación sin modificar automáticamente. | RF-040–RF-042 |
| FBS-06.04 | Matemáticas deterministas | Validar equivalencia, operaciones o restricciones representables con SymPy. | RF-043 |
| FBS-06.05 | Unidades y dominio | Analizar magnitudes cuando el tipo de contenido y el procesador lo soporten. | RF-044 |
| FBS-06.06 | Sugerencia académica | Mostrar explicación, fuente, método y límites de una sugerencia. | RF-049, RN-006 |
| FBS-06.07 | Decisión humana | Aceptar, rechazar, editar, omitir y auditar cada sugerencia o ambigüedad. | RF-033, RF-042, RN-005 |

### 5.7. FBS-07 — Edición, composición y entrega

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-07.01 | Editor estructurado | Ordenar, reclasificar y editar bloques autorizados. | RF-034, RF-050 |
| FBS-07.02 | Texto y ecuaciones | Editar español y LaTeX con render legible. | RF-050, RF-055 |
| FBS-07.03 | Portada y estilos | Configurar campos, tipografía, color, márgenes y orientación. | RF-051–RF-053 |
| FBS-07.04 | Vista previa | Renderizar paginación, figuras, ecuaciones y asuntos pendientes. | RF-058, RF-060 |
| FBS-07.05 | PDF trazable | Generar PDF ligado a versión, plantilla, opciones y estado. | RF-061–RF-063 |
| FBS-07.06 | Exportadores futuros | Añadir formatos posteriores sin cambiar el modelo canónico. | RF-064 |

### 5.8. FBS-08 — Procesadores y dominios de contenido

| ID | Característica | Horizonte | Contrato o resultado |
| --- | --- | --- | --- |
| FBS-08.01 | Texto español | P0 | OCR, normalización y revisión lingüística. |
| FBS-08.02 | Matemáticas y STEM | P0 | Adaptador Mathpix, LaTeX, geometría y confianza. |
| FBS-08.03 | Tablas y formularios | P0/P1 | Estructura editable cuando la evidencia lo permita; fallback visual siempre. |
| FBS-08.04 | Figuras preservadas | P0 | Recurso visual con procedencia y posición. |
| FBS-08.05 | Diagramas y gráficas | P1 | Reconstrucción asistida, nodos, conexiones, ejes y series. |
| FBS-08.06 | Química | P2 | Procesador especializado, representación química y validación humana. |
| FBS-08.07 | Ciencias, física y unidades | P1/P2 | Procesadores por dominio, Pint y contexto educativo. |
| FBS-08.08 | Proveedores alternativos | P1 | OCR general u otro proveedor sin cambiar el modelo canónico. |

### 5.9. FBS-09 — Confianza, seguridad y gobierno

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-09.01 | Autorización por alcance | Validar usuario, workspace, documento, activo y evento en el servidor. | RF-080, RNF-SEC-001 |
| FBS-09.02 | Privacidad y purga | Minimizar datos, controlar retención y purgar objetos, resultados, cachés y trabajos. | RF-081–RF-088, RNF-PRI-* |
| FBS-09.03 | Transparencia | Informar proveedor, propósito, fase, procedencia y estado de confirmación. | RF-081, RN-004 |
| FBS-09.04 | Cuotas y costo | Aplicar límites por usuario, proveedor, concurrencia, variantes y presupuesto. | RF-089, RN-012 |
| FBS-09.05 | Consentimiento de entrenamiento | Mantener desactivado por defecto el uso de contenido para entrenamiento. | RF-085, RN-010 |
| FBS-09.06 | Accesibilidad | Comunicar estado sin depender solo de color y permitir teclado en flujos esenciales. | RNF-USA-001–RNF-USA-005 |
| FBS-09.07 | Inmediatez honesta | No convertir skeletons, porcentajes estimados o resultados pendientes en contenido real. | RF-070–RF-078, RN-007 |

### 5.10. FBS-10 — Operación, escalabilidad y evolución

| ID | Característica | Descripción observable | Traza |
| --- | --- | --- | --- |
| FBS-10.01 | Observabilidad | Correlacionar navegador, API, trabajo, paso, proveedor y costo sin contenido sensible. | RF-084, RNF-OBS-* |
| FBS-10.02 | Escalado de API | Ejecutar réplicas stateless detrás de balanceador y CDN para recursos públicos. | RNF-CAP-002, RNF-POR-001 |
| FBS-10.03 | Escalado de workers | Aumentar concurrencia por cola y clase de carga, respetando cuotas externas. | RNF-CAP-002–RNF-CAP-003 |
| FBS-10.04 | Escalado de datos | Usar índices, pool de conexiones, réplicas de lectura, particiones y almacenamiento de objetos cuando la medida lo justifique. | RNF-CAP-001, RNF-REL-* |
| FBS-10.05 | Resiliencia | Backups, recuperación, circuit breakers, límites, reintentos y aislamiento. | RNF-REL-001–RNF-REL-006 |
| FBS-10.06 | Configuración | Cambiar límites, proveedores, flags y políticas sin recompilar el modelo de dominio. | RNF-MAN-001–RNF-MAN-004 |
| FBS-10.07 | Extracción futura | Mantener contratos, eventos, propiedad de datos y adaptadores para separar un módulo si hay evidencia. | RNF-MAN-001–RNF-MAN-003 |

## 6. Slices de entrega

| Slice | Características mínimas | Evidencia de terminación |
| --- | --- | --- |
| Prototipo A — benchmark | FBS-03.01–03.05, FBS-04.03–04.05, FBS-08.01–08.02, FBS-10.01 | Dataset procesado con comparación de variantes, OCR, geometría, latencia y costo. |
| Prototipo B — vertical | FBS-02, FBS-03, FBS-04, FBS-05, FBS-07.01–07.05, FBS-09.07 | Usuario carga, revisa, edita y obtiene PDF con resultados reales. |
| P0 — primera versión | P0 del catálogo, identidad privada, revisión lingüística/matemática, operación y eliminación | Criterios de lanzamiento de la ERS demostrados. |
| P1 — expansión | FBS-06.05–06.06, FBS-08.05, FBS-08.07–08.08, restauración, notificaciones | Benchmark y pruebas de contrato por nuevo procesador. |
| P2 — especialización | FBS-08.06 y dominios avanzados, organizaciones, exportadores | Decisiones de privacidad, operación y validación específicas aprobadas. |

## 7. Dependencias principales

| Característica | Depende de | Razón |
| --- | --- | --- |
| FBS-03.02 Puerta servidor | FBS-02.04, FBS-10.01 | Necesita archivo confirmado e instrumentación antes de bloquear costo. |
| FBS-04.05 Enrutamiento | FBS-05.01, FBS-08 | El procesador debe declarar capacidades y salida compatible. |
| FBS-04.07 Resultados parciales | FBS-04.01, FBS-05.01, FBS-10.01 | Requiere estado durable, esquema versionado y eventos reanudables. |
| FBS-06 Revisión | FBS-05.02–05.04 | No puede revisar sin bloques, procedencia y revisión objetivo. |
| FBS-07.05 PDF | FBS-05, FBS-07.03–07.04, FBS-09.07 | Solo exporta una versión canónica renderizable y confirmable. |
| FBS-08.05 Semántica visual | FBS-05.02, FBS-05.06, FBS-06.07 | Debe tener fallback y revisión humana antes de afirmar estructura. |
| FBS-10.07 Extracción futura | FBS-04, FBS-05, FBS-10.01 | Los límites necesitan contratos, procedencia y telemetría. |

## 8. Relación con la arquitectura

El FBS se proyecta sobre el **monolito modular** y sus roles de ejecución:

| Plano | Características | Regla |
| --- | --- | --- |
| Interfaz | FBS-02, FBS-06, FBS-07, FBS-09 | Puede escalar como aplicación estática/CDN y API stateless; no contiene autoridad de negocio. |
| Aplicación y dominio | FBS-01, FBS-04, FBS-05, FBS-06, FBS-09 | Módulos con APIs internas explícitas y propiedad de datos lógica. |
| Procesamiento | FBS-03, FBS-04, FBS-08 | Workers y colas escalables por clase; no son microservicios de materia. |
| Datos | FBS-01, FBS-03, FBS-05, FBS-09, FBS-10 | PostgreSQL para estado relacional; S3 compatible para binarios y resultados grandes. |
| Operación | FBS-09, FBS-10 | Observabilidad, límites y políticas transversales sin exponer contenido sensible. |

La decisión de arquitectura está formalizada en [ADR-001 — Monolito modular escalable](./07-adr-001-arquitectura-monolito-modular.md).

## 9. Criterio de cierre de una feature

Una característica del FBS no se considera terminada solo porque exista una pantalla. Debe tener:

1. contrato de entrada y salida;
2. relación con requisito o decisión documentada;
3. estado durable si afecta el trabajo del usuario;
4. permisos y política de privacidad;
5. comportamiento de error y reintento cuando corresponda;
6. métrica o evidencia de aceptación;
7. prueba unitaria, de integración, de contrato o E2E adecuada;
8. telemetría sin contenido académico innecesario.
