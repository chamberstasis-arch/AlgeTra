# Rendimiento y experiencia percibida

> **Versión:** 0.1  
> **Estado:** estrategia normativa de experiencia, subordinada a la [ERS](./03-ers-especificacion-de-requisitos.md)  
> **Fecha:** 2026-10-03

## 1. Objetivo

AlgeTra debe sentirse rápido, estable y comunicativo. La estrategia combina:

- Rendimiento real.
- Trabajo anticipado útil.
- Resultados progresivos.
- Comunicación clara.
- Continuidad mientras se procesa.

La aplicación puede reducir la percepción de espera, pero no debe engañar al usuario sobre la existencia, avance o calidad de un resultado.

## 2. Principio de inmediatez honesta

Se permite:

- Mostrar una miniatura local inmediatamente.
- Reservar el espacio de un resultado con un esqueleto.
- Actualizar la UI de forma optimista para acciones locales y reversibles.
- Mostrar una estimación identificada como tal cuando esté basada en datos.
- Precargar el siguiente recorte o vista probable.
- Mostrar una página terminada antes que el resto.

No se permite:

- Inventar texto para que parezca que el OCR terminó.
- Marcar un trabajo como guardado antes de una confirmación durable sin distinguir el estado local.
- Completar una barra mientras el trabajo sigue pendiente.
- Mostrar porcentajes sin una base medible.
- Ocultar errores o reinicios para mantener una ilusión visual.
- Exportar un placeholder como parte del documento.
- Aplicar correcciones para que el resultado “parezca mejor” sin aprobación.

## 3. Modelo mental comunicado

El usuario debe poder responder en todo momento:

1. ¿Qué está haciendo el sistema?
2. ¿Sobre qué página o contenido?
3. ¿Ya existe algún resultado utilizable?
4. ¿Tengo que hacer algo?
5. ¿Puedo irme y volver?
6. ¿Qué ocurrirá si falla?

## 4. Cronología objetivo de una captura

### 4.1. Primeros 100 ms

- El control activado cambia de estado.
- Se evita un segundo envío accidental.
- Se crea una tarjeta local de página.
- Si todavía no existe miniatura, aparece un esqueleto claramente visual.

### 4.2. Primeros 300 ms

- Aparece la miniatura local en un dispositivo de referencia.
- Se muestra el nombre o número de página.
- Se indica “validando captura”, no “transcribiendo”.

### 4.3. Primeros 1.5 segundos

- Aparece el primer diagnóstico de calidad.
- Si existe un defecto crítico, se explica antes de cargar a OCR.
- Si hay advertencia recuperable, se informa que se intentará mejorar.

### 4.4. Durante la carga

- La barra utiliza bytes enviados/total cuando estén disponibles.
- El usuario puede añadir o revisar otras páginas.
- La interfaz no queda bloqueada por compresión, hash o transformación.
- Si la red cae, se distingue “pausada por conexión” de “error del archivo”.

### 4.5. Durante el procesamiento

- Se muestra una secuencia real: preparando, segmentando, transcribiendo, organizando y listo para revisar.
- Se informa alcance, por ejemplo “Transcribiendo página 2 de 6”.
- Una fase externa sin porcentaje se muestra indeterminada.
- Cada resultado parcial real reemplaza a su propio esqueleto.

### 4.6. Al finalizar parcialmente

- Se habilita la primera página sin esperar todo el documento.
- Se informa claramente “resultado parcial”.
- El usuario puede revisar mientras continúa el fondo.
- La llegada de una nueva página no roba foco ni desplaza inesperadamente la edición.

## 5. Estados visibles

