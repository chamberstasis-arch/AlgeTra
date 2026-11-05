# Catálogo de requisitos funcionales

> **Versión:** 0.1  
> **Estado:** normativo; forma parte de la [ERS](./03-ers-especificacion-de-requisitos.md)  
> **Fecha:** 2026-10-03

## 1. Uso del catálogo

Cada requisito contiene una condición verificable. Las prioridades significan:

- **P0:** primera versión utilizable.
- **P1:** incremento siguiente.
- **P2:** especialización posterior.

Un requisito solo se considerará terminado cuando cumpla sus criterios de aceptación, tenga pruebas apropiadas y conserve la trazabilidad indicada en la [matriz](./10-matriz-de-trazabilidad.md).

## 2. Cuenta y documentos

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-001 | P0 | El sistema DEBE autenticar al usuario y mantener una sesión segura. | Las rutas privadas rechazan sesiones ausentes o inválidas; cerrar sesión invalida el acceso; la expiración se maneja sin perder ediciones locales pendientes. |
| RF-002 | P0 | El sistema DEBE restringir documentos y activos a usuarios autorizados. | Cambiar un identificador no permite acceder a recursos ajenos; la autorización se valida en servidor y en URLs firmadas. |
| RF-003 | P0 | El usuario DEBE poder crear, listar, abrir, renombrar y archivar documentos. | Cada operación persiste, se refleja al recargar y solo afecta al documento seleccionado. |
| RF-004 | P0 | El listado DEBE mostrar estado, progreso útil y asuntos pendientes. | Se distinguen borrador, proceso, revisión, error y exportado; el usuario puede llegar al asunto pendiente desde el listado. |
| RF-005 | P0 | El usuario DEBE poder solicitar la eliminación de un documento y sus activos. | La interfaz confirma alcance; el documento deja de estar disponible; la eliminación física sigue la política y muestra su estado. |

## 3. Captura, carga y calidad

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-010 | P0 | El sistema DEBE admitir JPEG, PNG y PDF dentro de límites configurables y visibles. | Los formatos válidos se aceptan; formato o límite inválido se rechaza antes de procesar y se explica cómo corregirlo. |
| RF-011 | P0 | El usuario DEBE poder cargar varias páginas, ordenarlas, rotarlas, sustituirlas o eliminarlas antes de confirmar. | La numeración y vista previa reflejan cada cambio; el orden confirmado es el utilizado por el procesamiento. |
| RF-012 | P0 | La aplicación DEBE mostrar una miniatura local antes de completar la carga. | Al seleccionar una imagen válida aparece una vista previa sin esperar una respuesta del servidor; se identifica como pendiente de carga. |
| RF-013 | P0 | El sistema DEBE evaluar la calidad antes de invocar servicios facturables de OCR o IA. | Una página no puede entrar al paso facturable sin evaluación registrada; los fallos críticos siguen RF-015. |
| RF-014 | P0 | La evaluación DEBE detectar señales de desenfoque, exposición extrema, página recortada, orientación, perspectiva y contraste insuficiente. | Cada señal produce estado, severidad y explicación; las pruebas incluyen casos positivos y negativos por defecto. |
| RF-015 | P0 | Ante calidad irrecuperable, el sistema DEBE detener el procesamiento automático y solicitar recaptura o reemplazo. | No se crea una llamada facturable; se muestra el defecto y una instrucción concreta; se puede sustituir la página o conservarla para edición manual. |
| RF-016 | P0 | El archivo original DEBE conservarse inmutable. | Ninguna mejora modifica el objeto original; cada derivado referencia su origen, transformación y versión. |
| RF-017 | P0 | El sistema DEBE generar variantes no destructivas cuando una mejora pueda aumentar legibilidad. | Se registran transformaciones y parámetros; al menos una ruta contempla orientación/perspectiva, contraste local e iluminación desigual. |
| RF-018 | P0 | El sistema DEBE seleccionar o comparar variantes y conservar cuál se usó. | El resultado referencia la variante; el usuario o un proceso autorizado puede comparar con el original; una variante no reemplaza evidencia. |
| RF-019 | P1 | El sistema DEBE detectar archivos duplicados antes de repetir trabajo costoso. | Se usa un hash o identidad equivalente; se informa la coincidencia; reutilizar un resultado nunca cruza permisos ni versiones incompatibles. |

