# Casos de uso

> **Versión:** 0.1  
> **Estado:** derivado de la [ERS](./03-ers-especificacion-de-requisitos.md)  
> **Fecha:** 2026-10-03

## 1. Actores

- **Alumno:** actor principal y propietario inicial del documento.
- **Docente/tutor:** actor futuro con acceso concedido.
- **Operador:** supervisa el servicio sin acceso ordinario al contenido.
- **Sistema:** aplicación web, API y workers de AlgeTra.
- **Proveedor externo:** OCR, corrector o IA encapsulado por un adaptador.

## 2. Resumen

| ID | Caso de uso | Actor principal | Horizonte |
| --- | --- | --- | --- |
| CU-001 | Acceder y administrar documentos | Alumno | P0 |
| CU-002 | Crear un documento y agregar páginas | Alumno | P0 |
| CU-003 | Corregir una captura de mala calidad | Alumno | P0 |
| CU-004 | Procesar y seguir el progreso | Alumno/Sistema | P0 |
| CU-005 | Resolver ambigüedades de transcripción | Alumno | P0 |
| CU-006 | Editar y estructurar el documento | Alumno | P0 |
| CU-007 | Revisar ortografía y gramática | Alumno | P0 |
| CU-008 | Solicitar revisión académica | Alumno | P0/P1 |
| CU-009 | Revisar un procedimiento matemático | Alumno | P0 |
| CU-010 | Reconstruir un diagrama | Alumno | P1 |
| CU-011 | Digitalizar una gráfica | Alumno | P1 |
| CU-012 | Reconocer una estructura química | Alumno | P2 |
| CU-013 | Componer el entregable | Alumno | P0 |
| CU-014 | Previsualizar y exportar | Alumno | P0 |
| CU-015 | Reprocesar una región | Alumno | P1 |
| CU-016 | Eliminar documento y datos | Alumno | P0 |
| CU-017 | Supervisar operación, cuotas y fallos | Operador | P0 |

## 3. CU-001 — Acceder y administrar documentos

**Objetivo:** entrar de forma segura y localizar trabajos propios.

**Precondiciones:** el servicio está disponible; para abrir contenido privado existe una cuenta válida.

**Flujo principal:**

1. El alumno inicia sesión.
2. El sistema valida identidad y crea una sesión segura.
3. El sistema muestra únicamente documentos autorizados.
4. Cada documento indica su estado y asuntos pendientes.
5. El alumno abre, renombra o archiva un documento.

**Alternativas y errores:**

- Credenciales o sesión inválidas: se rechaza el acceso sin revelar si un documento ajeno existe.
- Sesión expirada durante edición: se conservan cambios locales, se solicita autenticación y se reintenta de forma segura.
- Estado todavía en procesamiento: se abre la vista progresiva.

**Postcondiciones:** existe una sesión autorizada y cualquier mutación queda persistida.

**Trazabilidad:** RF-001 a RF-004, RF-070, RF-080, RNF-SEC-001.

## 4. CU-002 — Crear un documento y agregar páginas

**Objetivo:** preparar rápidamente un conjunto ordenado de páginas.

**Precondiciones:** sesión válida; permisos para crear documentos.

**Flujo principal:**

1. El alumno crea un documento.
2. Selecciona fotografías, imágenes o un PDF.
3. La aplicación crea miniaturas locales inmediatamente.
4. El alumno revisa orden, orientación y cantidad.
5. Puede rotar, reordenar, reemplazar o retirar páginas.
6. El sistema verifica formato y límites.
7. El alumno confirma la carga.
8. La aplicación inicia carga directa y muestra bytes reales transferidos.

**Alternativas y errores:**

- Archivo no compatible o excesivo: se rechaza antes de OCR y se muestra el límite.
- Conexión interrumpida: se reintenta una parte recuperable o se solicita confirmar de nuevo sin duplicar.
- Archivo duplicado: se ofrece reutilizar el activo o cancelar.

**Postcondiciones:** el documento y sus páginas están confirmados o conservados como borrador local/servidor según el punto alcanzado.