| Estado visible | Significado | Acción principal |
| --- | --- | --- |
| Preparando vista previa | Trabajo local, todavía no cargado | Esperar brevemente o retirar página |
| Revisar captura | Se detectó un posible problema recuperable | Ver detalle o reemplazar |
| Repetir fotografía | La captura no tiene señal útil suficiente | Recapturar, sustituir o pasar a manual |
| Cargando | Se transfieren bytes reales | Continuar trabajando o cancelar si es seguro |
| En cola | El servidor aceptó, aún no inicia worker | Puede abandonar y volver |
| Mejorando imagen | Se crean variantes no destructivas | Ver original; no requiere esperar en pantalla |
| Transcribiendo | Un proveedor o modelo procesa | Ver páginas ya listas |
| Organizando contenido | Se normaliza al documento | Continuar con bloques disponibles |
| Revisión necesaria | Hay ambigüedades o fallos parciales | Abrir cola de revisión |
| Listo para editar | Procesamiento base terminado | Editar y revisar |
| Generando PDF | Exportación en worker | Seguir editando otra versión o volver después |
| Demora del proveedor | Dependencia más lenta de lo habitual | Esperar, volver después o reintentar según política |
| Error parcial | Una parte falló y otras están disponibles | Ver alcance y reintentar solo esa parte |

## 6. Placeholders y esqueletos

### 6.1. Reglas

- Deben conservar aproximadamente el tamaño del contenido esperado.
- Deben tener semántica accesible, por ejemplo `aria-busy` y texto de estado.
- No deben poder seleccionarse, copiarse o exportarse como contenido.
- Deben desaparecer por región, no obligatoriamente todos a la vez.
- Deben diferenciarse de una ambigüedad real.
- Deben respetar reducción de movimiento.

### 6.2. Tipos

- Miniatura pendiente de decodificación.
- Página pendiente de OCR.
- Bloque detectado sin contenido todavía.
- Vista previa pendiente de regeneración.
- Exportación pendiente de archivo.

Un placeholder no contendrá palabras plausibles, ecuaciones de ejemplo ni datos del usuario deducidos.

## 7. Actualizaciones optimistas

### 7.1. Permitidas

- Reordenar páginas localmente antes de confirmar.
- Aplicar estilos en la vista local.
- Marcar una sugerencia mientras la petición se envía, mostrando estado pendiente.
- Editar texto con indicador “guardando”.

### 7.2. Requieren confirmación durable diferenciada

- Guardado de contenido.
- Eliminación.
- Consumo de cuota.
- Aceptación final de una sugerencia.
- Inicio de OCR o IA facturable.
- Exportación terminada.

Si falla una actualización optimista, la interfaz revierte o conserva el cambio local y explica cómo recuperarlo; nunca lo pierde silenciosamente.

## 8. Progreso

### 8.1. Jerarquía preferida

1. Unidades reales: bytes, páginas, bloques o asuntos resueltos.
2. Fases reales: validando, cargando, OCR, normalizando.
3. Estimación histórica identificada como “estimada”.
4. Estado indeterminado cuando no hay señal fiable.

### 8.2. Barra global

Una barra global solo podrá usar pesos derivados de mediciones por fase y versión. Debe:

- Indicar que es estimada.
- Ser monótona dentro de un intento.
- No llegar a 100 % antes de persistir el estado final.
- Cambiar a una explicación si una fase se reinicia.
- Preferir “4 de 7 páginas disponibles” sobre un porcentaje cuando sea más preciso.

### 8.3. Tiempo restante

Solo se mostrará si:

- Hay suficientes observaciones comparables.
- Se conoce tamaño, tipo y proveedor.
- El intervalo de error es aceptable.

En caso contrario se utilizará “normalmente tarda unos segundos” únicamente si existe evidencia, o se omitirá el tiempo.

## 9. Resultados progresivos

La unidad de publicación más pequeña debe equilibrar utilidad y estabilidad:

- Publicar por página es la base P0.
- Publicar por bloque se usa cuando el proveedor y normalizador lo permiten.
- No se publicará carácter a carácter si genera reflujo o falsas interpretaciones.
- Un bloque parcial debe tener versión y estado para no aceptar una sugerencia contra contenido que cambió.

La revisión podrá comenzar sobre páginas terminadas. La revisión académica automática debería esperar a que el bloque objetivo esté validado o mostrar una advertencia explícita.