## 4. Procesamiento y OCR

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-020 | P0 | El procesamiento pesado DEBE ejecutarse fuera de la petición web. | La API confirma recepción sin esperar OCR; el estado durable permite consultar el trabajo; reiniciar un worker no elimina el documento. |
| RF-021 | P0 | Cada página DEBE segmentarse en bloques con geometría y orden de lectura cuando sea posible. | Los bloques incluyen página y coordenadas; el orden puede corregirse; una región no soportada se conserva como figura. |
| RF-022 | P0 | El sistema DEBE clasificar y enrutar cada bloque al procesador apropiado. | Texto y matemáticas pueden tomar rutas diferentes en la misma página; la decisión y versión quedan registradas; existe fallback visual. |
| RF-023 | P0 | Mathpix DEBE integrarse detrás de un adaptador. | Credenciales no llegan al cliente; errores externos se normalizan; una prueba de contrato transforma una respuesta a tipos internos. |
| RF-024 | P1 | El sistema DEBE admitir otro OCR general mediante el mismo contrato conceptual. | Añadir un proveedor no exige cambiar el esquema público del documento; se puede seleccionar por política o bloque. |
| RF-025 | P0 | Las respuestas originales de proveedores DEBEN conservarse con procedencia. | Se guardan proveedor, modelo/versión disponible, solicitud relevante, resultado, tiempo y bloque/página; secretos quedan excluidos. |
| RF-026 | P0 | Los resultados DEBEN normalizarse al modelo canónico y la confianza NO DEBE tratarse como garantía. | Se mantienen confianza y origen; reglas adicionales pueden crear ambigüedad; la interfaz evita etiquetas absolutas basadas solo en el puntaje. |
| RF-027 | P0 | El sistema DEBE publicar resultados parciales. | Una página o bloque terminado puede abrirse antes del documento completo; su estado no implica que otras páginas estén listas. |
| RF-028 | P0 | Los pasos reintentables DEBEN ser idempotentes o deduplicados. | Repetir la misma entrega no duplica bloques ni exportaciones; los pasos facturables usan clave de idempotencia o protección equivalente. |
| RF-029 | P1 | El usuario DEBE poder cancelar, reanudar o reprocesar cuando el estado lo permita. | La interfaz explica el alcance; cancelar no borra resultados confirmados; reanudar continúa desde un punto seguro; las acciones quedan auditadas. |

## 5. Modelo documental, revisión y versiones

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-030 | P0 | AlgeTra DEBE usar un modelo documental canónico y versionado. | El documento puede reconstruirse sin consultar el formato del proveedor; cada versión declara versión de esquema y dispone de migración. |
| RF-031 | P0/P1/P2 | El esquema DEBE representar texto, encabezados, listas, tablas, matemáticas, figuras, diagramas, gráficas, química, campos y anotaciones. | En P0 todos los tipos pueden conservarse estructural o visualmente; la edición semántica se habilita según prioridad sin romper documentos previos. |
| RF-032 | P0 | Cada bloque DEBE relacionarse con página, región, recorte y procedencia cuando existan. | Desde un bloque se puede localizar su origen; transformaciones de coordenadas consideran rotación y recorte. |
| RF-033 | P0 | Original, transcripción, edición humana y sugerencias DEBEN ser capas distinguibles. | La interfaz y los datos permiten saber quién o qué originó cada valor; aceptar una sugerencia crea una edición, no reescribe la evidencia. |
| RF-034 | P0 | El usuario DEBE poder editar contenido, orden y clasificación de bloques permitidos. | Los cambios se guardan, aparecen en vista previa y no alteran el activo original; operaciones inválidas reciben explicación. |
| RF-035 | P0 | El sistema DEBE crear una cola navegable de ambigüedades. | Se puede ir al siguiente/anterior pendiente, filtrar por página o tipo y marcar resuelto; el contador se actualiza. |
| RF-036 | P0 | El usuario DEBE comparar un bloque con la región original correspondiente. | La región se resalta o recorta; existe zoom; la comparación sigue disponible después de editar. |
| RF-037 | P0 | El editor DEBE guardar automáticamente y conservar versiones recuperables. | Una confirmación visible distingue cambios locales y persistidos; recargar recupera la última versión confirmada; no se crea una versión completa por cada tecla. |
| RF-038 | P1 | El usuario DEBE poder deshacer cambios y restaurar una versión anterior. | Deshacer respeta el alcance de la sesión; restaurar crea una nueva versión y no elimina el historial. |
| RF-039 | P1 | El usuario DEBE poder reprocesar una página o bloque de forma aislada. | El alcance y costo estimado se muestran; los demás bloques permanecen; el resultado previo queda trazable y no desaparece hasta confirmar sustitución. |

