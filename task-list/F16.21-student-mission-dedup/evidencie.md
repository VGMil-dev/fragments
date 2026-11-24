# Evidencia F16.21 — Deduplicar misión prioritaria

## Estado actual

Implementada, revisada, integrada por PR #254 y desplegada mediante F14 `v0.5.65`. Ego Lite confirmó el recorrido real de la propuesta prioritaria y la desaparición de su tarjeta duplicada. La sesión estudiantil se conservó abierta.

## Cambios

- `apps/web/src/features/student/StudentDashboard.tsx`: quita de la lista secundaria la misión cuya versión exacta ya está representada por la propuesta prioritaria; muestra sus objetivos reales en el contexto principal y conserva las CTA de las demás misiones.
- `apps/web/src/features/student/StudentDashboard.css`: aplica el estilo existente a la lista semántica de objetivos y retira el estilo sin uso de la tarjeta duplicada.
- `apps/web/src/features/student/StudentDashboard.test.tsx`: verifica deduplicación, conservación de todos los objetivos/habilidades y CTA funcional de misión distinta.

## Verificación

- Base revisada: `origin/main` `23e588388252ec141deac06a52138ab6dceb1c42` (incluye F16.20). Worktree limpia antes de crear `codex/f16-21-dashboard-mission-dedup`.
- TDD: la prueba nueva falló primero porque el contexto principal no contenía los objetivos; con el delta implementado pasa.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — 1 archivo, 23/23 tests PASS.
- `pnpm --filter @fragments/web test` — 54 archivos, 297/297 tests PASS.
- `pnpm --filter @fragments/web typecheck` — PASS (`tsc -p tsconfig.json`).
- `pnpm --filter @fragments/web build` — PASS (Vite transformó 2277 módulos y finalizó). El build muestra avisos ya existentes de chunk JS >500 kB y directivas `use client` de lucide.
- Revisión reflexiva estática del diff — PASS: solo se elimina la tarjeta cuyo ID coincide con el vínculo superior; objetivos/habilidades siguen bajo la propuesta prioritaria; las otras tarjetas conservan su CTA por start/continue.
- `git diff --check` — PASS.
- Commit de implementación: `5a7180e1e41afb311f4d682392951f4aeda2e586` (`feat(F16.21): deduplicar misión prioritaria`).
- Commit documental inicial: `48858a8000eb90f7551a4e734a909e8e75c1cec1` (evidencia con pruebas y SHA).
- PR [#254](https://github.com/VGMil-dev/fragments/pull/254) se integró mediante merge normal el `e2aa436be670444af5dd5c3999d0a6036409114f`; revisión reflexiva y UX/UI estática CLEAN.
- CI del head sincronizado `7295b1547d76bffa9a1ea1e8434a760d3d6ef6d7`: run `45358718385`, SUCCESS. La sincronización fue un merge normal de `origin/main` `0ecb58200842feac4fe346c0de23351da0279e65`, commit `e8137f04c79c6ece7b371aadf55ec32566ebb42`; no hubo conflictos ni cambios en los archivos de aplicación.
- F14 publicó la tag anotada `v0.5.65` sobre el SHA exacto del merge `e2aa436be670444af5dd5c3999d0a6036409114f`; workflow `45359221685` terminó SUCCESS en verify-build, attest-package y publish-approved-release. Release publicada: https://github.com/VGMil-dev/fragments/releases/tag/v0.5.65.
- El aplicador automático confirmó `Result=success`, `ExecMainStatus=0`; API/web healthy en `sha-e2aa436be670444af5dd5c3999d0a6036409114f`. `/health` respondió `ok/database=ready`; bundle `/assets/index-BRXWkPbm.js` contiene `v0.5.65` y el SHA exacto. El sondeo posterior también terminó en código 0.
- Ego Lite TaskSpace 60, sesión estudiantil existente, solo lectura: Dashboard autenticado mostró una propuesta prioritaria y una CTA; contexto exacto de aula, misión v1, contexto Mentor v1, objetivo y habilidad obligatoria. La misión exacta no volvió a aparecer como tarjeta secundaria. La cuenta no tiene otras misiones distintas visibles, por lo que el CTA de una segunda misión quedó NO COMPROBADO en producción; las pruebas fake cubren conservar la CTA de otra misión.
- Ego Lite midió 320/390/768/1024/1440 CSS px sin overflow horizontal. A 1440, captura visual auténtica local: `C:\Users\vgmil\ego\fragments-nightly-continuation-20261124\dashboard-v065-1440.png`, SHA-256 `f8411d6eec33ce3e09f180a3655b203a7a422c8369db5beaffaa048229cab8a8`. Contiene datos de una sesión autenticada y permanece fuera de GitHub y Notion.
- No hubo escrituras productivas ni llamadas/evaluaciones IA. Zoom 200 %, navegación/foco de teclado real, contraste formal, lector de pantalla, movimiento reducido, misión adicional distinta en producción y aceptación visual propietaria: **NO COMPROBADOS**. F16 continúa En validación; Fragments no se declara estable para piloto.
- Sincronización con `origin/main` `0ecb58200842feac4fe346c0de23351da0279e65` mediante merge normal sin conflictos: merge commit `e8137f0`. El merge incorporó evidencia de F16.19, F16.20 y F18.B.2, además de la actualización de `TASKS.md` que ya estaba en `main`; no cambió los archivos del Dashboard de esta tarea.
- Después del merge: prueba focal `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — 23/23 PASS; `git diff --check` — PASS.
