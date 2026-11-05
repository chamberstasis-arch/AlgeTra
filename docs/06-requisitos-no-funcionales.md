# Catálogo de requisitos no funcionales

> **Versión:** 0.1  
> **Estado:** normativo; forma parte de la [ERS](./03-ers-especificacion-de-requisitos.md)  
> **Fecha:** 2026-10-03

## 1. Propósito

Este documento convierte los atributos de calidad de AlgeTra en objetivos medibles. Un resultado correcto que llega demasiado tarde no satisface el producto; una respuesta rápida que inventa contenido, pierde trabajo o expone datos tampoco lo satisface.

Los percentiles se calcularán sobre ventanas con volumen suficiente y se segmentarán por tipo de operación, tamaño de documento, dispositivo y proveedor. Los promedios no sustituyen p95 o p99.

## 2. Carga y entorno de referencia

Hasta disponer de telemetría real, las pruebas utilizarán como referencia:

- **Documento típico:** 1 a 10 páginas.
- **Página típica:** JPEG o PNG, entre 1600 y 3000 píxeles en su lado mayor y hasta 5 MB después de preparación para carga.
- **PDF típico:** hasta 10 páginas y 30 MB.
- **Dispositivo de escritorio:** cuatro núcleos lógicos, 8 GB de RAM y navegador Chromium vigente.
- **Dispositivo móvil:** equipo de gama media vigente con al menos 4 GB de RAM.
- **Red de prueba:** latencia de 50 ms y 10 Mbps de subida, además de perfiles degradados.
- **Carga normal de backend:** utilización sostenida menor al 70 % y cola sin saturación declarada.
- **Dependencias externas saludables:** dentro de su envolvente de latencia observada y sin cuota agotada.

Los límites comerciales finales serán configurables. Superar esta referencia no implica rechazar automáticamente el documento, pero puede cambiar el SLO comunicado.

## 3. Rendimiento

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-PER-001 | Una acción local debe producir retroalimentación visual en **≤100 ms p95**. | Instrumentación de interacción a siguiente pintura; pruebas en dispositivos de referencia. |
| RNF-PER-002 | Una API ligera propia debe responder en **≤500 ms p95** y **≤1 s p99**, sin contar carga binaria ni terceros. | Métrica servidor de recepción a respuesta; separar autenticación, listado, edición y estado. |
| RNF-PER-003 | La primera evaluación de calidad de una página típica debe mostrarse en **≤1.5 s p95**. | Medición desde selección o captura hasta primer diagnóstico; ejecución fuera del hilo principal cuando corresponda. |
| RNF-PER-004 | La miniatura local debe aparecer en **≤300 ms p95** y la carga no debe bloquear la interfaz más de 50 ms continuos. | Performance API, long tasks y pruebas de interacción durante carga. |
| RNF-PER-005 | Un trabajo confirmado debe iniciar un primer paso interno en **≤1 s p95** bajo carga normal. | Diferencia entre `accepted_at` y `first_started_at`; excluir trabajos deliberadamente programados. |
| RNF-PER-006 | Una página típica debe producir un primer resultado útil en **≤8 s p50** y **≤15 s p95** cuando el proveedor esté saludable. | Medición extremo a extremo y medición separada del proveedor; resultado útil significa un bloque real visible, no un placeholder. |
| RNF-PER-007 | Durante un estado activo, el cliente debe recibir un cambio o latido al menos cada **2 s**. | Eventos SSE y fallback; alertar silencios superiores al umbral salvo suspensión de red detectada. |
| RNF-PER-008 | Escritura, selección y operaciones básicas del editor deben responder en **≤100 ms p95** en un documento típico. | Pruebas de entrada y render; virtualizar contenido fuera de vista cuando sea necesario. |
| RNF-PER-009 | El autoguardado debe iniciar en **≤2 s** después de una pausa y confirmar persistencia en **≤5 s p95**. | Medir último cambio, envío y versión durable; los reintentos no deben bloquear edición. |
| RNF-PER-010 | Un PDF típico de hasta 10 páginas debe generarse en **≤15 s p95** bajo carga normal. | Medición desde solicitud aceptada hasta activo disponible; separar espera en cola y render. |

### 3.1. Presupuesto orientativo de latencia para una página