## 6. Revisión lingüística y académica

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-040 | P0 | El sistema DEBE proponer correcciones de ortografía, gramática y puntuación para español. | Cada hallazgo incluye rango, categoría, mensaje y reemplazo opcional; no cambia texto automáticamente; LanguageTool puede fallar sin impedir editar. |
| RF-041 | P1 | La revisión lingüística DEBE admitir glosarios y contexto de materia. | Un término agregado o perteneciente a un glosario no se repite como falso positivo; el glosario aplicado queda identificado. |
| RF-042 | P0 | Toda sugerencia DEBE ser estructurada y resolverse individualmente. | Tiene objetivo estable, explicación, propuesta, origen, estado y confianza o advertencia; puede aceptarse, rechazarse o editarse. |
| RF-043 | P0 | Las expresiones matemáticas DEBEN validarse con herramientas deterministas cuando el problema sea representable. | Se registra si la validación fue determinista, heurística o solo IA; una explicación de IA no contradice silenciosamente el resultado determinista. |
| RF-044 | P1 | Magnitudes y unidades DEBEN validarse cuando puedan interpretarse con certeza suficiente. | Se detectan incompatibilidades dimensionales básicas; símbolos ambiguos se envían a revisión; la herramienta y unidades asumidas se indican. |
| RF-045 | P2 | Las estructuras químicas DEBEN pasar por reconocimiento especializado y validación humana. | Se conserva imagen, representación propuesta y herramienta; SMILES inválido no se marca como definitivo; el usuario puede corregir o volver al modo visual. |
| RF-046 | P1 | Las figuras DEBEN soportar modos semántico, asistido o visual. | El modo se muestra; fallar la reconstrucción conserva el recorte; cambiar de modo no pierde el original. |
| RF-047 | P1 | Los diagramas de flujo reconstruidos DEBEN representarse como nodos y conexiones editables. | El usuario puede añadir, borrar y reconectar; se compara con la imagen; exportar no oculta conexiones pendientes de confirmar. |
| RF-048 | P1 | Las gráficas reconstruidas DEBEN guardar calibración, ejes y series de datos. | El usuario confirma puntos de calibración; datos y presentación pueden editarse por separado; siempre se puede consultar la imagen original. |
| RF-049 | P1 | La revisión académica DEBE considerar materia, nivel y fuentes autorizadas cuando sean relevantes. | El usuario ve el contexto usado; una fuente externa se cita; falta de contexto genera advertencia o solicitud, no una afirmación absoluta. |

