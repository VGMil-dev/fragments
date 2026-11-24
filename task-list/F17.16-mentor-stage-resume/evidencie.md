# Evidencia F17.16

Estado: PR #272 abierta desde `codex/f17-16-mentor-stage-resume`; checks y despliegue pendientes.

## Pruebas

- Antes del fix: `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` falló la nueva prueba. Resultado observado: una propuesta sin objetivos ni alcance abría «Evaluación» después de un `NOT_FOUND` de recuperación.
- Después del fix: mismo comando — PASS, 46/46.
- `pnpm --filter @fragments/web test` — PASS, 54 archivos, 309/309.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS. Advertencias: chunk principal >500 kB y directivas `use client` de Lucide, preexistentes/no abordadas.
- `git diff --check` — PASS.

## Límites

Solo prueba con callbacks fake en Vitest. No se hizo llamada a proveedor IA, escritura productiva ni validación visual/browser. Para cerrar: PR y checks; despliegue únicamente mediante F14 y validación Ego Lite posterior.

- Commit de implementación: `16af14a3a2acaaa0c85c05d4f74015b727562063` (`fix(F17.16): reanudar Mentor en etapa pendiente`).
- Commit de evidencia/índice: `c1c485ed321f0c1385184aa9e7faca1c29071ef9` (`docs(F17.16): registrar pruebas y commit`).
- PR #272: https://github.com/VGMil-dev/fragments/pull/272; Actions aún no devolvió ejecuciones para el HEAD al consultar.
