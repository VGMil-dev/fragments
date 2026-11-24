# F17.15 — Recuperación del proyecto al recargar Mentor

## Problema

La selección de una propuesta propia se conserva solo en estado React. Al recargar `/student/mentor`, la URL no identifica el proyecto y se muestra una propuesta vacía aunque el borrador siga guardado.

## Objetivo

Hacer que las rutas de continuidad de una propuesta propia sean recuperables después de una recarga, consultando las propuestas autorizadas del estudiante y conservando el contexto académico fijado.

## No objetivos

- No cambiar backend, contratos, persistencia, evaluaciones, rúbricas ni permisos.
- No almacenar propuestas ni datos sensibles en `localStorage` o `sessionStorage`.
- No seleccionar ni iniciar evaluaciones IA.
- No afirmar que la calidad de evaluaciones históricas queda validada.

## Owner y criterio aplicado

Planner — `apps/web/src/App.tsx`, `apps/web/src/App.student-flow.test.tsx`, `task-list/F17.15-mentor-resume/` y `task-list/TASKS.md`.
Se aplica React Best Practices para derivar la propuesta desde la URL y los datos de propuestas ya cargados; no se añade estado duplicado de selección recuperable.
