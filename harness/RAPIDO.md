# Transcripción rápida (manual corto para subagentes)

Objetivo: transcribir la hoja tal como está escrita, rápido y barato. Una sola pasada. Lo ilegible es `[?]`; nunca inventes un dígito.

## Por hoja (5 pasos)
1. `pnpm harness siguiente --entrega "<la entrega que te indicaron>"` (solo la primera vez; sin `--entrega` el comando se niega si hay varias entregas en la cola) → te da el id y la ruta de la imagen. Mírala UNA vez (la copia mejorada solo si el comando dice que la calidad es mala).
2. Escribe `transcripcion.md` de una vez, sin pensar en voz alta y sin repasar la imagen otra vez.
3. **Revisión de formato (solo del texto que escribiste, sin volver a mirar la imagen)**, antes de cerrar: ¿cada renglón de desarrollo en su `$$…$$`?; ¿sin `# ` encabezados?; ¿tablas como tablas de barras (`| a | b |` con renglón `|---|---|`)?; ¿matrices con el delimitador correcto y filas/columnas completas?; ¿la marca `<!-- ejercicio: act-NN/N -->` donde empieza la actividad?; ¿sin comentarios sobrantes ni fecha/nombre del encabezado? Corrige en el mismo archivo.
4. `pnpm harness cerrar <id> --siguiente` (valida, cierra y te entrega la hoja siguiente de la MISMA entrega en la misma respuesta; no ejecutes `validar` ni `siguiente` aparte). Si dice "No se puede cerrar", corrige exactamente lo que indica y repite. Una aritmética que no cuadra NO bloquea: no reexamines la imagen por eso.
5. Repite con la hoja que te dio, hasta que se acabe tu encargo.

## Formato
- Texto normal; fórmulas en LaTeX: `$a+b$` en línea, `$$…$$` en renglón propio (cada renglón de desarrollo del alumno, su propio `$$`).
- Matrices con el delimitador del alumno: `pmatrix` ( ), `bmatrix` [ ], `vmatrix` | |. Aumentada: `\left[\begin{array}{cc|c}…\end{array}\right]`. Resultado recuadrado: `\boxed{…}`.
- Respeta el orden de la hoja (texto, fórmulas, gráficas). No resuelvas ni corrijas: si el alumno se equivocó, queda igual.
- **Sumas y restas "a dos pisos"** (cuentas auxiliares al margen: un número arriba, otro abajo, raya y resultado): ponlas SIEMPRE, cada una en un bloque aparte; suelen ser ilegibles y se depuran después, así que no pierdas tiempo en dudar de un dígito (`[?]`). Formato: una línea ```aux, luego `$$\begin{array}{r} 12 \\ -\ 7 \\ \hline 5 \end{array}$$`, y cierra con ```. Van fuera del documento final.
- **Vectores unitarios** `i`, `j`, `k` (y `w`, `u`, `v`… si el alumno los usa): son SÍMBOLOS, no variables ni números. Escríbelos siempre dentro de la fórmula (`$2i - 3j + k$`); el sistema los pone en negrita recta. No los confundas con índices (`R_i`), con signos ni con la `i` de una palabra. Un `-` antes de `j` es el signo del componente.
- Tachado: no lo transcribas y no lo comentes. Sellos y marcas del docente: ignóralos sin mencionarlos.

## Marca de actividad (solo para ordenar)
- Al empezar una actividad escribe `<!-- ejercicio: act-NN/1 -->` con NN = el número que el alumno escribió en el encabezado ("Actividad 7" → `act-07/1`). Al empezar otro ejercicio de la misma actividad, `<!-- ejercicio: act-07/2 -->`.
- NO consultes la base de actividades (`actividades`) ni `corpus/`. NO transcribas fecha, nombre ni "Actividad N" del encabezado; sí el enunciado.
- Una hoja sin encabezado continúa la anterior: no repitas la marca.
- **El enunciado va CON su ejercicio.** El alumno suele copiar la descripción de la actividad en el renglón de justo antes del primer ejercicio; ponla DESPUÉS de la marca (`<!-- ejercicio: act-15/1 -->` y debajo el enunciado), no antes: si la dejas arriba se pega a la actividad anterior. (El sistema ya mueve a mano hasta 3 renglones de enunciado, pero no dependas de eso.)
- **Estructura intercalada.** Si el alumno trabaja en varias columnas o va alternando pasos de dos ejercicios, transcribe una columna/ejercicio completo y luego el siguiente (cada uno con su marca `<!-- inciso: x -->`), no renglón por renglón en zigzag. Una progresión de matrices en un solo renglón sigue en un solo renglón.

## Gráficas (sin esfuerzo extra)
- Cartesiana sencilla: bloque ```grafica con `{"tipo":"cartesiana","escala":"sin_valores"|"leida"|"inferida","x":[a,b],"y":[a,b],"elementos":[{"t":"recta","puntos":[[x,y],[x,y]]},{"t":"punto","en":[x,y],"etiqueta":"P"},{"t":"vector","a":[x,y]}]}`. Sin etiquetas ni detalles decorativos.
- **Figuras en 3D / hojas isométricas: SÍ se dibujan** (ya no hay excusa; la hoja irá a revisión por la escala, es lo esperable). Un bloque por figura: ```grafica `{"tipo":"r3","escala":"inferida","proyeccion":"isometrica","cuadricula":true,"elementos":[{"t":"vector","a":[x,y,z]},{"t":"punto","en":[x,y,z],"etiqueta":"P"},{"t":"segmento","puntos":[[…],[…]]}]}`. Las coordenadas escritas junto a cada punta son las del vector. Hoja con solo los ejes y sin nada más: un bloque con un `punto` en `[0,0,0]` basta; no inventes vectores. Nunca dejes `[Gráfica 3D: …]` como sustituto.
- En 2D, el vector va del origen a la punta que se ve en la foto; los ejes los rotula el motor (no pongas "x"/"y" como texto).

## Comentarios
Ninguno, salvo `<!-- DUDA: … -->` de una línea cuando de verdad dudes entre dos lecturas, y solo si importa. Nada de notas largas ni de `--nota`.

## Límites
Solo escribes en tu hoja de `trabajo/en_proceso/<id>/`. No leas `corpus/`, no edites código ni manuales. Si un comando falla de forma rara, reporta el error y termina.
