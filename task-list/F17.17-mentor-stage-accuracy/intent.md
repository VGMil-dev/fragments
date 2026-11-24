# F17.17 — Mantener correcto el estado de Habilidades

## Problema

En producción v0.5.73, el borrador QA «QA CU15 — Inventario móvil Expo» mostraba Habilidades como completada. Al hacer un cambio local en Objetivos y alcance, sin tocar la selección de habilidades, el indicador Habilidades pasó a Pendiente. El cálculo usa `isDirty` global aunque la selección de habilidades sigue intacta.

## Objetivo

Mantener Habilidades como completada mientras la propuesta guardada exista y no haya cambios de habilidades sin guardar. Los cambios en otras etapas no deben invalidar ese estado. Un cambio real de habilidades debe seguir marcando la etapa pendiente hasta guardar.

## No objetivos

- No cambiar contratos, API, persistencia, misiones, permisos o rúbricas.
- No guardar datos de estudiantes en producción ni ejecutar una evaluación de IA.
- No alterar cómo se bloquea la evaluación si hay cambios sin guardar.

## Alcance

Planner — `apps/web/src/features/mentor/mentor-screen.tsx`, prueba de regresión y `task-list/F17.17-mentor-stage-accuracy/`.
