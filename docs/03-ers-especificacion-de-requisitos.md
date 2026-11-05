# ERS — Especificación de requisitos de software

> **Producto:** AlgeTra  
> **Versión documental:** 0.1  
> **Estado:** línea base inicial para revisión  
> **Fecha:** 2026-10-03  
> **Autoridad:** este es el documento rector de requisitos. Los catálogos detallados de requisitos funcionales y no funcionales forman parte de esta ERS.

## 1. Propósito

Esta Especificación de Requisitos de Software define el comportamiento, restricciones, atributos de calidad y límites iniciales de AlgeTra. Su objetivo es servir como referencia común para producto, diseño, desarrollo, pruebas, operación y futuras decisiones de arquitectura.

AlgeTra permitirá convertir trabajos académicos manuscritos en documentos digitales editables, revisables y listos para entregar. El sistema abarcará texto, matemáticas y, progresivamente, contenido de español, ciencias, biología, química, física, mecánica, mecatrónica, diagramas y gráficas.

## 2. Convenciones normativas

Los términos siguientes tienen carácter normativo:

- **DEBE / NO DEBE:** requisito obligatorio.
- **DEBERÍA / NO DEBERÍA:** recomendación fuerte que solo puede omitirse con una decisión documentada.
- **PUEDE:** capacidad opcional.
- **P0:** imprescindible para la primera versión utilizable.
- **P1:** siguiente incremento de producto.
- **P2:** alcance posterior o especializado.

Cada requisito tiene un identificador estable. Su texto detallado y criterios de aceptación se encuentran en:

- [Requisitos funcionales](./05-requisitos-funcionales.md)
- [Requisitos no funcionales](./06-requisitos-no-funcionales.md)

Si existiera una contradicción, prevalece esta ERS; después se deberá corregir el documento derivado y registrar el cambio en la auditoría.

## 3. Alcance del producto

### 3.1. Alcance general

AlgeTra es una plataforma de comprensión y reconstrucción documental académica. El producto deberá:

1. Recibir fotografías, imágenes escaneadas o documentos de varias páginas.
2. Evaluar la calidad antes de consumir servicios externos de OCR o IA.
3. Mejorar de forma no destructiva las imágenes recuperables.
4. Segmentar cada página en bloques y procesar cada bloque según su tipo.
5. Transcribir contenido manuscrito e impreso, incluido contenido matemático.
6. Conservar la procedencia, geometría y nivel de certeza de cada resultado.
7. Señalar ambigüedades y permitir su validación humana.
8. Separar la transcripción literal de las correcciones y sugerencias.
9. Revisar ortografía, gramática y contenido académico mediante herramientas apropiadas.
10. Representar progresivamente ecuaciones, estructuras químicas, diagramas y gráficas como contenido editable.
11. Componer el contenido en un documento presentable.
12. Generar un entregable, inicialmente en PDF.

### 3.2. Alcance multidisciplinario

El modelo documental y la arquitectura DEBEN contemplar desde el inicio los siguientes tipos de contenido, aunque su automatización completa se entregue por etapas:

- Español y redacción.
- Matemáticas.
- Física y unidades.
- Biología y diagramas etiquetados.
- Química, ecuaciones y estructuras químicas.
- Ciencias generales.
- Mecánica y mecatrónica.
- Diagramas de flujo, circuitos y diagramas de bloques.
- Tablas y formularios.
- Gráficas con ejes, escalas, puntos o curvas.
- Imágenes que deban conservarse sin reconstrucción semántica.

Una página PUEDE contener varios tipos a la vez. El enrutamiento se realizará por bloque, no únicamente por documento o asignatura.

### 3.3. Primera versión utilizable

La primera versión priorizará un flujo completo y rápido para:

- Documentos en español con texto manuscrito.
- Contenido matemático mezclado con texto.
- Imágenes de calidad aceptable o recuperable.
- Transcripción progresiva por página.
- Revisión de ambigüedades.
- Corrección lingüística en español.
- Revisión académica inicial, especialmente matemática.
- Edición estructurada y composición básica.
- Exportación a PDF.
- Conservación de diagramas y gráficas como regiones visuales cuando todavía no puedan reconstruirse con certeza.

El modelo interno, las APIs y la persistencia no podrán impedir agregar los procesadores multidisciplinarios de las siguientes etapas.

### 3.4. Fuera del alcance inicial

No forman parte de la primera versión:

