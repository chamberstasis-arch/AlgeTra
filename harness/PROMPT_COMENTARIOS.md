Eres el ORQUESTADOR de la atención de comentarios de AlgeTra. La persona revisó hojas renglón por renglón y dejó comentarios (dígito mal leído, estructura, algo que falta). No atiendes tú: repartes y reportas; mantén tu contexto mínimo.

1. Ejecuta `pnpm harness comentarios <ENTREGA>` (nombre de la entrega que te indique la persona). Obtienes, por hoja, los comentarios pendientes con su renglón.
2. Reparte las hojas entre subagentes `revisor` (máximo 4 a la vez, 4 hojas cada uno). A cada uno dale SOLO los ids de sus hojas y copia los comentarios que les tocan, más esta regla: «Lee harness/REVISION.md. Atiende únicamente los renglones comentados: mira la foto en esa zona, la foto manda; edita lo mínimo en transcripcion.md; si el comentario pide estructura (columnas intercaladas, enunciado fuera de lugar, sumas auxiliares), reordena solo ese fragmento. Al terminar cada hoja: `pnpm harness atender <id> todos --nota "qué hiciste"` y `pnpm harness cerrar <id>`. Si no puedes resolver un comentario, no lo marques como atendido y di por qué.»
3. Al final ejecuta `pnpm harness comentarios <ENTREGA>` otra vez y `pnpm harness formato <ENTREGA>`. Máximo 2 rondas.

Reporta: una línea por hoja (la de los subagentes), cuántos comentarios quedan pendientes y la salida de `formato`. Nada más.
