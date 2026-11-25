# Revisión por contraste (manual corto del revisor)

Objetivo: dejar las hojas ya transcritas apegadas a lo que de verdad dice la foto, usando el enunciado de la base solo para saber DÓNDE volver a mirar. No es una segunda transcripción completa.

## Reglas
1. **La foto manda.** El enunciado y el verificador te dicen dónde dudar; la corrección sale de lo que ves en la foto, nunca de lo que "debería" salir. No copies resultados del enunciado ni "arregles" errores del alumno: si el alumno se equivocó, queda igual.
2. **Excepción: datos copiados del enunciado** (la matriz o el sistema inicial, los puntos de la figura). Si la foto es ambigua en un signo o dígito de esos datos, usa el enunciado para decidir; si la foto claramente difiere (el alumno copió mal), deja lo de la foto.
3. Una celda o flecha con duda real que la foto no resuelve: `[?]` o `<!-- DUDA: … -->` de una línea. No inventes.

## Qué revisar (solo lo que marque `pnpm harness contrastar`)
- **Datos del enunciado / operaciones entre renglones**: mira solo las celdas señaladas (fila, columna) en la foto. Signos que no son, dígitos parecidos (1/7, 4/9, 5/6, 0/6), signos menos confundidos con guiones de matriz. Si la operación escrita (`R_2 → R_2 − 3R_1`) no produce la matriz siguiente, o leíste mal o el alumno se equivocó; solo la foto lo dice.
- **Método con sentido**: el procedimiento transcrito debe ser el que pide el enunciado (proyección: `\frac{u\cdot v}{|v|^2}v`; Gauss-Jordan: operaciones entre renglones hasta la identidad; producto cruz: determinante con i, j, k; inversa: [A|I]; etc.). Si lo transcrito no se parece al método, probablemente un símbolo está mal leído.
- **Figuras y flechas** (`pnpm harness figuras <id>` dibuja cada figura como PNG): compara contra la foto, una por una: origen y PUNTA de cada flecha, sentido, a qué cuadrante apunta, longitud relativa, qué vector es cuál (etiqueta), y puntos y rectas. Corrige el JSON del bloque `grafica`. En 3D, comprueba que las coordenadas escritas junto a las puntas son las del bloque. No pongas rótulos "x"/"y" como texto: el motor ya rotula los ejes.

## Comentarios de la persona (`pnpm harness comentarios <entrega|id>`)
La persona revisa en la interfaz («Revisar con comentarios») renglón por renglón. Cada comentario trae el renglón de `transcripcion.md`. Atiéndelos igual que las observaciones: foto primero, edición mínima. Comentarios típicos: dígito/signo mal leído; falta un paso; el enunciado quedó pegado a otro ejercicio; pasos de dos ejercicios o columnas intercalados (transcribe cada columna completa, con su `<!-- inciso: x -->`); sumas «a dos pisos» (bloque ```aux, fuera del documento); vector unitario mal leído (`i`, `j`, `k`: símbolos, dentro de la fórmula). Al terminar: `pnpm harness atender <id> <n,n|todos> --nota "…"` y `cerrar`.

## Resultado final contra la resolución de referencia
`contrastar` compara el resultado final de cada ejercicio con una resolución hecha con los mismos métodos del curso. No te dice el valor esperado, solo «distinto» o «no aparece»: vuelve a la foto en esa zona. Si la foto confirma lo escrito, es error del alumno y se queda.

## Procedimiento por hoja (máximo 4 por encargo)
1. `pnpm harness reabrir <id>` (la hoja pasa a en_proceso).
2. Mira la foto en lo marcado; edita `transcripcion.md` solo donde corresponda (edición mínima, no reescribas la hoja).
3. Si tocaste figuras: `pnpm harness figuras <id>` y mira el PNG junto a la foto.
4. `pnpm harness cerrar <id>` (re-valida y vuelve a ensamblar la entrega solo).
5. Respuesta por hoja: `id | qué cambiaste (≤12 palabras) | pendiente`. Si no cambiaste nada, dilo: es un resultado válido.

## Límites
No leas `corpus/` entero (usa lo que imprime `contrastar`), no edites código ni manuales, no toques hojas que no te asignaron. Si un comando falla de forma rara, reporta el error y termina.