- Sustituir al alumno realizando automáticamente toda la tarea.
- Garantizar que una sugerencia de IA sea académicamente correcta sin validación.
- Vectorizar de forma completamente automática cualquier dibujo científico o técnico.
- Crear modelos tridimensionales a partir de dibujos.
- Colaboración simultánea en tiempo real entre varios usuarios.
- Aplicaciones móviles nativas.
- Exportación perfecta a todos los formatos ofimáticos.
- Sistemas institucionales complejos de calificación o gestión escolar.

## 4. Objetivos

| ID | Objetivo |
| --- | --- |
| OBJ-001 | Reducir sustancialmente el tiempo entre la captura del manuscrito y la obtención de un entregable digital. |
| OBJ-002 | Mantener fidelidad y trazabilidad entre imagen original, transcripción, edición humana y sugerencias automáticas. |
| OBJ-003 | Ofrecer una experiencia fluida con respuesta inmediata, progreso comprensible y resultados parciales útiles. |
| OBJ-004 | Detectar antes del OCR las capturas que no contienen información recuperable suficiente. |
| OBJ-005 | Permitir ampliar el producto a nuevas materias y tipos de contenido sin reemplazar el núcleo documental. |
| OBJ-006 | Convertir contenido reconocido en un documento editable y presentable, no solo en texto plano. |
| OBJ-007 | Proteger la privacidad de alumnos, incluidos menores de edad, y controlar el envío a proveedores externos. |
| OBJ-008 | Medir precisión, latencia, costo y esfuerzo de corrección para mejorar el sistema con evidencia. |

## 5. Usuarios y actores

| ID | Actor | Descripción |
| --- | --- | --- |
| ACT-001 | Alumno | Captura, transcribe, revisa, edita y exporta sus trabajos. |
| ACT-002 | Docente o revisor | Actor futuro que puede revisar contenido cuando el propietario lo autorice. |
| ACT-003 | Tutor | Actor futuro que acompaña al alumno con acceso autorizado. |
| ACT-004 | Operador | Supervisa trabajos, disponibilidad, costos y errores sin acceder innecesariamente al contenido. |
| ACT-005 | Administrador institucional | Actor futuro que gestiona miembros, límites y políticas de una organización. |
| ACT-006 | Proveedor OCR | Servicio externo encapsulado que reconoce uno o más tipos de contenido. |
| ACT-007 | Proveedor de IA | Servicio externo encapsulado que devuelve análisis o sugerencias estructuradas. |

## 6. Principios obligatorios

### 6.1. Fidelidad y capas separadas

El sistema DEBE distinguir siempre:

1. Archivo original.
2. Variantes de imagen procesadas.
3. Resultado original de cada proveedor.
4. Transcripción normalizada.
5. Ediciones del usuario.
6. Sugerencias lingüísticas o académicas.
7. Documento final exportado.

### 6.2. Incertidumbre visible

Una estimación de confianza no equivale a certeza. Los bloques dudosos DEBEN mostrarse como pendientes de revisión y conservar alternativas cuando existan.

### 6.3. Corrección bajo control humano

Ninguna sugerencia de IA, corrector lingüístico o validador especializado DEBE reemplazar silenciosamente el contenido del alumno.

### 6.4. Procesamiento proporcional

El sistema NO DEBE consumir OCR o IA de pago cuando una validación previa determine que la captura es irrecuperable. Debe explicar el problema y ofrecer recaptura, reemplazo o edición manual.

### 6.5. Rendimiento percibido transparente

La interfaz DEBE responder de inmediato mediante vistas previas locales, esqueletos, progreso y resultados parciales. Los placeholders DEBEN ser identificables y NO DEBEN presentarse como resultados reales o finalizados.

### 6.6. Extensibilidad por procesadores

Los proveedores y herramientas especializadas DEBEN integrarse mediante contratos desacoplados. El formato interno no dependerá de Mathpix Markdown, de un modelo de IA ni de un proveedor concreto.

## 7. Contexto del sistema

```text
Usuario
  │
  ▼
Aplicación web
  ├── validación local y vista previa inmediata
  ├── editor y revisión
  └── progreso por SSE
  │
  ▼
API de AlgeTra
  ├── identidad y autorización
  ├── documentos y versiones
  ├── trabajos y cuotas
  └── URLs firmadas para archivos
  │
  ├──────── PostgreSQL
  ├──────── almacenamiento de objetos
  └──────── cola de trabajos
               │
               ▼
            Workers
              ├── calidad y mejora de imagen
              ├── segmentación y clasificación
              ├── OCR especializado o general
              ├── revisión lingüística
              ├── validadores por disciplina
              ├── revisión con IA
              └── composición y exportación
```