| Fase | Objetivo inicial | Comportamiento visible |
| --- | --- | --- |
| Confirmación local | 0–100 ms | Miniatura o tarjeta de página y estado “validando”. |
| Calidad local inicial | ≤1.5 s p95 | Aceptada, advertencia o recaptura requerida. |
| Preparación y solicitud de carga | ≤500 ms adicionales | Barra de bytes reales. |
| Confirmación del servidor | ≤500 ms después de metadatos | Identificador durable del trabajo. |
| Inicio del worker | ≤1 s p95 | Estado de fase actualizado. |
| Primer bloque OCR | Objetivo ≤15 s p95 total | Bloque real habilitado y marcado como parcial. |

Este presupuesto no autoriza completar una barra con progreso inventado. Cuando una fase externa no exponga porcentaje, se usará estado indeterminado, tiempo transcurrido y páginas terminadas.

## 4. Capacidad y escalabilidad

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-CAP-001 | Límites de tamaño, páginas, concurrencia y consumo deben cambiarse mediante configuración, no despliegue. | Cambiar una política en un entorno de prueba y verificar validación/UI/API. |
| RNF-CAP-002 | Los workers deben escalar horizontalmente por cola o tipo de recurso. | Añadir réplicas y demostrar aumento de throughput sin duplicar tareas. |
| RNF-CAP-003 | El sistema debe aplicar contrapresión y admisión controlada antes de agotar recursos. | Prueba de carga que alcance límites; verificar `429` o cola controlada, estimación honesta y recuperación. |

### 4.1. Estrategia de corto plazo

- Monolito modular para API y dominio.
- Procesos de worker independientes con colas para imagen, OCR, revisión y exportación.
- Redis como broker inicial y apoyo de caché, nunca como única fuente durable.
- PostgreSQL para estado, idempotencia, cuotas y auditoría.
- Carga directa a almacenamiento de objetos.
- Autoescalado de contenedores donde la plataforma lo permita.

### 4.2. Estrategia de mediano plazo

- Separar workers por perfil: CPU, I/O externo, navegador y GPU.
- Evaluar Temporal cuando los flujos ramificados, pausas, callbacks y compensaciones superen la mantenibilidad de Celery.
- Utilizar el procesamiento masivo de Mathpix solo para cargas que no requieran latencia interactiva.
- Incorporar réplicas de lectura, PgBouncer o particionamiento únicamente al demostrar el cuello de botella.
- Evitar Kubernetes, Kafka o microservicios por disciplina sin una necesidad operativa medida.

## 5. Fiabilidad y recuperación

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-REL-001 | Los componentes propios tendrán disponibilidad mensual objetivo de **99.5 %** en la etapa inicial. | Monitoreo sintético y de servidor; reportar dependencias externas por separado y también su impacto al usuario. |
| RNF-REL-002 | PostgreSQL será la fuente durable del estado de documentos y trabajos. | Reiniciar Redis y workers; recuperar estado y continuar o reintentar desde un punto seguro. |
| RNF-REL-003 | Los pasos facturables serán idempotentes o estarán protegidos contra duplicación. | Reentregar mensajes, repetir callbacks y simular timeout después de enviar al proveedor. |
| RNF-REL-004 | Cerrar o perder la conexión del navegador no debe perder un trabajo confirmado. | Interrumpir cliente después de aceptación y verificar recuperación desde otro inicio de sesión autorizado. |
| RNF-REL-005 | Un fallo parcial se aislará por página o bloque cuando sea técnicamente posible. | Forzar fallo en una página y verificar disponibilidad de resultados sanos y reintento acotado. |
| RNF-REL-006 | Antes de producción existirán copias de seguridad con **RPO ≤24 h** y procedimiento probado con **RTO ≤8 h**. | Ejercicio de restauración documentado; medir pérdida máxima y tiempo efectivo. |

### 5.1. Semántica de entrega

Las tareas podrán ejecutarse más de una vez por la semántica de la cola. Por ello, los consumidores deben asumir entrega “al menos una vez”, usar claves de idempotencia y confirmar mensajes solo después de persistir un resultado consistente.

### 5.2. Degradación controlada

Si falla:

- **LanguageTool:** se conserva edición y OCR; la revisión lingüística queda reintentable.
- **IA:** se conserva transcripción; no se bloquea exportación salvo regla explícita.
- **Mathpix:** se mantienen original y derivados; se ofrece reintento o ruta alternativa disponible.
- **SSE:** el cliente usa consulta periódica y muestra conectividad degradada.
- **Exportador:** el documento sigue editable y el trabajo de exportación se puede reintentar.

