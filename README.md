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

## Flujo de uso

1. **+ Nueva prueba** (opcional: desactivar *modo página completa* para comparar).
2. **Subir fotos**: 1 o un lote. Se transcriben en paralelo (3 a la vez) y puedes empezar a revisar mientras terminan.
3. En cada página: compara la imagen con la transcripción, corrige (hay una paleta de símbolos de álgebra lineal: φ, Φ, matrices, vectores, det, ker…), valora y etiqueta el tipo de error. Confirma.
4. **Precisión**: fórmulas exactas, error de tokens LaTeX, CER del texto, latencia, costo, dónde falla. Descarga el informe `.md`.
5. **Descargar DOCX** (corregido u original). Antes avisa si alguna fórmula no se pudo convertir a ecuación de Word.

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