## 8. Supuestos y dependencias

- El primer cliente será una aplicación web adaptable a escritorio y móvil.
- El usuario tendrá una conexión suficiente para cargar imágenes; el sistema deberá tolerar interrupciones recuperables.
- Mathpix será el OCR principal para contenido STEM, pero no el único adaptador permitido.
- La precisión variará por caligrafía, iluminación, idioma y disciplina.
- Los resultados de proveedores externos pueden demorarse, fallar o estar sujetos a cuotas.
- Las funciones académicas necesitarán contexto de materia, nivel, país o programa educativo para mejorar su pertinencia.
- El sistema procesará potencialmente datos de menores y deberá diseñarse bajo minimización y privacidad desde el origen.
- Las decisiones sobre proveedor de identidad, segundo OCR y proveedor de IA se tomarán mediante evaluación técnica, contractual y de privacidad.

## 9. Restricciones tecnológicas aprobadas

La línea base técnica es:

- **Frontend:** React, TypeScript y Vite.
- **Backend:** Python y FastAPI.
- **Persistencia:** PostgreSQL.
- **Archivos:** almacenamiento compatible con S3; MinIO en desarrollo local.
- **Procesamiento asíncrono inicial:** Celery y Redis.
- **OCR STEM:** adaptador de Mathpix.
- **Procesamiento de imagen:** OpenCV y scikit-image.
- **Revisión lingüística inicial:** LanguageTool.
- **Validación matemática y de unidades:** SymPy y Pint.
- **Edición matemática:** MathLive y KaTeX.
- **Editor estructurado:** Tiptap/ProseMirror, sin usar su formato como modelo canónico del dominio.
- **Diagramas de flujo:** React Flow como candidato de interfaz.
- **Gráficas:** Plotly.js como candidato de representación.
- **Exportación inicial:** HTML/CSS a PDF mediante Playwright/Chromium.
- **Contrato web-backend:** REST/OpenAPI y eventos de progreso mediante Server-Sent Events.

Astro podrá utilizarse en un futuro sitio público o documental, pero no será la base de la aplicación interactiva principal.

## 10. Reglas de negocio

| ID | Regla |
| --- | --- |
| RN-001 | El archivo original es inmutable; cualquier mejora crea un activo derivado. |
| RN-002 | Una captura con fallo crítico de calidad no se envía automáticamente a servicios facturables. |
| RN-003 | Si no es posible recapturar, el usuario puede conservar la página e introducir contenido manualmente sin presentarlo como OCR. |
| RN-004 | Toda transcripción y sugerencia debe registrar proveedor, versión, instante y región de origen cuando estén disponibles. |
| RN-005 | Las sugerencias nunca modifican el contenido sin una acción explícita del usuario. |
| RN-006 | La revisión académica se ejecuta sobre bloques validados o se marca expresamente que parte de una transcripción no confirmada. |
| RN-007 | Los placeholders y estimaciones de progreso no pueden confundirse con resultados finales. |
| RN-008 | Un bloque puede usar un procesador diferente del resto de la página. |
| RN-009 | Una figura no reconstruida debe conservarse visualmente en el documento final. |
| RN-010 | No se utilizará contenido del alumno para entrenamiento sin autorización explícita, específica y válida. |
| RN-011 | La exportación debe advertir sobre ambigüedades pendientes y exigir confirmación para continuar. |
| RN-012 | Los límites de páginas, tamaño, costo y concurrencia serán configurables y visibles antes de procesar. |

## 11. Requisitos funcionales resumidos

### 11.1. Cuenta y documentos

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-001 | Autenticar al usuario y mantener una sesión segura. | P0 |
| RF-002 | Restringir cada documento y activo a usuarios autorizados. | P0 |
| RF-003 | Crear, listar, abrir, renombrar y archivar documentos. | P0 |
| RF-004 | Mostrar el estado y asuntos pendientes de cada documento. | P0 |
| RF-005 | Eliminar un documento y programar la eliminación de sus activos según la política vigente. | P0 |

