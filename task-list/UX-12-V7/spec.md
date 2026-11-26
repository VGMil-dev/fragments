# UX-12-V7 — Especificación

## Fuentes

- Solicitud del propietario del 2026-11-26 y kit V7 adjunto.
- `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md`, `task-list/TASKS.md` y ficha F14.

## Criterios

1. Sidebar reutilizable con identidad, rutas, foco/teclado, estado activo y cierre de sesión; comportamiento responsive en las rutas estudiantiles existentes.
2. Review traduce el prototipo a React: una etapa a la vez, ilustraciones originales, repositorio público verificado, diez commits de rama predeterminada, SHA completo/enlace resuelto por backend, confirmación explícita y vínculo académico existente.
3. No se invoca el motor Review durante la selección. No se cambian permisos ni rúbricas.
4. Dos commits funcionales independientes con los subjects solicitados por el propietario.
5. Tests, typecheck, lint y build existentes; revisión visual comparativa con Ego Lite desktop y móvil; evidencia <=20 archivos.
6. Release y despliegue solamente con controles F14 efectivos, procedencia, aprobación, backup y rollback.

## Estado

Implementación local en worktree `D:\Dev\Trabajo\Fragments-review-v7`, rama `codex/review-v7`, derivada de `origin/main` `2a9fbeecbe3b83c5f2e28ad75f3dd9171a17c783`. Faltan verificaciones runtime y pasos de integración/release/deploy: no declarar completa.