**Trazabilidad:** RF-003, RF-010 a RF-012, RF-019, RF-070, RF-071, RNF-PER-001, RNF-PER-004.

## 5. CU-003 — Corregir una captura de mala calidad

**Objetivo:** evitar espera y costo cuando una imagen no puede producir un resultado útil.

**Precondiciones:** existe una página seleccionada o capturada.

**Flujo principal:**

1. La aplicación evalúa calidad antes de OCR.
2. Detecta un defecto crítico, por ejemplo desenfoque irrecuperable.
3. Marca la página sin afirmar que fue transcrita.
4. Explica el problema y cómo repetir la foto.
5. El alumno recaptura o sustituye la página.
6. Se evalúa la nueva versión.
7. Si es aceptable, continúa la carga y procesamiento.

**Alternativas y errores:**

- Defecto recuperable: se muestra advertencia y se generan variantes no destructivas.
- No es posible recapturar: el alumno conserva la imagen y abre una página para edición manual, sin llamada automática facturable.
- Posible falso rechazo: se registra telemetría; una política futura puede permitir revisión avanzada, sin ocultar el riesgo o costo.

**Postcondiciones:** existe una captura aceptada o una página manual; no se consumió OCR automáticamente para la captura crítica.

**Trazabilidad:** RF-013 a RF-018, RF-076, RF-089, RN-002, RN-003, RNF-PER-003, RNF-QLT-002.

## 6. CU-004 — Procesar y seguir el progreso

**Objetivo:** recibir contenido real progresivamente y comprender qué sucede.

**Precondiciones:** al menos una página pasó la puerta de calidad y fue confirmada.

**Flujo principal:**

1. La API crea un trabajo durable y responde de inmediato.
2. El sistema prepara variantes y segmenta páginas.
3. Clasifica bloques y los enruta.
4. La aplicación recibe fases y latidos mediante SSE.
5. El primer bloque o página terminado aparece como resultado parcial.
6. El alumno puede abrirlo y revisarlo mientras continúa el resto.
7. Al finalizar, el documento pasa a revisión o edición.

**Alternativas y errores:**

- SSE interrumpido: la aplicación reconecta y consulta estado como respaldo.
- Falla una página: las demás siguen disponibles; la fallida ofrece reintento.
- Proveedor lento: se muestra fase real e independencia para volver después.
- El usuario cierra la pestaña: el trabajo continúa y se recupera al volver.

**Postcondiciones:** existen resultados parciales o finales persistidos y un estado explicable por página.

**Trazabilidad:** RF-020 a RF-028, RF-070 a RF-078, RNF-PER-005 a RNF-PER-007, RNF-REL-002 a RNF-REL-005.

## 7. CU-005 — Resolver ambigüedades de transcripción

**Objetivo:** confirmar contenido dudoso con mínima fricción.

**Precondiciones:** existe al menos un bloque marcado como ambiguo.

**Flujo principal:**

1. El alumno abre la cola de ambigüedades.
2. El sistema muestra el bloque y su recorte original.
3. Presenta interpretación, razón y alternativas disponibles.
4. El alumno confirma, edita o elige una alternativa.
5. El sistema registra la decisión y actualiza el bloque.
6. Avanza al siguiente pendiente.
7. El contador y estado del documento se actualizan.

**Alternativas y errores:**

- El recorte no es suficiente: se amplía a la página completa.
- Ninguna alternativa es correcta: se introduce contenido manual.
- El alumno no puede resolverlo: lo deja pendiente y puede continuar.

**Postcondiciones:** el bloque queda resuelto o explícitamente pendiente; la evidencia permanece disponible.

**Trazabilidad:** RF-026, RF-032 a RF-036, RF-042, RF-058, RNF-USA-002.

## 8. CU-006 — Editar y estructurar el documento

**Objetivo:** transformar la transcripción en contenido ordenado y editable.

**Precondiciones:** existe al menos un bloque reconocido o creado manualmente.

**Flujo principal:**