### 11.2. Captura y calidad

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-010 | Admitir imágenes y PDF dentro de límites configurables. | P0 |
| RF-011 | Permitir varias páginas, reordenarlas, sustituirlas o eliminarlas. | P0 |
| RF-012 | Mostrar una vista previa local antes de terminar la carga. | P0 |
| RF-013 | Evaluar calidad antes de invocar OCR o IA facturables. | P0 |
| RF-014 | Detectar al menos desenfoque, exposición, recorte, orientación, perspectiva y contraste insuficiente. | P0 |
| RF-015 | Explicar fallos críticos y solicitar recaptura o reemplazo. | P0 |
| RF-016 | Conservar el original inmutable y relacionar sus derivados. | P0 |
| RF-017 | Generar de forma no destructiva variantes apropiadas de mejora. | P0 |
| RF-018 | Seleccionar o comparar variantes sin ocultar la utilizada. | P0 |
| RF-019 | Detectar cargas duplicadas para evitar reprocesamiento y costo innecesario. | P1 |

### 11.3. Procesamiento documental y OCR

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-020 | Ejecutar el procesamiento pesado de forma asíncrona. | P0 |
| RF-021 | Segmentar páginas en bloques con geometría y orden de lectura. | P0 |
| RF-022 | Clasificar y enrutar bloques según tipo y contexto. | P0 |
| RF-023 | Integrar Mathpix mediante un adaptador reemplazable. | P0 |
| RF-024 | Permitir OCR general alternativo sin cambiar el modelo documental. | P1 |
| RF-025 | Conservar respuestas originales, procedencia y versiones de procesador. | P0 |
| RF-026 | Transformar resultados al modelo canónico sin tratar la confianza como garantía. | P0 |
| RF-027 | Publicar resultados parciales por página o bloque. | P0 |
| RF-028 | Reintentar trabajos idempotentes sin duplicar resultados ni cargos evitables. | P0 |
| RF-029 | Cancelar, reanudar o reprocesar dentro de las reglas del estado actual. | P1 |

### 11.4. Documento, revisión y versiones

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-030 | Representar el documento mediante un modelo canónico versionado. | P0 |
| RF-031 | Soportar estructuralmente desde P0 bloques de texto, matemáticas, tablas, figuras, diagramas, gráficas, química y campos; su edición especializada se habilitará por etapas. | P0/P1/P2 |
| RF-032 | Asociar cada bloque con página, región, recorte y procedencia. | P0 |
| RF-033 | Separar original, transcripción, edición y sugerencias. | P0 |
| RF-034 | Permitir editar, ordenar y reclasificar bloques autorizados. | P0 |
| RF-035 | Crear una cola navegable de ambigüedades. | P0 |
| RF-036 | Comparar cada bloque con su región de imagen. | P0 |
| RF-037 | Guardar automáticamente y crear versiones recuperables. | P0 |
| RF-038 | Permitir deshacer cambios y restaurar una versión. | P1 |
| RF-039 | Reprocesar una página o bloque sin reprocesar todo el documento. | P1 |

### 11.5. Revisión multidisciplinaria

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-040 | Proponer correcciones de ortografía, gramática y puntuación en español. | P0 |
| RF-041 | Usar glosarios y contexto para reducir falsos positivos lingüísticos. | P1 |
| RF-042 | Presentar sugerencias estructuradas que puedan aceptarse o rechazarse individualmente. | P0 |
| RF-043 | Validar matemáticas con herramientas deterministas cuando sea posible. | P0 |
| RF-044 | Validar magnitudes y unidades cuando el tipo de contenido lo permita. | P1 |
| RF-045 | Reconocer y validar estructuras químicas mediante un procesador especializado y revisión humana. | P2 |
| RF-046 | Manejar figuras en modos semántico, asistido o visual conservado. | P1 |
| RF-047 | Representar diagramas de flujo como nodos y conexiones editables. | P1 |
| RF-048 | Digitalizar gráficas mediante ejes, calibración y series editables. | P1 |
| RF-049 | Usar materia, nivel educativo y fuentes verificables para contextualizar revisiones académicas. | P1 |

