# Evidencia F16.20 — Contexto académico de propuesta prioritaria

## Cambios

- `apps/web/src/features/student/StudentDashboard.tsx`: presenta aula/misión desde una versión de misión coincidente y contexto/habilidades desde snapshot con el mismo `assignmentVersionId`; protege contra datos cargados para versiones distintas y conserva estados informativos.
- `apps/web/src/features/student/StudentDashboard.css`: comparte la jerarquía y el estilo semántico de la ficha de misión existente.
- `apps/web/src/features/student/StudentDashboard.test.tsx`: cubre misión y snapshot exactos, snapshot sin misión listada y discrepancia de versión.

## Verificación

- TDD: la prueba del contexto enlazado falló antes del cambio (18/19; el HTML carecía del contexto), y quedó verde después de implementar.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — 1 archivo y 22/22 tests PASS.
- `pnpm --filter @fragments/web test` — 54 archivos y 295/295 tests PASS.
- `pnpm --filter @fragments/web typecheck` — PASS (`tsc -p tsconfig.json`).
- `pnpm --filter @fragments/web build` — PASS (Vite transformó 2277 módulos y finalizó). Persisten avisos existentes de chunk JS >500 kB y directivas `use client` de lucide; no bloquean el build y no se modificaron.
- `git diff --check` — PASS.
- QA visual/Ego Lite: no ejecutado; esta entrega verifica componentes con tests y build, no afirma validación de viewport en navegador.
- Datos productivos, IA real y despliegue: no usados.
- Commit de implementación: `b63da47` (`feat(F16.20): mostrar contexto académico prioritario`).
- PR #253 abierto contra `main`: https://github.com/VGMil-dev/fragments/pull/253 (sin fusionar ni desplegar).
- La creación del PR indicó `mergeable=false` y base `main` en `89fad1cf1de4d1841b281b2eecd0b4812318c83f`; el arquitecto debe revisar/integrar la base según el flujo compartido.

## Limitaciones

- El aula y el título de misión se muestran solo si la lista autorizada ya contiene la versión exacta; el snapshot de propuesta por sí mismo no contiene esos nombres.
- Si el servicio no proporciona contexto ni una misión coincidente, la interfaz señala la ausencia/estado y no fabrica información.
