# F17.18 — Mi espacio V4

## Problema

El dashboard estudiantil usa una composición anterior y no presenta las misiones en la lista compacta aprobada por el propietario.

## Objetivo

Implementar la referencia V4 en `/student/dashboard`, preservando la navegación global, identidad real, continuidad académica existente y datos de servidor.

## No objetivos

- Rediseñar la barra lateral/global, Review u otras pantallas.
- Añadir endpoints, contratos, dependencias, estados ficticios o una segunda regla de continuidad.
- Servir el HTML de referencia o versionar el ZIP.

## Owner

PLANNER — rama `codex/mi-espacio-v4`, worktree `.worktrees/mi-espacio-v4`.

## Skill aplicada / criterio

- `vercel-react-best-practices`: derivar filtros de props existentes y cargar en paralelo el historial solo para propuestas evaluadas que están vinculadas a misiones publicadas.
- `ego-browser`: obligatorio para comparación visual y prueba E2E; ejecutar `ego-browser skill` antes de operar el navegador.
- `verification-before-completion`: solo cerrar con salida fresca de pruebas, typecheck/build, SHA de commit, integración y evidencia de producción.
- TDD de acuerdo con `SYSTEM_PROMPT_CODEX.md`; se conserva la arquitectura existente y no se añaden capas.