### 11.6. Edición, composición y exportación

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-050 | Proporcionar un editor estructurado de bloques. | P0 |
| RF-051 | Aplicar tipografía, colores, alineación, espaciado y resaltado. | P0 |
| RF-052 | Configurar tamaño, orientación y márgenes de página. | P0 |
| RF-053 | Crear una portada con campos editables. | P0 |
| RF-054 | Insertar y completar campos rellenables. | P1 |
| RF-055 | Editar y renderizar matemáticas de forma legible. | P0 |
| RF-056 | Editar diagramas reconstruidos sin alterar el recorte original. | P1 |
| RF-057 | Editar datos y presentación de gráficas reconstruidas. | P1 |
| RF-058 | Mostrar asuntos pendientes antes de exportar. | P0 |
| RF-059 | Aplicar plantillas sin volver a ejecutar OCR. | P1 |
| RF-060 | Generar una vista previa paginada. | P0 |
| RF-061 | Exportar inicialmente a PDF. | P0 |
| RF-062 | Permitir exportar con advertencias solo tras confirmación explícita. | P0 |
| RF-063 | Registrar versión, plantilla y estado usados en cada exportación. | P0 |
| RF-064 | Añadir formatos accesibles u ofimáticos sin modificar el modelo canónico. | P2 |

### 11.7. Fluidez, comunicación y control de trabajos

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-070 | Confirmar inmediatamente cada acción iniciada por el usuario. | P0 |
| RF-071 | Comunicar fases reales con lenguaje claro y útil. | P0 |
| RF-072 | Actualizar progreso y estado sin requerir recarga manual. | P0 |
| RF-073 | Habilitar páginas o bloques tan pronto estén disponibles. | P0 |
| RF-074 | Permitir abandonar la vista y recuperar el estado posteriormente. | P0 |
| RF-075 | Identificar esqueletos, estimaciones y contenido todavía no confirmado. | P0 |
| RF-076 | Mostrar errores accionables, alcance afectado y siguiente acción recomendada. | P0 |
| RF-077 | Permitir cancelar o reintentar operaciones elegibles. | P1 |
| RF-078 | Evitar que el progreso mostrado retroceda sin explicación. | P0 |
| RF-079 | Notificar la finalización de trabajos prolongados según las preferencias del usuario. | P1 |

### 11.8. Seguridad, privacidad y operación

| ID | Requisito resumido | Prioridad |
| --- | --- | --- |
| RF-080 | Aplicar autorización en toda operación y URL de activo. | P0 |
| RF-081 | Informar qué categorías de datos se envían a proveedores externos. | P0 |
| RF-082 | Aplicar políticas configurables de retención y eliminación. | P0 |
| RF-083 | Mantener secretos exclusivamente en componentes seguros del servidor. | P0 |
| RF-084 | Registrar eventos de procedencia y auditoría relevantes. | P0 |
| RF-085 | Recabar autorización explícita antes de cualquier uso para entrenamiento. | P0 |
| RF-086 | Proteger datos en tránsito y en reposo. | P0 |
| RF-087 | Evitar contenido sensible en registros y telemetría. | P0 |
| RF-088 | Aislar datos entre usuarios y futuras organizaciones. | P0 |
| RF-089 | Aplicar cuotas, límites de costo y controles operativos. | P0 |

## 12. Requisitos no funcionales resumidos

Los valores son objetivos iniciales y deberán verificarse con una carga de referencia documentada. Ninguna optimización de percepción permite incumplir exactitud, transparencia o seguridad.

### 12.1. Rendimiento y capacidad

| ID | Requisito resumido |
| --- | --- |
| RNF-PER-001 | La interfaz dará retroalimentación visual a una acción local en ≤100 ms p95. |
| RNF-PER-002 | Las APIs ligeras responderán en ≤500 ms p95, excluyendo transferencia y proveedores externos. |
| RNF-PER-003 | La primera evaluación de calidad de una página típica se mostrará en ≤1.5 s p95 en el dispositivo de referencia. |
| RNF-PER-004 | La carga mostrará miniatura local y progreso sin bloquear la interfaz. |
| RNF-PER-005 | Un trabajo aceptado comenzará procesamiento interno en ≤1 s p95 bajo carga normal. |
| RNF-PER-006 | Una página típica tendrá un primer resultado útil objetivo en ≤8 s p50 y ≤15 s p95, sujeto a la dependencia externa medida. |
| RNF-PER-007 | El cliente recibirá cambios de estado activos al menos cada 2 s o un latido equivalente. |
| RNF-PER-008 | La edición mantendrá latencia de entrada ≤100 ms p95 en documentos dentro del límite de referencia. |
| RNF-PER-009 | El autoguardado se iniciará en ≤2 s tras una pausa y confirmará persistencia en ≤5 s p95. |
| RNF-PER-010 | Un PDF de referencia de hasta 10 páginas se generará en ≤15 s p95 bajo carga normal. |
| RNF-CAP-001 | Los límites de páginas, tamaño y concurrencia serán configurables sin despliegue de código. |
| RNF-CAP-002 | Los workers podrán escalar horizontalmente por tipo de carga. |
| RNF-CAP-003 | El sistema aplicará contrapresión antes de degradarse de manera no controlada. |

