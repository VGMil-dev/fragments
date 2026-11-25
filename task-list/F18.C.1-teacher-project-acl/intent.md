# F18.C.1 — ACL de proyectos en seguimiento docente

Owner: PLANNER

## Problema y objetivo

La vista docente permite consultar el historial completo de propuestas de cualquier estudiante GitHub y enumera propuestas históricas sin propietario. Esto puede exponer borradores personales y contenido heredado a docentes sin relación académica autorizada.

Acotar el seguimiento a las propuestas ligadas a versiones publicadas de misiones en aulas activas propiedad del docente, con matrícula activa del estudiante. Mantener propuestas anónimas privadas hasta que su titular las reclame.

## No objetivos

- No cambiar contratos compartidos ni el flujo de asignar identidades GitHub verificadas.
- No modificar membresías, proyectos, evaluaciones, ni datos productivos.
- No alterar la galería de publicaciones académicas elegibles.
- No ejecutar evaluaciones IA ni hacer despliegues fuera de F14.

## Evidencia inicial

- Producción v0.5.75, Ego Lite docente Space 44/Profile 3: la vista mostró un directorio global. No se eligió ni abrió una identidad ajena.
- Inspección estática: `GET /api/teacher/students/:id/projects` solo comprueba rol docente y elegibilidad de identidad GitHub; lista todas las propuestas del usuario sin filtrar matrícula, aula o versión de misión. `GET /api/teacher/historical-projects` enumera propuestas sin `ownerUserId`.
- Fuente de producto: F18 exige ACL/continuidad antes del progreso por estudiante; F15 conserva proyectos históricos sin titular como privados hasta reclamo.