1. El alumno abre el editor.
2. Edita texto o matemáticas.
3. Reclasifica encabezados, listas, tablas o figuras cuando sea necesario.
4. Reordena bloques permitidos.
5. El sistema muestra cambios locales y guarda automáticamente.
6. La vista previa refleja la última versión persistida o indica que está actualizándose.

**Alternativas y errores:**

- Falla el autoguardado: se conserva el cambio local, se informa y se reintenta.
- Hay una edición concurrente futura: el sistema detecta versión incompatible antes de sobrescribir.
- Contenido pegado inseguro: se sanitiza o rechaza sin ejecutar código.

**Postcondiciones:** existe una nueva revisión del documento; original y resultado OCR no fueron modificados.

**Trazabilidad:** RF-030 a RF-034, RF-037, RF-050, RF-055, RNF-PER-008, RNF-PER-009.

## 9. CU-007 — Revisar ortografía y gramática

**Objetivo:** mejorar el español sin confundir corrección con transcripción.

**Precondiciones:** hay bloques de texto y una versión guardada.

**Flujo principal:**

1. El alumno solicita o habilita revisión lingüística.
2. El sistema envía únicamente el texto necesario al corrector configurado.
3. Recibe hallazgos estructurados.
4. Muestra categoría, explicación y reemplazo propuesto.
5. El alumno acepta, rechaza o edita cada sugerencia.
6. Una aceptación crea una edición humana trazable.

**Alternativas y errores:**

- Término científico válido marcado: el alumno lo rechaza o lo agrega a un glosario cuando esté disponible.
- Corrector no disponible: la edición continúa y la revisión queda reintentable.
- Sugerencia obsoleta por edición posterior: se marca obsoleta y no se aplica.

**Postcondiciones:** sugerencias y decisiones quedan registradas; la transcripción literal sigue accesible.

**Trazabilidad:** RF-033, RF-040 a RF-042, RF-084, RN-005.

## 10. CU-008 — Solicitar revisión académica

**Objetivo:** detectar posibles errores conceptuales y recibir orientación.

**Precondiciones:** los bloques objetivo están validados o se ha advertido que no lo están; existe contexto suficiente o puede solicitarse.

**Flujo principal:**

1. El alumno elige materia, nivel y alcance de revisión.
2. El sistema selecciona herramientas deterministas y/o IA apropiadas.
3. Los validadores producen evidencias o resultados.
4. La IA, si aplica, genera sugerencias bajo un esquema estructurado.
5. El sistema muestra fragmento, problema, explicación, propuesta, evidencia y nivel de incertidumbre.
6. El alumno acepta, rechaza o edita.

**Alternativas y errores:**

- Falta contexto: se solicita antes de afirmar una corrección.
- No existe validador adecuado: se etiqueta como análisis asistido, no como verificación.
- Fuente externa usada: se muestra la referencia.
- Resultado contradictorio: se prioriza evidencia determinista y se presenta el conflicto.

**Postcondiciones:** existen sugerencias trazables y decisiones; no se alteró contenido sin autorización.

**Trazabilidad:** RF-042 a RF-049, RF-081, RF-084, RN-006.

## 11. CU-009 — Revisar un procedimiento matemático

**Objetivo:** entender un error matemático y su posible corrección paso a paso.

**Precondiciones:** expresión transcrita y preferentemente confirmada; parseo matemático posible o advertido.

**Flujo principal:**

1. El sistema identifica expresiones y pasos relacionados.
2. Normaliza la representación sin alterar la evidencia.
3. SymPy u otra herramienta determinista valida equivalencia u operación cuando puede.
4. Se identifica el primer paso inconsistente.
5. La capa pedagógica explica por qué y propone pasos corregidos.
6. El alumno compara, acepta una corrección o conserva su versión.

**Alternativas y errores:**

- Símbolo ambiguo: se vuelve a CU-005.
- Problema no representable de forma determinista: se declara revisión heurística.
- Varias estrategias correctas: se muestran como alternativas, no como única respuesta.

**Postcondiciones:** la revisión identifica método usado y mantiene separadas evidencia, explicación y edición.