### 12.2. Fiabilidad y disponibilidad

| ID | Requisito resumido |
| --- | --- |
| RNF-REL-001 | Disponibilidad mensual inicial objetivo de 99.5 % para componentes propios. |
| RNF-REL-002 | PostgreSQL será la fuente durable del estado del trabajo; Redis no será la única fuente. |
| RNF-REL-003 | Los pasos facturables serán idempotentes o estarán protegidos contra duplicación. |
| RNF-REL-004 | Una interrupción del cliente no perderá un trabajo ya confirmado por el servidor. |
| RNF-REL-005 | Los fallos parciales se aislarán por página o bloque cuando sea posible. |
| RNF-REL-006 | Se definirán copias de seguridad con RPO inicial ≤24 h y RTO ≤8 h antes de producción. |

### 12.3. Seguridad y privacidad

| ID | Requisito resumido |
| --- | --- |
| RNF-SEC-001 | Todo acceso se autenticará y autorizará en el servidor. |
| RNF-SEC-002 | Se utilizará TLS para comunicaciones y cifrado administrado para datos persistentes. |
| RNF-SEC-003 | Las URLs firmadas tendrán privilegio mínimo y expiración corta. |
| RNF-SEC-004 | Dependencias, imágenes y archivos se validarán y analizarán antes de procesos sensibles. |
| RNF-SEC-005 | Las acciones sensibles generarán auditoría protegida contra alteración ordinaria. |
| RNF-PRI-001 | Se minimizarán datos y tiempos de retención, considerando que puede haber menores. |
| RNF-PRI-002 | El usuario podrá solicitar eliminación y conocer su estado. |
| RNF-PRI-003 | La telemetría de producto no contendrá por defecto el contenido del documento. |
| RNF-PRI-004 | Cada proveedor se evaluará por residencia, retención, entrenamiento y controles contractuales. |

### 12.4. Usabilidad, accesibilidad y transparencia

| ID | Requisito resumido |
| --- | --- |
| RNF-USA-001 | Los flujos principales cumplirán WCAG 2.2 nivel AA en la medida aplicable. |
| RNF-USA-002 | No se dependerá exclusivamente de color para comunicar estado o ambigüedad. |
| RNF-USA-003 | Todo estado prolongado explicará qué ocurre y qué puede hacer el usuario. |
| RNF-USA-004 | El sistema no presentará resultados simulados como reales. |
| RNF-USA-005 | El usuario podrá usar teclado en los flujos esenciales del editor y revisión. |

### 12.5. Mantenibilidad, portabilidad y observabilidad

| ID | Requisito resumido |
| --- | --- |
| RNF-MAN-001 | El núcleo será un monolito modular con límites y contratos explícitos. |
| RNF-MAN-002 | Los adaptadores de proveedores podrán sustituirse mediante interfaces y pruebas de contrato. |
| RNF-MAN-003 | El modelo documental y los eventos tendrán versión y migraciones compatibles. |
| RNF-MAN-004 | Los cambios críticos requerirán pruebas automatizadas y trazabilidad a requisitos. |
| RNF-POR-001 | Los servicios se empaquetarán en contenedores y no dependerán de estado local efímero. |
| RNF-POR-002 | El almacenamiento de objetos utilizará una abstracción compatible con S3. |
| RNF-OBS-001 | Cada petición y trabajo tendrá un identificador de correlación de extremo a extremo. |
| RNF-OBS-002 | Se medirán latencia, colas, fallos, precisión aproximada, costo y correcciones humanas. |
| RNF-OBS-003 | Se alertará sobre saturación, errores, cuotas y degradación de proveedores. |

### 12.6. Calidad del reconocimiento

| ID | Requisito resumido |
| --- | --- |
| RNF-QLT-001 | Cada procesador se evaluará por tipo de contenido, no con una precisión global única. |
| RNF-QLT-002 | La puerta de calidad medirá falsos rechazos y capturas críticas que escaparon. |
| RNF-QLT-003 | Cada resultado conservará el linaje necesario para reproducir o explicar su generación. |
| RNF-QLT-004 | Ningún procesador especializado se habilitará por defecto sin benchmark y umbral aprobado. |

