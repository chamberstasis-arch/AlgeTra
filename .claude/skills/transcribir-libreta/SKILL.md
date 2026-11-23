---
name: transcribir-libreta
description: Transcribe con fidelidad la foto de una hoja de libreta de álgebra lineal a Markdown con LaTeX, la valida con recálculo aritmético y genera un DOCX con ecuaciones nativas de Word. Úsala cuando te pidan procesar hojas de trabajo/por_procesar.
---

Lee y sigue **`harness/INSTRUCCIONES.md`** (procedimiento completo) y **`harness/APRENDIZAJES.md`** (correcciones previas) antes de tocar la primera hoja.

Resumen: `pnpm harness siguiente` → mirar la imagen → escribir `transcripcion.md` → segunda pasada celda por celda → `pnpm harness validar <id>` → corregir → `pnpm harness cerrar <id>` → detenerse y reportar. Fidelidad sobre todo: no corrijas al alumno, usa `[?]` para lo ilegible, no leas `corpus/`.
