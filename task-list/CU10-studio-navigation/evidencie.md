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
- PR #329 merge normal en `main`, SHA `cbae7e6ef086435072ba7fdd64d444fae153c461`; CI #45712711075 SUCCESS. Tag anotada `v0.5.93` sobre SHA exacto; F14 run #45713111672 SUCCESS en verify-build, attest-package y publish-approved-release; GitHub Release #458719215.
- La prueba usa ClassroomStudio y APIs fake; no acredita navegación visual en viewport real.
- Producción: release #458719215 `deployed`; backup `fragments-prod-2026-11-25T22-35-49-187Z.dump`, 98,409 bytes, SHA-256 `b5a104e74059210e1d039d3c624c3437f6547b4d0bca725a1b9a489648d5d312`, `restored_to_temporary_database`. API/web en SHA exacto `cbae7e6ef086435072ba7fdd64d444fae153c461`, healthy; `/health` HTTP 200 `ok/database=ready`; bundle `/assets/index-C2-ST2lh.js` confirma versión/SHA. Timer/poll/apply path/cloudflared activos, apply finalizó success, systemd sin unidades fallidas; 75 GB libres, inodos 14 %, imágenes de v0.5.92/.91 conservadas. No se modificaron datos ni se probó rollback.
- Producción autenticada/visual: NO COMPROBADA. El runtime Ego Lite solo enumeró Spaces 0 y 3; Space 44/Profile 3 no aparece. No se abrió un Space sustituto.