## 7. Editor y composición

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-050 | P0 | El sistema DEBE proporcionar un editor estructurado por bloques. | Editar un bloque actualiza el modelo canónico y la vista; copiar/pegar no elimina silenciosamente matemáticas o procedencia. |
| RF-051 | P0 | El usuario DEBE aplicar tipografía, tamaño, color, alineación, espaciado y resaltado. | Los estilos se reflejan en vista previa y exportación; contenido y estilo permanecen separados. |
| RF-052 | P0 | El usuario DEBE configurar tamaño, orientación y márgenes de página. | La paginación se recalcula; valores no válidos se impiden; el PDF respeta la configuración dentro de tolerancias definidas. |
| RF-053 | P0 | El usuario DEBE crear una portada con campos editables. | Puede incluir al menos título, alumno, materia, docente y fecha; campos vacíos se advierten o se omiten según plantilla. |
| RF-054 | P1 | El usuario DEBE insertar campos rellenables. | Se pueden crear, nombrar, completar y eliminar; su estado aparece en la validación previa a exportar. |
| RF-055 | P0 | El usuario DEBE editar y renderizar expresiones matemáticas. | La entrada produce LaTeX válido o informa error; existe representación accesible cuando el renderer lo permita; original OCR se conserva. |
| RF-056 | P1 | El usuario DEBE editar diagramas reconstruidos sin alterar el recorte original. | Los cambios afectan la representación semántica; puede restablecerse desde una versión; la referencia visual sigue disponible. |
| RF-057 | P1 | El usuario DEBE editar datos y estilos de gráficas reconstruidas. | Cambiar datos actualiza la gráfica; escalas inválidas se señalan; la exportación usa la versión confirmada. |
| RF-058 | P0 | El sistema DEBE mostrar asuntos pendientes antes de exportar. | Incluye ambigüedades, fallos, campos requeridos y sugerencias bloqueantes definidas; cada asunto enlaza a su ubicación. |
| RF-059 | P1 | El usuario DEBE aplicar plantillas sin repetir OCR. | Cambiar plantilla modifica presentación, no contenido ni consumo de OCR; se puede volver a la anterior. |

## 8. Vista previa y exportación

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-060 | P0 | El sistema DEBE generar una vista previa paginada del entregable. | Refleja contenido, estilos, márgenes, saltos y figuras; indica cuando está desactualizada mientras se regenera. |
| RF-061 | P0 | El sistema DEBE exportar el documento a PDF. | El archivo abre correctamente, conserva texto y matemáticas legibles y corresponde a una versión identificada. |
| RF-062 | P0 | Una exportación con advertencias DEBE requerir confirmación explícita. | La confirmación enumera asuntos; no usa opciones preseleccionadas engañosas; la decisión queda registrada. |
| RF-063 | P0 | Cada exportación DEBE registrar versión, plantilla y estado. | El historial permite descargar o regenerar según retención; se conoce si existían advertencias. |
| RF-064 | P2 | El sistema DEBE permitir nuevos formatos sin cambiar el documento canónico. | Un exportador recibe una versión canónica; su incorporación no requiere volver a OCR ni altera versiones existentes. |

## 9. Fluidez, comunicación y trabajos

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-070 | P0 | Toda acción iniciada DEBE recibir confirmación visual inmediata. | Botón, fila o región cambia a un estado claro dentro del objetivo RNF-PER-001; se evitan dobles envíos. |
| RF-071 | P0 | El sistema DEBE comunicar fases reales en lenguaje comprensible. | Se distinguen validación, carga, mejora, transcripción, revisión y exportación; no se muestra “finalizado” antes de persistir. |
| RF-072 | P0 | El estado DEBE actualizarse sin recarga manual. | SSE actualiza eventos; si se desconecta, el cliente reintenta y usa consulta de respaldo; no pierde el último estado durable. |
| RF-073 | P0 | El contenido parcial DEBE habilitarse tan pronto esté disponible. | Se puede revisar una página lista mientras otra procesa; un indicador delimita claramente el alcance parcial. |
| RF-074 | P0 | El usuario DEBE poder abandonar y recuperar un trabajo. | Al volver se reconstruyen estado y eventos relevantes desde servidor; no depende de que la pestaña permanezca abierta. |
| RF-075 | P0 | Esqueletos, estimaciones y contenido no confirmado DEBEN identificarse. | Ningún placeholder puede copiarse o exportarse como resultado; estilos y etiquetas lo diferencian también sin color. |
| RF-076 | P0 | Todo error visible DEBE ser accionable. | Incluye qué falló, qué contenido se afectó y opciones válidas; detalles internos o secretos no se exponen. |
| RF-077 | P1 | El usuario DEBE poder cancelar o reintentar trabajos elegibles. | Los botones respetan estado; se evita duplicación; se informa qué trabajo externo ya no puede cancelarse. |
| RF-078 | P0 | El progreso mostrado NO DEBE retroceder sin explicación. | Se usa progreso por fases ponderadas o modo indeterminado; un reinicio de etapa muestra motivo y conserva historial. |
| RF-079 | P1 | El sistema DEBE notificar trabajos prolongados según preferencia. | Existe al menos notificación dentro de la aplicación; canales externos requieren consentimiento y se pueden desactivar. |