## 6. Seguridad

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-SEC-001 | Toda lectura o mutación privada debe autenticarse y autorizarse en servidor. | Pruebas de autorización horizontal/vertical y revisión de rutas, eventos y objetos. |
| RNF-SEC-002 | Comunicaciones usarán TLS y datos persistentes usarán cifrado administrado. | Inspección de configuración, políticas de bucket, base de datos y proveedor. |
| RNF-SEC-003 | Las URLs firmadas tendrán alcance mínimo, tipo de operación y expiración corta. | Intentar reutilización, operación contraria, acceso después de expirar y cambio de clave. |
| RNF-SEC-004 | Archivos, nombres, MIME y contenido se validarán antes de procesos sensibles. | Casos con extensión falsa, archivos dañados, cargas excesivas, PDF hostil y rutas manipuladas. |
| RNF-SEC-005 | Eventos sensibles tendrán auditoría con acceso restringido y protección contra edición ordinaria. | Verificar creación, autorización, integridad, retención y ausencia de secretos. |

Controles mínimos adicionales:

- Protección CSRF cuando el mecanismo de sesión lo requiera.
- Limitación de tasa por identidad, IP y operación sensible.
- Política de contenido y sanitización para HTML generado o pegado.
- Ejecución aislada del navegador de exportación, sin acceso irrestricto a red o sistema.
- Dependencias escaneadas y actualizadas mediante política documentada.
- Rotación de secretos sin reconstruir la aplicación cliente.

## 7. Privacidad

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-PRI-001 | Se minimizarán datos y retención considerando información de menores. | Inventario de datos y justificación por campo/activo; revisión previa a producción. |
| RNF-PRI-002 | El usuario podrá solicitar eliminación y consultar su estado. | Prueba extremo a extremo sobre base, objetos, caché y trabajos; documentar tratamiento de backups. |
| RNF-PRI-003 | La telemetría no contendrá por defecto texto, imágenes ni ecuaciones del usuario. | Muestreo automatizado y manual de logs, trazas, errores y analítica. |
| RNF-PRI-004 | Cada proveedor será evaluado por residencia, retención, entrenamiento y contrato. | Registro de evaluación aprobado antes de habilitarlo con datos reales. |

Principios aplicables:

- Consentimiento específico, no agrupado con términos innecesarios.
- Prohibición predeterminada de entrenamiento con trabajos.
- Separación entre telemetría operativa y contenido académico.
- Datos sintéticos o anonimizados para pruebas siempre que sea posible.
- Acceso de soporte excepcional, temporal, autorizado y auditable.

## 8. Usabilidad, accesibilidad y transparencia

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-USA-001 | Los flujos principales deben cumplir WCAG 2.2 AA en la medida aplicable. | Auditoría automática y manual de teclado, foco, nombres, contraste, ampliación y lector de pantalla. |
| RNF-USA-002 | Color no será el único medio para expresar estado, error o ambigüedad. | Revisión monocromática y con simuladores; verificar icono/texto/semántica. |
| RNF-USA-003 | Todo estado prolongado debe explicar fase y acciones disponibles. | Pruebas de contenido para cada estado y demora simulada. |
| RNF-USA-004 | Ningún resultado simulado debe presentarse como reconocido o corregido. | Revisión de esqueletos, demos, estados vacíos y exportación; placeholders no forman parte del modelo. |
| RNF-USA-005 | Los flujos esenciales deben ser operables con teclado. | Recorrer captura mediante selector, revisión, aceptación/rechazo y exportación sin ratón. |

### 8.1. Lenguaje de estado

Los mensajes deben:

- Nombrar la acción real: “validando iluminación”, no “haciendo magia”.
- Evitar tecnicismos del proveedor.
- Indicar alcance: “página 2 de 5”.
- Distinguir espera normal de error.
- Ofrecer una salida: continuar, reemplazar, reintentar, cancelar o volver después.

### 8.2. Movimiento y estabilidad

- Los esqueletos reservarán espacio para evitar cambios bruscos de diseño.
- Las animaciones respetarán `prefers-reduced-motion`.
- El foco no se moverá automáticamente al llegar un resultado parcial si interrumpe al usuario.
- El progreso no utilizará ciclos visuales que sugieran un porcentaje inexistente.

