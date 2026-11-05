# Resumen de visión y preparación del prototipo

> **Fecha de revisión:** 2026-11-05  
> **Estado:** síntesis ejecutiva no normativa  
> **Fuente rectora:** [ERS](./03-ers-especificacion-de-requisitos.md)

## 1. Visión resumida

AlgeTra busca convertir trabajos académicos manuscritos en documentos digitales editables, revisables y listos para entregar, reduciendo el esfuerzo de transcripción sin perder fidelidad ni control sobre lo que escribió el alumno.

El producto no se limita a ejecutar OCR. Su propuesta completa comprende:

1. **Capturar y validar:** detectar fotografías deficientes antes de gastar tiempo y servicios externos.
2. **Transcribir y estructurar:** reconocer texto, matemáticas y otros bloques conservando su posición y procedencia.
3. **Revisar:** señalar ambigüedades y proponer correcciones lingüísticas o académicas.
4. **Editar y componer:** convertir el resultado en un documento presentable.
5. **Entregar:** generar inicialmente un PDF listo para revisión o entrega.

En una frase:

> **AlgeTra transforma un manuscrito académico en un entregable digital confiable, no solamente en texto reconocido.**

## 2. Problema que se está resolviendo

Los alumnos pueden invertir demasiado tiempo pasando a computadora tareas ya realizadas a mano. El problema aumenta cuando el trabajo tiene:

- Varias páginas.
- Escritura tenue o fotografías irregulares.
- Fórmulas y procedimientos matemáticos.
- Tablas, gráficas o diagramas.
- Títulos, clasificaciones y formatos que deben reconstruirse.
- Errores ortográficos o académicos que conviene revisar antes de entregar.

Las soluciones parciales de OCR no resuelven por sí solas la creación del entregable, la incertidumbre del reconocimiento ni la experiencia de revisión.

## 3. Usuario principal

El usuario inicial es un alumno de primaria avanzada, secundaria, preparatoria o educación superior que:

- Tiene una tarea manuscrita.
- Necesita digitalizarla rápidamente.
- Puede trabajar desde teléfono o computadora.
- No debería necesitar conocimientos avanzados de edición, LaTeX o diseño.
- Espera saber qué interpretó el sistema y qué partes debe confirmar.

Docentes, tutores e instituciones permanecen como usuarios posteriores. No deben ampliar el primer prototipo.

## 4. Propuesta de valor

Los diferenciadores previstos son:

### 4.1. De OCR a entregable

El resultado puede editarse, formatearse, previsualizarse y exportarse sin depender obligatoriamente de otra herramienta.

### 4.2. Fidelidad y trazabilidad

AlgeTra separa:

- Imagen original.
- Variantes mejoradas.
- Resultado original del OCR.
- Transcripción normalizada.
- Ediciones del alumno.
- Sugerencias lingüísticas o académicas.
- Entregable exportado.

### 4.3. Incertidumbre visible

Un bloque dudoso no se presenta como correcto. El usuario puede compararlo con el recorte original, confirmarlo o editarlo.

### 4.4. Rapidez real y percibida

La aplicación responde rápidamente con miniaturas, progreso por fases y resultados parciales. La percepción de velocidad se mejora sin inventar texto, porcentajes ni estados.

### 4.5. Alcance multidisciplinario progresivo

La arquitectura admite texto, matemáticas, ciencias, química, biología, mecánica, mecatrónica, diagramas y gráficas. Esto no significa implementar todas esas capacidades en el prototipo.

## 5. Flujo ideal del producto

```text
Capturar o cargar páginas
          ↓
Evaluar calidad
   ├── irrecuperable → explicar y recapturar
   └── recuperable   → mejorar sin alterar el original
          ↓
Segmentar y clasificar bloques
          ↓
Aplicar OCR o procesador adecuado
          ↓
Mostrar resultados progresivos
          ↓
Resolver ambigüedades
          ↓
Revisar lenguaje o contenido académico
          ↓
Editar y dar formato
          ↓
Previsualizar y exportar a PDF
```

## 6. Principios que no deben perderse

1. **El original es inmutable.** Toda mejora genera un derivado.
2. **Transcribir no es corregir.** Una corrección nunca debe reemplazar silenciosamente lo reconocido.
3. **La confianza no es certeza.** Los puntajes de un proveedor son señales.
4. **No procesar basura conocida.** Una captura irrecuperable debe detenerse antes del OCR facturable.
5. **El usuario conserva el control.** Acepta, rechaza o edita sugerencias.
6. **La espera debe comunicarse.** El sistema indica fase, alcance y acción disponible.
7. **Un placeholder no es un resultado.** No puede copiarse ni exportarse como contenido.
8. **Los proveedores son reemplazables.** Mathpix no define el modelo interno.
9. **El contenido no soportado se conserva.** Un diagrama puede mantenerse como imagen antes que reconstruirse incorrectamente.
10. **La privacidad se diseña desde el inicio.** Especialmente por la posible participación de menores.

## 7. Alcance por horizonte

### 7.1. Prototipo

