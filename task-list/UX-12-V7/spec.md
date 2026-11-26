# UX-12-V7 — Especificación

## Fuentes

- Solicitud del propietario del 2026-11-26 y kit V7 adjunto.
- `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md`, `task-list/TASKS.md` y ficha F14.

## Criterios y resultado

1. Sidebar reutilizable con identidad, rutas, foco/teclado, estado activo, cierre de sesión y responsive en rutas estudiantiles: PASS; producción revisada con Ego Lite Estudiante, 320/390 px sin overflow y menú móvil funcional.
2. Review React en tres etapas, ilustraciones canónicas, repositorio público, commits recientes y SHA completo resuelto por backend, confirmación explícita y vínculo académico existente: PASS. En producción se seleccionó un commit público y se llegó a Confirmación; no se inició IA.
3. No invocar el motor durante la selección ni cambiar permisos/rúbricas: PASS, comprobado visualmente y en código.
4. Dos commits funcionales separados: PASS; `5f4bcee` (sidebar) y `0f8d4e1` (Review). Correcciones preservadas como commits posteriores.
5. Tests, typecheck, lint y build: PASS. Ego Lite comparó la referencia y validó producción en desktop/móvil; evidencia total 4 archivos.
6. Integración normal y F14: PASS; PR #349, #348 y #350 integradas; tag anotada `v0.5.97` en `main`, F14 `45770050876` SUCCESS, backup/rollback y salud productiva verificados.
7. Hallazgo visual post-release en badge de footer corregido en PR #352 y desplegado por `v0.5.97`; medido a 101×28 px en Mis aulas.

## Estado

COMPLETA. `main` tiene la implementación y el fix final en `0cfb841fa5031754c8770cff4db10fa4b2e4274f`. La producción corre `v0.5.97`; detalle en `evidencie.md` e `UX-12-V7_EVIDENCIAS/INFORME_FINAL.md`.
