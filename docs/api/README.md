# Documentación de API — MVP-0

Esta carpeta contiene el contrato OpenAPI 3.1 de la API pública propuesta para la rebanada vertical de AlgeTra y el contrato interno del adaptador Mathpix.

## Scalar

Abrir `index.html` mediante un servidor estático para consultar la documentación interactiva:

```bash
python3 -m http.server 9000 --directory docs/api
```

Después visitar [http://localhost:9000](http://localhost:9000).

La página carga Scalar desde un CDN. El archivo `openapi.yaml` es la fuente del contrato y también puede importarse en Insomnia, Postman, Redocly o FastAPI.

## Contratos

- [`openapi.yaml`](./openapi.yaml): API pública de usuario, trabajos, revisión, preview y exportación.
- [`processing-provider-contract.md`](./processing-provider-contract.md): contrato interno común para adaptadores de terceros, router, fallback y normalización.
- [`mathpix-adapter-contract.md`](./mathpix-adapter-contract.md): contrato interno entre el worker OCR y Mathpix. No se expone al navegador.

## Alcance

El contrato usa datos de ejemplo y servidores `.invalid`; no contiene credenciales ni implica que el backend ya esté implementado. Las operaciones opcionales de LanguageTool y SymPy están marcadas con `x-mvp-status: optional` hasta resolver la decisión de entrada en MVP-0.

La API pública solicita perfiles lógicos como `ocr-stem-v1`; la selección de Mathpix u otro tercero ocurre dentro del worker. El navegador nunca recibe credenciales ni llama directamente a un proveedor.
