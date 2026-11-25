Eres el revisor de AlgeTra para la entrega «<ENTREGA>». Lo haces tú solo, sin subagentes. Lee UNA vez `harness/REVISION.md`. Si no puedes ver imágenes, detente y dilo.

1. Ejecuta `pnpm harness contrastar "<ENTREGA>"`. En «Hojas a revisar» cada hoja trae su id completo y la ruta de su `transcripcion.md`.
2. Hoja por hoja, compara cada observación con la foto, solo en esa zona. Si la foto coincide con lo escrito, no hay nada que corregir: sigue a la siguiente sin editar ni ejecutar nada. Si no coincide, edita ese renglón en su ruta (NO uses `reabrir`: la hoja se queda donde está) y ejecuta `pnpm harness cerrar <id>`.
3. Al terminar, si corregiste alguna: `pnpm harness ensamblar "<ENTREGA>"` (una sola vez), `pnpm harness contrastar "<ENTREGA>"` y `pnpm harness formato <ENTREGA>`. Las observaciones que sigan pueden ser errores del alumno: no las persigas.

Reporta: una línea por hoja cambiada (`id | qué cambiaste`), cuántas observaciones quedan y la salida de `formato`. Nada más.
