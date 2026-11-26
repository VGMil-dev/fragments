# F17.19 — Mis aulas V5

## Problema

La vista estudiantil de Mis aulas no representa la referencia V5 aprobada y mezcla aulas, contenido académico y solicitudes en una página larga.

## Objetivo

Adaptar `/student/classrooms` a la referencia V5 en React, conservando la navegación global compartida, los servicios autorizados de F18 y la continuidad existente de misiones.

## No objetivos

- Rediseñar o duplicar la barra lateral compartida.
- Crear endpoints, contratos, tablas, dependencias, estados académicos o datos de demostración.
- Cambiar permisos, publicación docente, reglas de matrícula o continuidad Mentor/Review/Trainer.
- Versionar el ZIP o HTML de referencia; solo se incorporan los assets originales utilizados.

## Owner

PLANNER — rama `codex/mis-aulas-v5`, worktree `C:/Users/vgmil/.codex/worktrees/mis-aulas-v5/Fragments`.

## Skills y criterio

- `vercel-react-best-practices`: aplicar derivación de vistas desde datos existentes, cargas concurrentes independientes y deduplicación por identidad real; sin memoización prematura.
- `ego-browser`: navegación, E2E y capturas obligatorias; leer y ejecutar `ego-browser skill` antes de operar el navegador.
- TDD conforme a `SYSTEM_PROMPT_CODEX.md`; preservar contratos, cliente y persistencia existentes.
- Verificación antes de completar: registrar salidas frescas, commit, CI, integración y resultados productivos sin afirmar estados no comprobados.
