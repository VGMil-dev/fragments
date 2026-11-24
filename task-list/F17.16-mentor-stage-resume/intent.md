# F17.16 — Reanudar Mentor en la etapa pendiente

## Problema

F17.15 permite reabrir una propuesta desde su URL, pero `restoreEvaluation=true` llevaba cualquier propuesta directamente a Evaluación antes de recuperar el resultado. Si todavía faltan objetivos o alcance y no existe evaluación persistida, la persona vuelve a una etapa prematura.

## Objetivo

Al reanudar una propuesta desde URL, mantener Evaluación solo cuando se restaura un resultado persistido o la propuesta supera la validación; cuando faltan campos iniciales, abrir su etapa de trabajo correspondiente. Un fallo/no encontrado de recuperación no debe alterar esa etapa ni iniciar una evaluación.

## No objetivos

- No modificar API, contratos, base de datos, permisos, rúbricas, prompts o proveedores.
- No ejecutar evaluaciones IA ni guardar datos en producción.
- No alterar la etapa inicial de una propuesta recién creada o abierta en el flujo normal.

## Owner y alcance

Planner — `apps/web/src/features/mentor/mentor-screen.tsx`, su prueba focal y `task-list/F17.16-mentor-stage-resume/`.