El prototipo debe validar las hipótesis de mayor riesgo con el menor alcance posible. No es una implementación completa de todos los requisitos P0.

### 7.2. P0 — Primera versión utilizable

Incluye el flujo productivo de español y matemáticas, cuentas privadas, varias páginas, trabajos durables, revisión, edición, composición, PDF, seguridad, eliminación y operación básica.

### 7.3. P1 — Expansión

Incluye segundo OCR, glosarios, unidades, contexto educativo, reprocesamiento por bloque, diagramas de flujo y gráficas editables.

### 7.4. P2 — Especialización

Incluye química avanzada, procesadores de biología, mecánica y mecatrónica, organizaciones, colaboración y exportadores adicionales.

## 8. Evaluación de la visión actual

### 8.1. Fortalezas

- El problema y el usuario principal están claros.
- Existe una diferencia explícita entre transcripción, edición y corrección.
- El control de calidad previo protege experiencia y costo.
- La fluidez está tratada como requisito de producto, no solo como optimización técnica.
- La arquitectura permite agregar disciplinas sin crear un sistema separado para cada una.
- El fallback visual evita perder diagramas o contenido todavía no soportado.
- La documentación mantiene trazabilidad entre requisitos, casos de uso, arquitectura y validación.

### 8.2. Riesgo principal

La visión completa es amplia. Si se intenta implementar desde el primer prototipo español, matemáticas, IA, química, diagramas, gráficas, editor completo y operación productiva, será difícil saber qué parte aporta valor y aumentará mucho el tiempo hasta obtener evidencia.

La amplitud debe estar presente en el **diseño del modelo**, pero no en la **cantidad de funciones del prototipo**.

### 8.3. Incógnitas que más importa resolver

1. ¿Qué precisión ofrece Mathpix sobre muestras manuscritas reales en español y contenido mixto?
2. ¿Cuánto mejora o empeora el OCR con las distintas variantes de imagen?
3. ¿Puede detectarse una captura irrecuperable sin rechazar demasiadas fotos válidas?
4. ¿Qué geometría devuelve el OCR y qué tan bien permite relacionar bloque y recorte?
5. ¿Cuál es la latencia y el costo por página?
6. ¿Los usuarios pueden corregir ambigüedades más rápido que transcribir manualmente?
7. ¿Los resultados parciales hacen que la experiencia se perciba suficientemente fluida?
8. ¿El modelo canónico puede representar texto, ecuaciones y figuras sin depender de Mathpix o Tiptap?

## 9. Prototipo recomendado

Se recomienda construir dos incrementos consecutivos.

### 9.1. Prototipo A — Prueba técnica

**Objetivo:** reducir incertidumbre sobre imagen, OCR, geometría, latencia y costo antes de construir un editor amplio.

Debe permitir:

1. Seleccionar una imagen manuscrita.
2. Ejecutar métricas básicas de calidad.
3. Generar pocas variantes controladas:
   - Original normalizado.
   - Corrección de iluminación o contraste local.
   - Una variante de umbral solo cuando sea pertinente.
4. Enviar la variante seleccionada a Mathpix.
5. Conservar respuesta, tiempos y consumo.
6. Mostrar texto, ecuaciones, confianza y geometría disponible.
7. Comparar los resultados de variantes sin presentarlos como verdad.
8. Exportar métricas para el benchmark.

Este incremento puede comenzar como una herramienta interna. No necesita todavía autenticación productiva, IA, plantillas ni colaboración.

### 9.2. Prototipo B — Rebanada vertical de experiencia

**Objetivo:** demostrar el recorrido esencial de principio a fin.

Debe permitir:

1. Cargar entre una y tres imágenes JPEG o PNG.
2. Mostrar miniaturas inmediatamente.
3. Rechazar una captura claramente irrecuperable con una recomendación útil.
4. Conservar original y derivado.
5. Crear un trabajo asíncrono.
6. Mostrar fases reales y resultados parciales.
7. Normalizar bloques básicos:
   - `paragraph`
   - `heading`
   - `equation`
   - `figure`
   - `unknown`
8. Comparar la imagen con la transcripción.
9. Editar texto y LaTeX básico.
10. Señalar al menos una clase de ambigüedad.
11. Guardar una versión simple del documento.
12. Generar un PDF básico.
13. Registrar latencia, fallos y costo aproximado.

## 10. Qué debe quedar fuera del primer prototipo

- Reconstrucción editable de diagramas.
- Digitalización de gráficas.
- Reconocimiento químico especializado.
- Procesadores de biología, mecánica o mecatrónica.
- Segundo OCR.
- Colaboración con docentes o tutores.
- Organizaciones educativas.
- Editor visual avanzado con todas las opciones de diseño.
- Exportación a DOCX, PPTX u otros formatos.
- Revisión académica generativa completa.
- Aplicación móvil nativa.
- Infraestructura de producción multi-región.

LanguageTool y SymPy pueden incorporarse después de validar el flujo principal. Son valiosos, pero no deben ocultar primero los riesgos de captura, OCR y revisión.

## 11. Arquitectura del prototipo