## 10. Comunicación de mala calidad

Un rechazo debe ser rápido y útil. Estructura del mensaje:

1. **Problema:** “La escritura está fuera de foco”.
2. **Consecuencia:** “No hay detalle suficiente para transcribir con confianza”.
3. **Acción:** “Apoya el teléfono, aléjalo ligeramente y toca la pantalla sobre el texto”.
4. **Alternativa:** “Sustituir imagen” o “Conservar y escribir manualmente”.

Ejemplos de recomendaciones:

- Usar luz uniforme y evitar flash directo.
- Mantener la cámara paralela a la página.
- Incluir las cuatro esquinas.
- Aumentar contraste físico colocando la hoja sobre una superficie oscura.
- Evitar zoom digital.
- Limpiar la lente.
- Acercarse sin cortar márgenes.

No se culpará al usuario ni se utilizará solamente “imagen inválida”.

## 11. Técnicas de rendimiento real

### 11.1. Cliente

- División de código por ruta y herramienta pesada.
- Carga diferida de editores de diagramas, gráficas y química.
- Web Workers para imagen y hash.
- `createImageBitmap` o APIs equivalentes cuando sean compatibles.
- Miniaturas de resolución adecuada, no originales completos en listas.
- Virtualización de páginas y bloques fuera de vista.
- Caché de consultas con invalidación por evento.
- Prefetch de recortes contiguos en la cola de revisión.
- Debounce de autoguardado con flush al cambiar de documento.
- Evitar rerender global durante progreso frecuente.

### 11.2. Red

- Carga directa con URLs firmadas.
- Multipart/reanudación para archivos grandes cuando el benchmark lo justifique.
- Compresión de transporte que no destruya trazos.
- CDN para aplicación, fuentes y activos públicos.
- Miniaturas derivadas para la interfaz.
- SSE con mensajes pequeños y resumibles.
- Caché HTTP para activos inmutables.

### 11.3. API

- Peticiones rápidas que crean intención durable.
- Índices para propietario, estado y fecha.
- Paginación por cursor en listados.
- Consultas que no cargan JSON o activos innecesarios.
- Lotes para ediciones relacionadas, sin hacer un documento gigante.
- Pool de conexiones y límites por proceso.
- Respuestas comprimidas cuando aporten beneficio.

### 11.4. Workers

- Colas por prioridad y recurso.
- Procesamiento por página con concurrencia limitada.
- Reutilización segura por hash y versión.
- Límites de tasa por proveedor.
- Timeouts y reintentos con backoff y jitter.
- Circuit breaker ante dependencia degradada.
- Cancelación entre pasos.
- Precarga de modelos locales costosos.
- Separación de worker de Chromium por consumo de memoria.

### 11.5. Base de datos

- Filas acotadas por página/bloque o snapshot.
- Índices basados en consultas reales.
- Escritura de eventos de progreso agrupada para no saturar.
- Outbox para publicar de forma fiable.
- Archivado/partición futura de auditoría y eventos según volumen.
- Evitar almacenar binarios en PostgreSQL.

## 12. Priorización de recursos

Orden inicial:

1. Validación de captura interactiva.
2. OCR de documentos que un usuario está observando.
3. Resultados parciales y autoguardado.
4. Exportación solicitada activamente.
5. Revisión lingüística/académica.
6. Reprocesamientos no interactivos.
7. Importaciones masivas y mantenimiento.

Se aplicará equidad para impedir que un usuario monopolice workers. La prioridad no debe causar inanición de trabajos de fondo.

## 13. Manejo de saturación

Cuando la demanda exceda capacidad:

- Rechazar temprano nuevas cargas sobre el límite con `Retry-After` cuando aplique.
- Mantener documentos ya aceptados durables.
- Mostrar “alta demanda” y no un porcentaje falso.
- Reducir concurrencia por usuario.
- Pausar trabajos de baja prioridad.
- Escalar workers dentro de presupuesto.
- Proteger base de datos y proveedores con límites.
- Informar tiempos estimados solo si siguen siendo confiables.