**Trazabilidad:** RF-032, RF-033, RF-042, RF-043, RF-055.

## 12. CU-010 — Reconstruir un diagrama

**Objetivo:** obtener una representación editable cuando la figura lo permita.

**Precondiciones:** existe una región clasificada como diagrama y su original está disponible.

**Flujo principal:**

1. El sistema conserva el recorte visual.
2. Detecta formas, etiquetas y conexiones candidatas.
3. Propone un modo asistido con elementos editables.
4. El alumno compara la superposición con el original.
5. Corrige figuras, etiquetas y conexiones.
6. Confirma la reconstrucción.
7. El editor usa la versión semántica y mantiene acceso al recorte.

**Alternativas y errores:**

- Confianza insuficiente: se mantiene modo visual con etiquetas opcionales.
- Tipo especializado no soportado: se preserva sin afirmar semántica.
- Una conexión es dudosa: se marca pendiente y bloquea la confirmación silenciosa.

**Postcondiciones:** existe representación visual o semántica confirmada, nunca pérdida del original.

**Trazabilidad:** RF-031, RF-032, RF-046, RF-047, RF-050, RF-056.

## 13. CU-011 — Digitalizar una gráfica

**Objetivo:** reconstruir una gráfica dibujada como datos y presentación editables.

**Precondiciones:** existe una región clasificada como gráfica.

**Flujo principal:**

1. El sistema conserva la imagen y detecta ejes, etiquetas y series candidatas.
2. El alumno confirma tipo de gráfica y puntos de calibración.
3. El sistema extrae puntos o curvas dentro de una tolerancia visible.
4. El alumno corrige series y datos.
5. Plotly u otro renderer produce la gráfica digital.
6. El alumno confirma la representación.

**Alternativas y errores:**

- Escala no legible: se solicita introducir valores manualmente.
- Ejes no ortogonales o dibujo libre: se usa trazado asistido o modo visual.
- Varias curvas se cruzan: se solicita asignación manual de puntos.

**Postcondiciones:** se guardan calibración, datos, estilo, procedencia y recorte original.

**Trazabilidad:** RF-031, RF-032, RF-046, RF-048, RF-050, RF-057.

## 14. CU-012 — Reconocer una estructura química

**Objetivo:** convertir una estructura química dibujada en una representación validable.

**Precondiciones:** procesador químico habilitado; región clasificada como química.

**Flujo principal:**

1. Se conserva el recorte.
2. Un procesador especializado propone SMILES/InChI u otra representación.
3. RDKit u otra herramienta valida sintaxis y estructura básica.
4. Se renderiza la propuesta junto al original.
5. El alumno confirma o corrige en un editor apropiado.

**Alternativas y errores:**

- Resultado inválido: se conserva como propuesta fallida y se vuelve a visual/manual.
- Estructura manuscrita no reconocida: puede probarse otro procesador según política.
- Isomería incierta: se resalta y exige confirmación.

**Postcondiciones:** estructura confirmada o imagen preservada; herramienta y versión registradas.

**Trazabilidad:** RF-025, RF-031, RF-032, RF-045, RF-046.

## 15. CU-013 — Componer el entregable

**Objetivo:** dar presentación académica al contenido validado.

**Precondiciones:** existe una versión editable del documento.

**Flujo principal:**

1. El alumno selecciona o mantiene una plantilla.
2. Completa la portada.
3. Ajusta página, tipografía, color, espaciado y resaltado.
4. Completa campos rellenables cuando existan.
5. La vista previa se actualiza sin volver a OCR.
6. El alumno revisa la paginación.

**Alternativas y errores:**

- Falta un campo requerido: se muestra en asuntos pendientes.
- Cambio causa desbordamiento: la vista lo señala y ofrece ajuste.
- Plantilla no compatible con un bloque: usa fallback documentado sin perder contenido.

**Postcondiciones:** la versión tiene estilos y configuración listos para previsualizar.

**Trazabilidad:** RF-050 a RF-060.