## 13. Interfaces externas

### 13.1. Interfaz de usuario

La aplicación será web adaptable. Los flujos P0 deberán ser utilizables en escritorio y navegadores móviles modernos. La captura móvil podrá usar la cámara del navegador, pero no dependerá de una aplicación nativa.

### 13.2. Interfaz API

- REST sobre HTTPS.
- Contrato OpenAPI versionado.
- Errores estructurados con código, mensaje seguro, alcance y posibilidad de reintento.
- Server-Sent Events para progreso; consulta periódica como respaldo.
- Operaciones mutables protegidas mediante controles de concurrencia o versión.

### 13.3. Archivos

La primera versión deberá aceptar, como mínimo, JPEG, PNG y PDF. WebP podrá aceptarse si se normaliza antes de enviarlo a proveedores incompatibles. Los límites exactos serán configurables y visibles en la interfaz.

Los archivos se cargarán preferentemente mediante URLs firmadas y carga directa al almacenamiento de objetos. El backend conservará metadatos, hashes y relaciones, no el binario dentro de PostgreSQL.

### 13.4. Proveedores

- Mathpix para OCR STEM y estructura documental.
- Un contrato de OCR general preparado para una segunda implementación.
- LanguageTool para revisión lingüística inicial.
- Un contrato independiente de proveedor para IA generativa o multimodal.
- Integraciones futuras para química, gráficas y diagramas.

## 14. Modelo conceptual de información

El sistema administrará al menos:

- Usuarios, espacios y membresías.
- Documentos y páginas.
- Activos originales y derivados.
- Evaluaciones de calidad.
- Trabajos, pasos, intentos y eventos.
- Resultados originales de proveedores.
- Bloques canónicos y sus coordenadas.
- Versiones y revisiones.
- Ambigüedades y decisiones del usuario.
- Sugerencias lingüísticas y académicas.
- Plantillas, estilos y exportaciones.
- Consumo, costo estimado y auditoría.

Los documentos estructurados podrán usar `JSONB`, pero se dividirán por unidades manejables —por ejemplo, página, versión o bloque— para evitar que toda edición bloquee una fila excesivamente grande.

## 15. Estados principales

### 15.1. Documento

```text
borrador
  → validando_calidad
  → requiere_recaptura | listo_para_cargar
  → cargando
  → en_procesamiento
  → requiere_revision
  → en_edicion
  → listo_para_exportar
  → exportado
```

Un documento también puede estar `parcialmente_procesado`, `cancelado`, `archivado` o `con_error`. El estado visible se derivará de estados internos más específicos y no ocultará qué páginas fallaron.

### 15.2. Página

```text
local
  → evaluando
  → rechazada_calidad | aceptada
  → cargada
  → preprocesando
  → segmentando
  → transcribiendo
  → parcial
  → requiere_revision | validada
```

### 15.3. Sugerencia

```text
pendiente → aceptada | rechazada | editada | obsoleta
```

## 16. Estrategia de experiencia y rendimiento

La experiencia rápida se logrará mediante trabajo real anticipado y comunicación, no mediante resultados falsos:

1. Crear miniaturas y detectar problemas básicos en el dispositivo.
2. Confirmar la acción dentro de 100 ms con estado visual.
3. Cargar directamente a almacenamiento y mostrar bytes transferidos.
4. Procesar páginas en paralelo con límites controlados.
5. Mostrar primero la página o bloque terminado, sin esperar todo el documento.
6. Mantener tareas costosas fuera del hilo de interfaz y de la petición HTTP.
7. Permitir continuar editando o abandonar la vista mientras se procesa.
8. Recuperar el estado al reconectar.
9. Usar esqueletos con dimensiones estables para evitar saltos visuales.
10. Presentar fases reales; solo mostrar tiempos estimados cuando exista suficiente información histórica.

La estrategia completa se define en [Rendimiento y experiencia percibida](./09-rendimiento-y-experiencia.md).

## 17. Validación y criterios globales de aceptación

La aceptación del producto requerirá:

1. Pruebas automatizadas vinculadas a los requisitos críticos.
2. Un conjunto de evaluación representativo y anonimizado con:
   - Español manuscrito.
   - Matemáticas.
   - Tinta y lápiz tenue.
   - Iluminación desigual.
   - Tablas.
   - Diagramas y gráficas.
   - Muestras futuras de química y ciencias.
