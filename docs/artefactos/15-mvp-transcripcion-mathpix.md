# ART-015 — MVP funcional de transcripción con Mathpix (álgebra lineal)

> **Tipo:** definición del MVP implementado y protocolo de prueba<br>
> **Identificador:** `MVP-TRANSCRIPCION-001`<br>
> **Estado:** implementado; **pendiente de ejecutar con credenciales reales**<br>
> **Fecha:** 2026-11-22<br>
> **Relación:** ejecuta de forma reducida lo previsto en [ART-013](./13-alcance-front-back-mvp.md) (B0/B2) y habilita el benchmark `OCR-BENCH-001` de [ART-014](./14-matriz-evaluacion-ocr-y-proveedores.md)

## 1. Alcance

Solo **transcripción**. Una persona sube fotos de hojas manuscritas (de una en una o en lotes de 10 o más), el backend las transcribe con Mathpix, la persona corrige lo que salió mal y el sistema mide cuánto acertó el OCR. Se puede descargar un `.docx` con las fórmulas como **ecuaciones nativas de Word**.

Fuera de alcance (a propósito): autenticación, PostgreSQL/S3/Redis, SSE, PDF, calidad de captura, revisión lingüística, otros proveedores. El almacenamiento es local (`data/`, JSON + archivos) y la cola vive en memoria; es suficiente para evaluar, no para producción.

Dominio inicial: **álgebra lineal** — matrices (`pmatrix`, `bmatrix`, `vmatrix`, aumentadas), vectores (`\vec`, `\mathbf`), transformaciones (`φ`, `ϕ`, `Φ`), `det`, `ker`, `dim`, `rank`, producto interno `⟨u,v⟩`, `⊥`, `ℝⁿ`, sumatorias, sistemas de ecuaciones y funciones por casos.

## 2. Flujo

```text
foto(s) → [cliente: reduce solo si >3.5 MB] → API → disco + cola (concurrencia 3)
        → Mathpix POST /v3/text → respuesta bruta guardada → texto MMD
        → revisión humana (original vs. corregido) → métricas / informe
        → DOCX con ecuaciones OMML
```

El navegador nunca habla con Mathpix ni ve las credenciales ([contrato del adaptador](../api/mathpix-adapter-contract.md), §1).

## 3. Mathpix: lo verificado y lo que no

Fuente: documentación oficial consultada el 2026-11-22 (`docs.mathpix.com`: *Process Images*, *Limits and quotas*, *Error handling*, *Data retention*).

| Tema | Lo que dice la documentación | Cómo lo usa el MVP |
| --- | --- | --- |
| Autenticación | Cabeceras `app_id` y `app_key`. | Solo en el servidor (`.env`). |
| Envío | JSON con `src` base64 (imagen ≤ 2 MB) **o** multipart con `file` + `options_json`. Cuerpo total ≤ 5 MB. | Multipart. Rechaza localmente > 4.8 MB. |
| Delimitadores | Por defecto `\( \)` y `\[ \]`. Configurables. | `$…$` y `$$…$$`. |
| Layout | `enable_document_layout` mejora páginas con varias líneas. | Activo por defecto; se puede desactivar por prueba para comparar. |
| Sistemas/casos | `idiomatic_eqn_arrays` emite `aligned`/`cases` en vez de `array`. | Activo. |
| Retención | `metadata.improve_mathpix: false` evita guardar imagen y resultado. | Siempre `false`. |
| Errores | Casi todos llegan como HTTP 200 con `error`/`error_info`; excepciones: 401 y 429. | Se normalizan; 429, `sys_exception` y `connection_closed` se reintentan con backoff; el resto no. |
| Precio | $0.002 por imagen; puede facturar a tarifa de PDF si hay más de 12 filas de texto. | Estimación en el informe, con esa advertencia. |

**No verificado en la documentación** (se debe medir en la primera prueba real):

- cómo devuelve Mathpix las **matrices manuscritas** (`array` con `\left(…\right)` o `pmatrix`/`bmatrix`); el conversor a Word cubre ambas formas;
- cómo reconoce `\varphi` frente a `\phi` y `\Phi`, y los vectores (`\vec`, `\mathbf`);
- si el tope de 2 MB de base64 también aplica a multipart (el MVP reduce las fotos a ≤ 3.5 MB por si acaso);
- cómo cuenta Mathpix las "12 filas" para la tarifa de PDF.

> **Esta implementación no se ha ejecutado contra Mathpix con credenciales válidas.** Sí se verificó contra la API real que la petición llega, que una credencial inválida produce `http_unauthorized` y que el MVP lo reporta sin reintentar. El resto del flujo se probó con el modo simulado (`MATHPIX_MOCK=1`).

## 4. DOCX con fórmulas editables

Word no entiende LaTeX: usa **OMML** (`<m:oMath>`). Pipeline: LaTeX → MathML (Temml) → OMML (conversor propio, `server/omml.ts`).