## 16. CU-014 — Previsualizar y exportar

**Objetivo:** obtener un PDF correspondiente a una versión conocida.

**Precondiciones:** documento editable y exportador disponible.

**Flujo principal:**

1. El sistema genera la vista previa paginada.
2. Evalúa ambigüedades, campos y errores pendientes.
3. Si no hay bloqueos, el alumno solicita PDF.
4. El exportador genera el archivo en segundo plano.
5. El sistema registra versión, plantilla y estado.
6. El alumno descarga el PDF.

**Alternativas y errores:**

- Existen advertencias no bloqueantes: el usuario revisa y confirma explícitamente.
- Existe un bloqueo de integridad: se dirige al asunto antes de exportar.
- Falla el navegador de exportación: se conserva el documento y se ofrece reintento.

**Postcondiciones:** PDF disponible y trazable, o trabajo fallido reintentable.

**Trazabilidad:** RF-058, RF-060 a RF-063, RF-070 a RF-074, RNF-PER-010.

## 17. CU-015 — Reprocesar una región

**Objetivo:** mejorar un resultado sin pagar ni esperar por todo el documento.

**Precondiciones:** página o bloque existente; política permite reprocesamiento.

**Flujo principal:**

1. El alumno selecciona bloque o página.
2. El sistema muestra alcance, procesador y posible consumo.
3. El alumno confirma.
4. Se crea un trabajo idempotente para la región.
5. El resultado nuevo se compara con el vigente.
6. El alumno acepta sustituir la capa normalizada o conserva la anterior.

**Alternativas y errores:**

- Resultado igual disponible en caché: se reutiliza con procedencia.
- Cuota insuficiente: se informa antes de invocar al proveedor.
- Falla el nuevo intento: la versión anterior permanece activa.

**Postcondiciones:** resultado anterior conservado y nuevo resultado aceptado o descartado.

**Trazabilidad:** RF-019, RF-025, RF-028, RF-029, RF-039, RF-089.

## 18. CU-016 — Eliminar documento y datos

**Objetivo:** retirar un trabajo y aplicar la política de eliminación.

**Precondiciones:** usuario autorizado; documento existente.

**Flujo principal:**

1. El alumno solicita eliminar.
2. El sistema enumera alcance y posibles plazos.
3. El alumno confirma.
4. Se revoca acceso inmediato.
5. Se cancelan trabajos elegibles.
6. Se programan purgas de base, objetos y derivados.
7. Se muestra estado de eliminación.

**Alternativas y errores:**

- Exportación compartida futura: se aplica política y se advierte su alcance.
- Proveedor externo con retención propia: se informa según contrato.
- Falla una purga: se reintenta y alerta a operación sin restaurar acceso al usuario.

**Postcondiciones:** documento inaccesible y eliminación completada o en curso de forma auditable.

**Trazabilidad:** RF-005, RF-082, RF-084, RF-086 a RF-088, RNF-PRI-002.

## 19. CU-017 — Supervisar operación, cuotas y fallos

**Objetivo:** mantener rendimiento y costos sin exponer contenido innecesario.

**Precondiciones:** operador autenticado con rol apropiado.

**Flujo principal:**

1. El operador abre paneles de salud.
2. Revisa latencia, profundidad de colas, errores, cuotas y costo agregado.
3. Localiza un trabajo por identificador de correlación.
4. Ve metadatos técnicos redactados.
5. Aplica una acción permitida: reintentar, pausar admisión o ajustar límite.
6. La acción queda auditada.

**Alternativas y errores:**

- Se requiere ver contenido para soporte: se utiliza un proceso excepcional, autorizado, temporal y auditable.
- Proveedor degradado: se activa política de fallback o se comunica demora.
- Presupuesto cerca del límite: se reduce admisión o se solicita decisión administrativa.

**Postcondiciones:** acción operativa aplicada sin alterar contenido académico de forma no autorizada.

**Trazabilidad:** RF-076, RF-083, RF-084, RF-087, RF-089, RNF-OBS-001 a RNF-OBS-003.