## 9. Mantenibilidad y pruebas

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-MAN-001 | El núcleo debe conservar límites de monolito modular. | Revisión de dependencias entre módulos y prohibición de acceso directo no autorizado a persistencia ajena. |
| RNF-MAN-002 | Proveedores deben implementarse mediante interfaces y pruebas de contrato. | Sustituir por un fake y ejecutar flujo; validar traducción de errores y resultados. |
| RNF-MAN-003 | Modelo documental, API y eventos deben tener versión y migraciones. | Abrir fixtures de versiones anteriores y ejecutar migración sin pérdida de procedencia. |
| RNF-MAN-004 | Cambios críticos deben incluir pruebas y trazabilidad. | CI verifica unitarias, integración, contrato y enlace a requisito o decisión. |

Objetivos de cobertura se aplicarán por riesgo, no como un único porcentaje engañoso:

- Dominio, autorización, idempotencia y transformaciones: cobertura de ramas alta y casos de propiedad cuando sean útiles.
- Adaptadores: pruebas de contrato con fixtures versionados.
- Flujos P0: pruebas end-to-end de camino feliz y fallos principales.
- Procesamiento de imagen: conjunto dorado y métricas, no solo snapshots visuales.
- IA: evaluaciones reproducibles, esquema estricto y pruebas de rechazo.

## 10. Portabilidad

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-POR-001 | Servicios deben empaquetarse en contenedores y usar almacenamiento externo para estado durable. | Recrear contenedor sin pérdida; desplegar API y worker desde la misma imagen o artefactos compatibles. |
| RNF-POR-002 | Archivos deben accederse mediante una abstracción compatible con S3. | Ejecutar pruebas contra MinIO y un servicio gestionado seleccionado. |

La aplicación web deberá soportar las dos versiones principales vigentes de Chromium, Firefox y Safari en el momento de cada lanzamiento. Capacidades de cámara se mejorarán progresivamente; el selector de archivos seguirá disponible.

## 11. Observabilidad

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-OBS-001 | Peticiones, trabajos, pasos y llamadas externas deben compartir correlación. | Trazar una página desde carga hasta exportación sin buscar por contenido personal. |
| RNF-OBS-002 | Se medirán latencia, cola, errores, consumo, costo y señales de calidad. | Paneles con p50/p95/p99 y dimensiones controladas por etapa/proveedor/tipo. |
| RNF-OBS-003 | Existirán alertas sobre saturación, errores, cuotas y degradación externa. | Pruebas sintéticas o simulaciones que disparen y resuelvan cada alerta crítica. |

Telemetría mínima por trabajo:

- Instante de aceptación, inicio y fin por paso.
- Intentos y causa normalizada de fallo.
- Tamaño y número de páginas.
- Procesador y versión.
- Tokens, páginas o unidad facturable cuando corresponda.
- Costo estimado sin incluir contenido.
- Resultado de calidad y si se solicitó recaptura.
- Número de ambigüedades y correcciones, de forma agregada.

## 12. Calidad del reconocimiento

| ID | Objetivo normativo | Método de verificación |
| --- | --- | --- |
| RNF-QLT-001 | Cada procesador debe evaluarse por tipo de contenido, no con una única precisión global. | Reportar CER/WER, equivalencia matemática u otra métrica apropiada por categoría. |
| RNF-QLT-002 | La puerta de calidad debe medir falsos rechazos y capturas críticas que escaparon. | Conjunto etiquetado y matriz de confusión por defecto de imagen. |
| RNF-QLT-003 | Todo resultado debe ser reproducible respecto de archivo, transformación y versión conocida. | Seleccionar un bloque y reconstruir su linaje; si el proveedor es no determinista, registrar esa limitación. |
| RNF-QLT-004 | Ningún nuevo procesador especializado se habilitará por defecto sin benchmark y umbral aprobado. | Documento de evaluación, costo, latencia, privacidad y criterio de fallback. |

Las metas numéricas de exactitud se fijarán después del primer benchmark para evitar un objetivo arbitrario. Hasta entonces, una función no podrá declararse “confiable” solo por la puntuación reportada por un proveedor.

## 13. Conflictos y orden de prioridad

Cuando dos atributos compitan, se aplicará este orden salvo decisión registrada:

1. Seguridad y privacidad.
2. Integridad y fidelidad de datos.
3. Transparencia de estado.
4. Disponibilidad y recuperación.
5. Rendimiento real y percibido.
6. Costo.
7. Conveniencia visual.

Ejemplo: no se mostrará una transcripción inventada para cumplir RNF-PER-006; se mostrará un esqueleto honesto y una fase real.