Se escribió un conversor propio porque el paquete genérico `mathml2omml` dejaba los paréntesis/corchetes de las matrices como texto suelto (no se estiran) y perdía matrices aumentadas.

| Construcción | Representación en Word |
| --- | --- |
| `pmatrix`, `bmatrix`, `vmatrix`, `array` con `\left…\right` | Delimitador estirable + matriz (`m:d` + `m:m`) |
| Matriz aumentada `[A \| b]` | Delimitador con separador `\|` entre dos matrices |
| `cases`, `aligned`, `align` | Arreglo de ecuaciones (`m:eqArr`) con puntos de alineación |
| `\vec{v}`, `\hat{u}`, `\overline{AB}` | Acento / barra nativos |
| `\sum`, `\prod`, `\int` (con límites) | Operador n-ario (`m:nary`) |
| `\lim_{x\to a}`, `\det`, `\ker`, `\dim` | Límite / nombre de función en recto |
| `\frac`, `\binom`, `\sqrt[n]{}`, `^`, `_` | Fracción, binomial, radical, sub/superíndice |
| `φ ϕ Φ λ ℝ ⟨ ⟩ ⊥ ∈ ‖` | Caracteres Unicode en Cambria Math |

Si una fórmula no se puede convertir, **no se pierde**: queda como LaTeX en monoespaciado con resaltado amarillo y la interfaz avisa antes de descargar.

Verificación realizada: se generó un `.docx` con 19 fórmulas de álgebra lineal y se renderizó con LibreOffice (matrices con delimitadores estirables, matriz aumentada, vectores con flecha, φ/Φ, `⟨u,v⟩`, `∑` con límites, sistema alineado y función por casos). **No se abrió en Microsoft Word**; hay dos diferencias conocidas en LibreOffice que en Word deberían verse bien (`det`/`ker` en recto, espacio `\quad`). Conviene abrir el primer DOCX real en Word y confirmar.

## 5. Medición de exactitud

La **referencia** es el texto que corrige la persona. Solo cuentan las páginas marcadas como revisadas (una página sin revisar no es "correcta").

| Métrica | Definición |
| --- | --- |
| Fórmulas exactas | LaTeX idéntico tras canonicalizar (ignora espacios, `\left/\right`, `\operatorname{det}`≡`\det`, `array`≡`bmatrix`, `\dfrac`≡`\frac`, `\leq`≡`\le`). Es estricta: `\varphi` ≠ `\phi` a propósito y no hay equivalencia matemática. |
| Error de tokens LaTeX | Distancia de edición entre tokens de todas las fórmulas ÷ tokens de la referencia. |
| CER / WER del texto | Distancia de edición de caracteres / palabras del texto fuera de fórmulas. |
| Páginas sin correcciones | Revisadas cuyo texto no cambió. |
| Valoración y etiquetas | Perfecta / menores / graves / inutilizable; etiquetas de dónde falló (matriz, vector, letra griega, subíndice, signo…). |
| Operación | Latencia media y p95, confianza reportada por Mathpix, llamadas y costo estimado. |

El informe se descarga en Markdown y JSON. Con pocas páginas las cifras son orientativas, no estadísticas.

## 6. Protocolo de prueba sugerido

1. Crear `.env` con las credenciales y arrancar (`pnpm dev:all`).
2. Preparar 10–20 hojas de álgebra lineal con variedad: matrices 2×2 y 3×3, sistemas, vectores, `φ`/`Φ`, `det`/`ker`, texto en español.
3. **Prueba A**: lote de 10 con *modo página completa* activado. **Prueba B**: las mismas hojas, desactivado. Comparar fórmulas exactas y CER.
4. Revisar cada página (confirmar o corregir) y marcar valoración y etiquetas.
5. Abrir el DOCX en Word, comprobar que las fórmulas son ecuaciones editables y revisar la sección *Precisión*.
6. Probar también hojas de a una (1×1) para comparar latencia y comportamiento.

Criterio sugerido para decidir (a confirmar por el equipo): fórmulas exactas ≥ 90 % y ninguna etiqueta de error dominante en matrices o letras griegas antes de seguir con producto.

## 7. Limitaciones conocidas

- Cola en memoria: al reiniciar, las páginas en curso vuelven a encolarse; no hay idempotencia contra doble cobro si el proceso cae a mitad de una llamada.
- Sin autenticación: no exponer el servidor fuera de una red de confianza.
- Las tablas manuscritas se exportan como tabla simple de Word; no se evaluó su fidelidad.
- Las imágenes HEIC no se admiten (usar JPEG/PNG/WebP).
- La API del MVP es mínima y **no** implementa el contrato completo de [`openapi.yaml`](../api/openapi.yaml); el objetivo es medir precisión, no validar el contrato.
