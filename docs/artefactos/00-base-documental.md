# ART-001 — Base documental actual

> **Tipo:** agrupación documental  
> **Versión:** 1.0  
> **Estado:** vigente para la rama `develop`  
> **Fecha:** 2026-11-05

## 1. Propósito

Este artefacto agrupa la documentación creada hasta antes de iniciar el prototipo de AlgeTra. Funciona como el paquete base de visión, requisitos, producto, arquitectura, rendimiento y control documental.

La agrupación es lógica: los documentos conservan sus rutas individuales para mantener enlaces, revisiones y trazabilidad.

## 2. Fuente de autoridad

La [ERS](../03-ers-especificacion-de-requisitos.md) es la fuente normativa principal. Los demás documentos amplían, explican o verifican esa especificación.

## 3. Documentos incluidos

### 3.1. Contexto y solución

| Documento | Propósito |
| --- | --- |
| [01 — Descripción de la problemática](../01-descripcion-de-la-problematica.md) | Contexto, problema, usuarios y objetivos iniciales. |
| [02 — Enfoque de la solución](../02-enfoque-de-la-solucion.md) | Flujo multidisciplinario, calidad de imagen, OCR y revisión. |

### 3.2. Requisitos y producto

| Documento | Propósito |
| --- | --- |
| [03 — ERS](../03-ers-especificacion-de-requisitos.md) | Requisitos rectores y reglas de negocio. |
| [04 — PRD](../04-prd.md) | Visión de producto, usuarios, alcance y métricas. |
| [05 — Requisitos funcionales](../05-requisitos-funcionales.md) | Catálogo funcional con prioridades y aceptación. |
| [06 — Requisitos no funcionales](../06-requisitos-no-funcionales.md) | Rendimiento, seguridad, privacidad, calidad y escalabilidad. |
| [07 — Casos de uso](../07-casos-de-uso.md) | Interacciones principales del sistema. |

### 3.3. Diseño técnico y control

| Documento | Propósito |
| --- | --- |
| [08 — Arquitectura y tecnologías](../08-arquitectura-y-tecnologias.md) | Stack, módulos, procesamiento y evolución técnica. |
| [09 — Rendimiento y experiencia](../09-rendimiento-y-experiencia.md) | Inmediatez honesta, progreso, placeholders y rendimiento. |
| [10 — Matriz de trazabilidad](../10-matriz-de-trazabilidad.md) | Relación entre objetivos, requisitos, casos, diseño y validación. |
| [11 — Auditoría de consistencia](../11-auditoria-de-consistencia.md) | Revisión de coherencia de la línea base documental. |
| [12 — Resumen de visión y prototipo](../12-resumen-vision-y-prototipo.md) | Síntesis ejecutiva y propuesta de prototipos A y B. |

### 3.4. Auxiliares presentes en el repositorio

| Documento | Estado |
| --- | --- |
| [report.md](../report.md) | Informe auxiliar no relacionado con la visión normativa de AlgeTra. Se conserva sin integrarlo al alcance. |
| [anotar.md](../anotar.md) | Archivo auxiliar vacío. Se conserva sin contenido normativo. |

## 4. Estado de la base

- Documentación normativa: línea base 0.1.
- Arquitectura: monolito modular con workers asíncronos.
- Prototipo recomendado: primero prueba técnica de calidad/OCR y después rebanada vertical hasta PDF.
- Rama de trabajo: `develop`.
- Revisión de consistencia previa: sin contradicciones bloqueantes conocidas.

## 5. Regla de actualización

Todo cambio que afecte alcance, prioridad, arquitectura o requisitos debe actualizar la ERS y los artefactos relacionados. Después debe repetirse la auditoría de consistencia.
