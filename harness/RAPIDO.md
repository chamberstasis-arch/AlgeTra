# Transcripción rápida (manual corto para subagentes)

Objetivo: transcribir la hoja tal como está escrita, rápido y barato. Una sola pasada. Lo ilegible es `[?]`; nunca inventes un dígito.

## Por hoja (5 pasos)
1. `pnpm harness siguiente` (solo la primera vez) → te da el id y la ruta de la imagen. Mírala UNA vez (la copia mejorada solo si el comando dice que la calidad es mala).
2. Escribe `transcripcion.md` de una vez, sin pensar en voz alta y sin repasar la imagen otra vez.
3. **Revisión de formato (solo del texto que escribiste, sin volver a mirar la imagen)**, antes de cerrar: ¿cada renglón de desarrollo en su `$$…$$`?; ¿sin `# ` encabezados?; ¿tablas como tablas de barras (`| a | b |` con renglón `|---|---|`)?; ¿matrices con el delimitador correcto y filas/columnas completas?; ¿la marca `<!-- ejercicio: act-NN/N -->` donde empieza la actividad?; ¿sin comentarios sobrantes ni fecha/nombre del encabezado? Corrige en el mismo archivo.
4. `pnpm harness cerrar <id> --siguiente` (valida, cierra y te entrega la hoja siguiente en la misma respuesta; no ejecutes `validar` ni `siguiente` aparte). Si dice "No se puede cerrar", corrige exactamente lo que indica y repite. Una aritmética que no cuadra NO bloquea: no reexamines la imagen por eso.
5. Repite con la hoja que te dio, hasta que se acabe tu encargo.

## Formato
- Texto normal; fórmulas en LaTeX: `$a+b$` en línea, `$$…$$` en renglón propio (cada renglón de desarrollo del alumno, su propio `$$`).
- Matrices con el delimitador del alumno: `pmatrix` ( ), `bmatrix` [ ], `vmatrix` | |. Aumentada: `\left[\begin{array}{cc|c}…\end{array}\right]`. Resultado recuadrado: `\boxed{…}`.
- Respeta el orden de la hoja (texto, fórmulas, gráficas). No resuelvas ni corrijas: si el alumno se equivocó, queda igual.
- Tachado: no lo transcribas y no lo comentes. Sellos y marcas del docente: ignóralos sin mencionarlos.

## Marca de actividad (solo para ordenar)
- Al empezar una actividad escribe `<!-- ejercicio: act-NN/1 -->` con NN = el número que el alumno escribió en el encabezado ("Actividad 7" → `act-07/1`). Al empezar otro ejercicio de la misma actividad, `<!-- ejercicio: act-07/2 -->`.
- NO consultes la base de actividades (`actividades`) ni `corpus/`. NO transcribas fecha, nombre ni "Actividad N" del encabezado; sí el enunciado.
- Una hoja sin encabezado continúa la anterior: no repitas la marca.

## Gráficas (sin esfuerzo extra)
- Cartesiana sencilla: bloque ```grafica con `{"tipo":"cartesiana","escala":"sin_valores"|"leida"|"inferida","x":[a,b],"y":[a,b],"elementos":[{"t":"recta","puntos":[[x,y],[x,y]]},{"t":"punto","en":[x,y],"etiqueta":"P"},{"t":"vector","a":[x,y]}]}`. Sin etiquetas ni detalles decorativos.
- Figuras en 3D / hojas isométricas: NO las dibujes. Escribe una sola línea `[Gráfica 3D: qué vectores o puntos con sus coordenadas escritas]` y sigue. La persona las revisa.

## Comentarios
Ninguno, salvo `<!-- DUDA: … -->` de una línea cuando de verdad dudes entre dos lecturas, y solo si importa. Nada de notas largas ni de `--nota`.

## Límites
Solo escribes en tu hoja de `trabajo/en_proceso/<id>/`. No leas `corpus/`, no edites código ni manuales. Si un comando falla de forma rara, reporta el error y termina.