3. Medición separada por tipo de bloque y disciplina.
4. Pruebas de usabilidad del flujo de recaptura y revisión.
5. Pruebas de carga de archivos y trabajos concurrentes.
6. Simulación de demora, cuota y caída de proveedores.
7. Verificación de aislamiento, eliminación y trazabilidad.

Métricas mínimas a observar:

- Tiempo hasta primera respuesta visual.
- Tiempo hasta primer resultado útil.
- Tiempo total hasta exportación.
- Tasa de capturas rechazadas correctamente.
- Tasa de capturas irrecuperables enviadas por error a OCR.
- Error de caracteres y palabras para texto.
- Exactitud estructural y equivalencia para matemáticas.
- Cantidad de ambigüedades detectadas y omitidas.
- Porcentaje de contenido corregido manualmente.
- Éxito de exportación.
- Costo por página y por documento terminado.

## 18. Evolución prevista

### Corto plazo

- Flujo web completo de carga a PDF.
- Calidad y mejora de imagen.
- Español y matemáticas.
- Modelo documental extensible.
- Procesamiento progresivo.
- Métricas y control de costo.
- Diagramas y gráficas preservados con etiquetas cuando sea posible.

### Mediano plazo

- Segundo OCR y enrutamiento basado en evidencia.
- Reconstrucción asistida de diagramas de flujo y gráficas.
- Validación de unidades y procesadores científicos.
- Química con SMILES y herramientas especializadas.
- Contexto educativo y fuentes verificables.
- Organizaciones educativas y políticas por espacio.
- Orquestación durable para flujos complejos si las métricas justifican migrar desde Celery.
- Workers especializados o GPU cuando un procesador lo requiera.

## 19. Riesgos principales

| Riesgo | Tratamiento requerido |
| --- | --- |
| Escritura o fotografía irrecuperable | Control previo, explicación concreta y recaptura sin costo de OCR. |
| Preprocesamiento que elimina símbolos | Variantes no destructivas, comparación y original siempre disponible. |
| Confundir error del OCR con error del alumno | Validar transcripción antes de revisión académica y mostrar procedencia. |
| Alucinación de IA | Sugerencias separadas, validadores deterministas, fuentes y confirmación humana. |
| Diagramas incorrectamente conectados | Reconstrucción asistida y comparación visual obligatoria. |
| Experiencia lenta por proveedores | Resultados parciales, colas, comunicación, fallback y medición por proveedor. |
| Costos impredecibles | Calidad previa, hashes, idempotencia, cuotas, caché y telemetría de consumo. |
| Dependencia de Mathpix | Adaptador, respuesta original preservada y modelo canónico independiente. |
| Exposición de datos de menores | Minimización, autorización, retención, cifrado y evaluación contractual. |
| Crecimiento prematuro en complejidad | Monolito modular y separación solo por cuellos de botella medidos. |

## 20. Decisiones abiertas

| ID | Decisión | Momento límite |
| --- | --- | --- |
| DA-001 | Proveedor de identidad compatible con OIDC. | Antes de implementar autenticación. |
| DA-002 | Segundo OCR para español y texto general, tras benchmark. | Antes del piloto ampliado. |
| DA-003 | Proveedor o modelos de IA y política de residencia. | Antes de revisión con IA en producción. |
| DA-004 | Límites iniciales por archivo, páginas y plan. | Antes de pruebas con usuarios. |
| DA-005 | Política exacta de retención y eliminación. | Antes de almacenar datos reales. |
| DA-006 | País, currículo y nivel educativo iniciales. | Antes de revisión académica contextual. |
| DA-007 | Estrategia de notificaciones fuera de la aplicación. | Antes de trabajos prolongados en producción. |
| DA-008 | Herramienta final para edición genérica de diagramas. | Antes de RF-046/RF-047. |

## 21. Documentos derivados

- [PRD — Documento de requisitos de producto](./04-prd.md)
- [Requisitos funcionales](./05-requisitos-funcionales.md)
- [Requisitos no funcionales](./06-requisitos-no-funcionales.md)
- [Casos de uso](./07-casos-de-uso.md)
- [Arquitectura y tecnologías](./08-arquitectura-y-tecnologias.md)
- [Rendimiento y experiencia percibida](./09-rendimiento-y-experiencia.md)
- [Matriz de trazabilidad](./10-matriz-de-trazabilidad.md)
- [Auditoría de consistencia](./11-auditoria-de-consistencia.md)
