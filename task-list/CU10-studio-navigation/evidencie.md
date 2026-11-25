# CU-10 — Evidencia

## TDD

- Rojo: `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx` — 6/7 PASS; falló el nuevo caso porque faltaba navegación contextual en el detalle del aula.
- Verde: `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx` — 7/7 PASS, incluidos cuatro destinos y foco programático (`tabIndex=-1`).
- `pnpm --filter @fragments/web test` — 58 archivos, 341/341 PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; permanecen avisos preexistentes de chunk >500 kB y directivas `use client` en lucide-react.
- `git diff --check` — PASS.

## Estado

- Código: navegación nativa por anclas a datos, estudiantes, habilidades y misiones/rúbricas dentro del aula actual; sin cambios de API ni datos.
- Commit de implementación: `0ec008a42921966ad50cb555461e16a8f36d4129` en `codex/cu10-studio-section-navigation`.
- CI/PR/F14: pendiente.
- La prueba usa ClassroomStudio y APIs fake; no acredita navegación visual en viewport real.
- Producción autenticada: NO COMPROBADA. El runtime Ego Lite actual no enumeró Space 44/Profile 3; no se abrió un perfil o Space sustituto.
