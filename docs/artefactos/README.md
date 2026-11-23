# Artefactos documentales

Esta carpeta contiene entregables documentales agrupados para revisar, diseñar y prototipar AlgeTra.

## Artefactos

1. [ART-001 — Base documental actual](./00-base-documental.md)
2. [ART-002 — Requisitos funcionales en EARS](./01-requisitos-funcionales-ears.md)
3. [ART-003 — Requisitos no funcionales en EARS](./02-requisitos-no-funcionales-ears.md)
4. [ART-004 — Historias de usuario](./03-historias-de-usuario.md)
5. [ART-005 — Flujo de usuario y sistema](./04-flujo-de-usuario-y-sistema.md)
6. [ART-006 — Feature Breakdown Structure](./05-feature-breakdown-structure.md)
7. [ART-007 — Feature Model](./06-feature-model.md)
8. [ADR-001 — Arquitectura de monolito modular escalable](./07-adr-001-arquitectura-monolito-modular.md)
9. [ART-008 — MVP experimental del prototipo inicial](./08-mvp-prototipo-inicial.md)
10. [ART-009 — Catálogo orientativo de endpoints del MVP-0](./09-catalogo-endpoints-mvp-0.md)
11. [ART-010 — Contrato API y documentación Scalar del MVP-0](./10-contrato-api-mvp-0.md)
12. [ART-011 — Contraste de la UI y plan de mejora del frontend](./11-contraste-ui-y-plan-de-mejoras.md)
13. [ART-012 — Arquitectura de API y procesamiento extensible por terceros](./12-arquitectura-api-procesamiento-extensible.md)
14. [ART-013 — Alcance separado de frontend y backend](./13-alcance-front-back-mvp.md)
15. [ART-014 — Matriz versionable de evaluación OCR y proveedores](./14-matriz-evaluacion-ocr-y-proveedores.md)
16. [ART-015 — MVP funcional de transcripción con Mathpix (álgebra lineal)](./15-mvp-transcripcion-mathpix.md)
17. [ART-016 — Base de actividades y verificación de la transcripción](./16-corpus-actividades-y-verificacion.md)
18. [ART-017 — Gráficas de libreta y modelo de IA local (investigación)](./17-graficas-y-modelo-local.md)
19. [ART-018 — Alternativas de OCR por precisión en matemática manuscrita](./18-alternativas-ocr-precision.md)

## Relación con la documentación normativa

La [ERS](../03-ers-especificacion-de-requisitos.md) continúa siendo la fuente normativa principal. Los requisitos EARS de esta carpeta formalizan el alcance del prototipo y sirven como base verificable para su implementación; no sustituyen los requisitos globales P0, P1 y P2.

Las historias de usuario explican el valor desde la perspectiva del usuario. El diagrama describe la interacción propuesta entre usuario, aplicación, API, workers y proveedores. El FBS descompone las capacidades del producto y el feature model define sus combinaciones válidas. El ADR formaliza la decisión de arquitectura y los criterios para cambiarla.
