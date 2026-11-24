# Evidencia F16.21 — Deduplicar misión prioritaria

## Cambios

- `apps/web/src/features/student/StudentDashboard.tsx`: quita de la lista secundaria la misión cuya versión exacta ya está representada por la propuesta prioritaria; muestra sus objetivos reales en el contexto principal y conserva las CTA de las demás misiones.
- `apps/web/src/features/student/StudentDashboard.css`: aplica el estilo existente a la lista semántica de objetivos y retira el estilo sin uso de la tarjeta duplicada.
- `apps/web/src/features/student/StudentDashboard.test.tsx`: verifica deduplicación, conservación de todos los objetivos/habilidades y CTA funcional de misión distinta.

## Verificación

- Base revisada: `origin/main` `23e5883` (incluye F16.20). Worktree limpia antes de crear `codex/f16-21-dashboard-mission-dedup`.
- TDD: la nueva prueba falló en la línea base porque el contexto principal no mostraba objetivos de la misión; después de implementar quedó verde.
- TDD: la prueba nueva falló primero porque el contexto principal no contenía los objetivos; con el delta implementado pasa.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — 1 archivo, 23/23 tests PASS.
- `pnpm --filter @fragments/web test` — 54 archivos, 297/297 tests PASS.
- `pnpm --filter @fragments/web typecheck` — PASS (`tsc -p tsconfig.json`).
- `pnpm --filter @fragments/web build` — PASS (Vite transformó 2277 módulos y finalizó). El build muestra avisos ya existentes de chunk JS >500 kB y directivas `use client` de lucide.
- Revisión reflexiva estática del diff — PASS: solo se elimina la tarjeta cuyo ID coincide con el vínculo superior; objetivos/habilidades siguen bajo la propuesta prioritaria; las otras tarjetas conservan su CTA por start/continue.
- `git diff --check` — PASS.
- Commit de implementación: `5a7180e` (`feat(F16.21): deduplicar misión prioritaria`).
- Commit documental: `48858a8` (evidencia con pruebas y SHA).
- Rama publicada por push normal; PR #254 abierto contra `main`: https://github.com/VGMil-dev/fragments/pull/254 (sin fusionar ni desplegar).
- CI `Fragments CI` run `45357649675` para el head inicial publicado: `in_progress` al consultarlo. La actualización del SHA documental genera otro run; su estado queda pendiente de consulta.
- QA visual/Ego Lite y datos productivos: no ejecutados.
