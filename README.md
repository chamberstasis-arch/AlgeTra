# AlgeTra — MVP de transcripción (álgebra lineal)

Sube fotos de hojas manuscritas (de una en una o en lotes de 10 o más), transcríbelas con **Mathpix**, corrige lo que falle y mide la exactitud. Descarga un **DOCX con las fórmulas como ecuaciones nativas de Word**. Detalle, límites verificados de la API y protocolo de prueba: [`ART-015`](docs/artefactos/15-mvp-transcripcion-mathpix.md).

## Inicio rápido

```bash
pnpm install
cp .env.example .env        # y completa MATHPIX_APP_ID / MATHPIX_APP_KEY
pnpm dev:all                # API en :3001 + interfaz en :5173
```

Abre [http://localhost:5173](http://localhost:5173). Sin credenciales puedes probar el flujo y el DOCX en **modo simulado** (no llama a Mathpix; las métricas no son reales):

```bash
pnpm dev:mock
```

Con Docker: `docker compose up --build` (interfaz en `:5173`, API en `:3001`; lee `.env` si existe). Imagen final con Nginx: `docker compose --profile production up --build` → `:8080`.

Los datos (imágenes, transcripciones, respuestas brutas) quedan en `data/`, fuera de git.

## Configurar Mathpix (primera vez)

Pasos según la documentación de Mathpix ([crear una API key](https://mathpix.com/docs/ocr/creating-an-api-key), [facturación](https://mathpix.com/docs/ocr/billing)); verifica los importes en su [página de precios](https://mathpix.com/pricing/api) antes de pagar, porque pueden cambiar:

1. Crea una cuenta en [console.mathpix.com](https://console.mathpix.com) y verifica el correo.
2. Crea una **organización** para la API de OCR.
3. Configura la **facturación**. Las claves solo funcionan con facturación activa. Mathpix no ofrece prueba gratuita; la documentación indica un pago único de **US$ 19.99** que deja **US$ 29** de saldo de prueba. Después se paga por uso (≈ US$ 0.002 por imagen).
4. En la pestaña **API keys** crea una clave: obtendrás un `app_id` y una `app_key`.
5. Pégalos **tú** en `.env` (`MATHPIX_APP_ID=…`, `MATHPIX_APP_KEY=…`, sin comillas) y pon `MATHPIX_MOCK=0`. `.env` no se sube a git. **No pegues la clave en el chat ni en ningún archivo versionado**: no hace falta; el servidor la lee de `.env` y quien trabaje contigo solo necesita ejecutar los comandos de abajo.
6. Comprueba: `pnpm mathpix:check` hace **una** petición real (≈ US$ 0.002) con una imagen mínima e indica si las credenciales funcionan.

**Controlar el gasto.** El panel de Mathpix avisa por correo según el uso por clave, pero **solo avisa, no bloquea**; la documentación no describe un tope en dólares (se pide a support@mathpix.com). Por eso el proyecto tiene su propio tope: `MATHPIX_BUDGET_USD=5` en `.env` hace que, al alcanzar ese gasto estimado, las páginas nuevas fallen con `budget_exceeded` en lugar de cobrarse. Es una estimación sobre las pruebas guardadas en `data/` (si borras pruebas, el contador baja); la cifra real está en la pestaña *Usage* de la consola.

### Entorno de pruebas con capturas

1. Copia las fotos a `pruebas/capturas/` (no se versiona).
2. Con el servidor en marcha (`pnpm dev:all`): `pnpm probar pruebas/capturas --max 3` muestra el costo estimado, pide confirmación, reduce las fotos grandes (necesita ImageMagick) y crea una prueba visible en la interfaz. Opciones: `--sin-layout` (para comparar con y sin *modo página completa*), `--nombre "Lote 1"`, `--yes`.
3. Empieza con 3 fotos, revisa el resultado y amplía el lote.

## Modo agente (harness)

Alternativa a la aplicación de Mathpix: un **agente de IA** hace de trabajador y tú lo supervisas. Detalle, límites y gráficas en [`ART-019`](docs/artefactos/19-entorno-agente-transcriptor.md).

1. `pnpm ui` → abre **http://localhost:8080** (o el siguiente puerto libre). Ahí subes fotos, PDF o DOCX (todo se convierte a imágenes), ves la cola, los resultados, el PDF y descargas DOCX/PDF.
2. Pon un nombre de **entrega** por alumno/actividad: sus hojas se ensamblan juntas, ordenadas por ejercicio e inciso.
3. Abre tu herramienta de agentes en la raíz del repo y pega el prompt (botón **Copiar prompt de inicio**, o `harness/PROMPT_INICIO.md` / `harness/PROMPT_ENTREGA.md`). El agente usa `pnpm harness siguiente → validar → cerrar`.
4. Las hojas limpias quedan en `trabajo/procesadas/`; las que tengan `[?]`, dudas, escala inferida o figuras sin dibujar, en `trabajo/revision/`.
5. Tú revisas: editas `transcripcion.md` si hace falta y ejecutas `pnpm harness aprobar <id>` (regenera el DOCX con tu versión y mide al agente). Si algo se repite, `pnpm harness aprender "regla"`. `pnpm harness reabrir <id>` devuelve una hoja al agente. `pnpm harness ensamblar <entrega>` (o el botón de la interfaz) une la entrega.
6. `pnpm harness medir` resume la exactitud sobre las hojas aprobadas.

Requisitos del sistema para PDF/DOCX y calidad de imagen: LibreOffice (`soffice`), `pdftoppm` (poppler) e ImageMagick (`magick`).

## Flujo de uso

1. **+ Nueva prueba** (opcional: desactivar *modo página completa* para comparar).
2. **Subir fotos**: 1 o un lote. Se transcriben en paralelo (3 a la vez) y puedes empezar a revisar mientras terminan.
3. En cada página: compara la imagen con la transcripción, corrige (hay una paleta de símbolos de álgebra lineal: φ, Φ, matrices, vectores, det, ker…), valora y etiqueta el tipo de error. Confirma.
4. **Precisión**: fórmulas exactas, error de tokens LaTeX, CER del texto, latencia, costo, dónde falla. Descarga el informe `.md`.
5. **Descargar DOCX** (corregido u original). Antes avisa si alguna fórmula no se pudo convertir a ecuación de Word.

## Base de actividades y verificación

Las actividades de referencia viven en `corpus/actividades/*.md` (formato en [`corpus/README.md`](corpus/README.md)). Como cada alumno resuelve a su manera, la base guarda el **enunciado y la respuesta final**, no el procedimiento. Al revisar una página asignas el ejercicio y el sistema:

- comprueba si la **respuesta esperada aparece** en lo transcrito (aritmética exacta con fracciones, sin importar el método);
- **recalcula** lo que el alumno escribió (`A+B=C`, productos, determinantes, transpuestas) y señala la **celda exacta** que no cuadra: normalmente un dígito mal leído por el OCR o un error del alumno;
- marca como *no verificable* lo simbólico; nunca lo da por correcto.

Pruebas: `pnpm test`.

## Estado verificado

- Compila (`pnpm typecheck`, `pnpm build`).
- Verificado con el **modo simulado** y contra la API real de Mathpix solo con credenciales inválidas (llega y el 401 se maneja bien). **No se ha ejecutado con credenciales válidas.**
- El DOCX se validó renderizándolo con LibreOffice; falta abrirlo en Microsoft Word.

## Estructura

```text
server/   API (Fastify): cola, cliente Mathpix, DOCX/OMML, informe
src/mvp/  interfaz React (carga, revisión, precisión)
src/shared/  tipos, parser de Mathpix Markdown y métricas (compartidos)
src/App.tsx, PrototypeApp.tsx   prototipo B de interfaz simulada → http://localhost:5173/#/prototipo
docs/     documentación y contratos
```

## Documentación

Contratos y diseño de la solución completa (no implementada aún): [`docs/api/`](docs/api/) y [`docs/artefactos/`](docs/artefactos/). La API de este MVP es mínima y no implementa el contrato `openapi.yaml`. La documentación interactiva de ese contrato queda en [http://localhost:8080/api-docs/](http://localhost:8080/api-docs/) dentro de la imagen de producción.