## 10. Seguridad, privacidad y operación

| ID | P | Requisito | Criterios de aceptación |
| --- | --- | --- | --- |
| RF-080 | P0 | Toda operación y acceso a activos DEBE comprobar autorización. | API, eventos, descargas, miniaturas y exportaciones aplican la misma política; las pruebas intentan acceso cruzado. |
| RF-081 | P0 | El usuario DEBE conocer las categorías de datos enviadas a terceros. | La política y el flujo identifican propósito y proveedor o categoría; cambios materiales requieren actualización y consentimiento cuando aplique. |
| RF-082 | P0 | El sistema DEBE aplicar retención y eliminación configurables. | Cada activo tiene política; los trabajos de purga son auditables; copias de seguridad siguen un plazo documentado. |
| RF-083 | P0 | Credenciales y secretos DEBEN permanecer en servicios seguros. | No aparecen en frontend, repositorio, logs o respuestas; se cargan desde un gestor o entorno protegido y pueden rotarse. |
| RF-084 | P0 | El sistema DEBE registrar procedencia y eventos de auditoría relevantes. | Incluye procesamiento, edición, aceptación de sugerencias, exportación y eliminación; el acceso al registro está restringido. |
| RF-085 | P0 | El contenido NO DEBE usarse para entrenamiento sin autorización explícita. | El valor predeterminado es no; el consentimiento es separado, revocable y auditable; la falta de consentimiento no bloquea la función principal. |
| RF-086 | P0 | Los datos DEBEN protegerse en tránsito y reposo. | Conexiones externas usan TLS; bases y objetos usan cifrado administrado; claves tienen acceso mínimo. |
| RF-087 | P0 | Los registros y telemetría DEBEN evitar contenido sensible. | No se registra cuerpo de documentos por defecto; errores se redactan; cualquier captura temporal de diagnóstico requiere control y expiración. |
| RF-088 | P0 | El sistema DEBE aislar usuarios y futuras organizaciones. | Todas las entidades poseídas tienen ámbito; consultas y cachés incluyen ese ámbito; pruebas cubren fuga horizontal. |
| RF-089 | P0 | El sistema DEBE aplicar cuotas y controles de costo. | Se bloquea o solicita confirmación antes de superar política; uso y costo estimado son medibles por proveedor, usuario y documento. |

## 11. Dependencias funcionales destacadas

| Requisito | Depende de |
| --- | --- |
| RF-015 | RF-013, RF-014, RF-070, RF-076 |
| RF-022 | RF-021, RF-030, RF-031 |
| RF-027 | RF-020, RF-072, RF-073 |
| RF-035 | RF-026, RF-032, RF-033 |
| RF-040 | RF-033, RF-042 |
| RF-043 | RF-032, RF-033, RF-042 |
| RF-047 | RF-046, RF-050, RF-056 |
| RF-048 | RF-046, RF-050, RF-057 |
| RF-061 | RF-050, RF-060 |
| RF-062 | RF-058, RF-060, RF-061 |
| RF-073 | RF-027, RF-072 |
| RF-089 | RF-013, RF-019, RF-028 |

## 12. Regla de cambio

Agregar, eliminar o modificar semánticamente un requisito exige:

1. Actualizar la ERS.
2. Mantener el identificador o marcarlo como retirado, sin reutilizarlo.
3. Actualizar casos de uso y trazabilidad.
4. Revisar arquitectura y pruebas afectadas.
5. Ejecutar nuevamente la auditoría de consistencia.
