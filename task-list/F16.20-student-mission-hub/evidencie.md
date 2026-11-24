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
- QA visual/Ego Lite no se ejecutó durante la implementación inicial. La comprobación posterior a release se documenta abajo.
- Datos productivos, IA real y despliegue: no usados.
- Commit de implementación: `b63da47` (`feat(F16.20): mostrar contexto académico prioritario`).
- PR [#253](https://github.com/VGMil-dev/fragments/pull/253) se integró normalmente en `main` como `dd6bbe3da2baf0fff83982b7a747d6b514acdd89`; CI `45352705355` SUCCESS. La discrepancia temporal de `mergeable=false` quedó resuelta al sincronizar la rama; no se reescribió historia ni se eludieron protecciones.

## Limitaciones

- El aula y el título de misión se muestran solo si la lista autorizada ya contiene la versión exacta; el snapshot de propuesta por sí mismo no contiene esos nombres.
- Si el servicio no proporciona contexto ni una misión coincidente, la interfaz señala la ausencia/estado y no fabrica información.

## Integración, release y QA posterior · 2026-11-24

- PR #253 ya está incluida en la release anotada F14 `v0.5.64`, publicada sobre `23e588388252ec141deac06a52138ab6dceb1c42` mediante run `45354005819` SUCCESS. Producción quedó saludable; bundle, `/health` y contenedores verificaron versión/SHA exactos.
- En Ego Lite TaskSpace 60, Dashboard autenticado mostró la propuesta como acción única y el contexto exacto de aula, misión `v1`, snapshot Mentor `v1` y habilidad obligatoria. El recorrido fue solo lectura y la sesión volvió a `/student/dashboard`, sin cerrarse.
- Se observaron anchos 320/390/768/1024/1440 CSS px sin desbordamiento horizontal. La acción principal siguió siendo una.
- La prueba visual reveló una misión idéntica repetida como tarjeta completa en «Misiones en tus aulas», con la nota “Tu propuesta vinculada está en el siguiente paso destacado”. Su consolidación con el contexto de la propuesta queda asignada al incremento F16.21; no se ocultan misiones distintas.
- Zoom 200 %, lector de pantalla, contraste formal, foco/teclado y movimiento reducido: **NO COMPROBADOS**. No se hizo escritura productiva ni evaluación IA; F16 continúa En validación.