## 14. Fallos y recuperación visibles

| Falla | Mensaje útil | Acción |
| --- | --- | --- |
| Red del usuario | “La carga se pausó por conexión” | Reanudar automáticamente o manualmente |
| Página irrecuperable | “No hay detalle suficiente en esta página” | Recapturar, sustituir o editar manualmente |
| OCR externo | “No pudimos transcribir la página 3” | Reintentar solo página 3 o volver después |
| Cuota | “Se alcanzó el límite de procesamiento” | Ver límite, esperar o cambiar plan/política |
| IA | “La revisión académica no está disponible” | Seguir editando y reintentar revisión |
| Autoguardado | “Tus cambios siguen en este dispositivo” | Reconectar, autenticar y reintentar |
| Exportación | “El PDF no pudo generarse; tu documento está seguro” | Reintentar exportación |

## 15. Métricas

### 15.1. Técnicas

- Interaction to Next Paint para acciones clave.
- Long tasks del hilo principal.
- Tiempo de miniatura.
- Tiempo de calidad local y servidor.
- Tiempo de URL firmada y transferencia.
- Tiempo de aceptación, cola e inicio.
- Tiempo por procesador externo.
- Tiempo hasta primer bloque/página.
- Tiempo hasta documento base terminado.
- Tiempo de autoguardado.
- Tiempo de exportación.
- Reconexiones SSE y polling de respaldo.

### 15.2. De experiencia

- Abandono durante cada fase.
- Recaptura completada después de un rechazo.
- Usuario que empieza a revisar antes del final.
- Veces que se vuelve a cargar la página manualmente.
- Reintentos repetidos sobre el mismo fallo.
- Consultas de ayuda durante espera.
- Percepción de velocidad y confianza en pruebas cualitativas.

### 15.3. Calidad y costo

- OCR evitado por puerta de calidad.
- OCR repetido y causa.
- Variantes generadas/enviadas por página.
- Costo hasta primer resultado útil.
- Costo por documento exportado.
- Correcciones humanas después de cada procesador.

## 16. Experimentos permitidos

Se pueden probar:

- Orden y redacción de fases.
- Esqueleto frente a miniatura borrosa explícita.
- Publicación por página frente a grupos pequeños.
- Ubicación de acciones para continuar en segundo plano.
- Consejos de recaptura contextualizados.
- Prefetch de la siguiente ambigüedad.

No se experimentará ocultando fallos, simulando resultados o dificultando cancelar/eliminar.

## 17. Pruebas de rendimiento

Antes de cada lanzamiento importante:

1. Perfil de cliente con documentos de 1, 10 y límite configurado de páginas.
2. Red rápida, lenta, intermitente y offline temporal.
3. Carga concurrente de API, SSE y workers.
4. Proveedor normal, lento, con timeout y cuota agotada.
5. Redis reiniciado y workers terminados durante una tarea.
6. Exportaciones concurrentes.
7. Documento con muchos bloques y sugerencias.
8. Medición en dispositivo móvil de referencia.
9. Comparación contra el presupuesto de la [especificación no funcional](./06-requisitos-no-funcionales.md).

Una regresión de p95 en un flujo P0 requerirá explicación y decisión de lanzamiento, aunque el promedio permanezca estable.

## 18. Lista de comprobación de una nueva función

- ¿Responde visualmente en menos de 100 ms?
- ¿Su trabajo pesado está fuera de la petición?
- ¿Puede publicar un resultado parcial real?
- ¿Tiene estado durable y recuperable?
- ¿Distingue pendiente, estimado y final?
- ¿Qué ocurre si el proveedor tarda o falla?
- ¿Puede cancelarse o reintentarse sin duplicar costo?
- ¿Bloquea el hilo principal?
- ¿Expone contenido en telemetría?
- ¿Funciona con teclado y reducción de movimiento?
- ¿Qué métrica demostrará que mejora la experiencia?