La base aprobada continúa siendo válida:

| Capa | Tecnología |
| --- | --- |
| Aplicación | React + TypeScript + Vite |
| API | Python + FastAPI |
| Datos | PostgreSQL |
| Archivos | S3 compatible; MinIO local |
| Trabajos | Celery + Redis |
| Imagen | OpenCV + scikit-image |
| OCR | Adaptador Mathpix |
| Matemáticas UI | MathLive + KaTeX |
| Exportación | HTML/CSS + Playwright |
| Progreso | SSE con consulta de respaldo |

Para el prototipo conviene desplegar un **monolito modular**, una API y workers, no microservicios independientes.

La primera prueba técnica puede ejecutarse antes de integrar todo el stack, pero cualquier resultado que continúe hacia la rebanada vertical debe entrar mediante el adaptador OCR y el modelo canónico.

## 12. Datos de prueba recomendados

Antes de medir debe prepararse un conjunto pequeño pero variado, con autorización adecuada o contenido sintético:

- 30 a 50 páginas para la primera evaluación.
- Texto manuscrito en español.
- Texto mezclado con ecuaciones.
- Tinta oscura y lápiz tenue.
- Buena y mala iluminación.
- Desenfoque recuperable e irrecuperable.
- Páginas inclinadas o con perspectiva.
- Al menos algunas tablas, gráficas y diagramas para comprobar el fallback visual.

Cada página debería etiquetarse con:

- Calidad esperada.
- Transcripción de referencia.
- Regiones principales.
- Tipo de contenido.
- Condición de captura.

No se necesita una muestra estadísticamente definitiva para el prototipo; sí una muestra estable que permita comparar cambios de forma reproducible.

## 13. Criterios de éxito propuestos para el prototipo

El prototipo habrá cumplido su función si permite responder con evidencia:

1. Qué clases de páginas puede transcribir con utilidad.
2. Qué defectos de captura debe rechazar.
3. Qué transformación mejora cada categoría y cuál destruye información.
4. Cuánto tarda cada fase y cuánto cuesta cada página.
5. Cuánto contenido necesita corrección manual.
6. Si la correspondencia entre imagen y bloque facilita la revisión.
7. Si un usuario completa el recorrido hasta PDF sin una segunda herramienta.
8. Si el modelo interno admite figuras no interpretadas sin perderlas.

Objetivos de experiencia iniciales:

- Respuesta visual local en menos de 100 ms p95.
- Diagnóstico inicial de calidad en menos de 1.5 s p95 en el dispositivo de referencia.
- Primer resultado útil objetivo en menos de 15 s p95 cuando Mathpix esté saludable.
- Ningún original sobrescrito.
- Ningún placeholder exportado como resultado.
- Ningún envío facturable cuando la captura haya sido clasificada como críticamente irrecuperable.

Los objetivos de precisión deberán fijarse después del primer benchmark y separarse por texto, matemáticas y estructura.

## 14. Decisiones necesarias antes de iniciar

Solo se necesitan unas pocas decisiones para comenzar el prototipo:

1. **Corpus inicial:** origen, autorización y categorías de las muestras.
2. **Credenciales y presupuesto de Mathpix:** límite máximo para las pruebas.
3. **Modo del prototipo:** local/interno o accesible a evaluadores invitados.
4. **Política temporal de datos:** cuánto tiempo conservar originales y resultados de prueba.
5. **Dispositivos de referencia:** al menos un escritorio y un móvil de gama media.
6. **Definición de finalización:** Prototipo A solamente o también la rebanada vertical B.

No es necesario resolver todavía:

- Proveedor OIDC definitivo, si el prototipo permanece interno.
- Segundo OCR.
- Proveedor de IA.
- Editor genérico de diagramas.
- Currículo educativo completo.
- Planes comerciales.

## 15. Secuencia recomendada

```text
1. Preparar corpus y métricas
2. Construir Prototipo A
3. Ejecutar benchmark de calidad, OCR, latencia y costo
4. Ajustar umbrales y modelo canónico
5. Construir Prototipo B
6. Probar con pocos usuarios
7. Revisar visión, P0 y arquitectura con evidencia
8. Convertir lo validado en backlog de MVP
```

## 16. Conclusión de la revisión

La visión actual es coherente y tiene un diferenciador claro: **convertir un manuscrito en un entregable verificable mediante una experiencia rápida y controlada por el alumno**.

La arquitectura propuesta es adecuada para evolucionar a múltiples disciplinas, pero el siguiente paso no debería ser construir todo el P0. Debe ser un prototipo enfocado en los riesgos centrales:

- Calidad de imagen.
- Precisión de OCR mixto.
- Relación entre imagen y transcripción.
- Latencia y costo.
- Revisión rápida de ambigüedades.
- Recorrido mínimo hasta PDF.

Si estas hipótesis se validan, será razonable ampliar hacia corrección lingüística, validación matemática, diagramas, gráficas y otras disciplinas. Si no se validan, el prototipo permitirá ajustar el producto antes de invertir en las capacidades más costosas.
