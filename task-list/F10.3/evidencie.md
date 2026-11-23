# F10.3 — Evidencia

Estado: implementado, integrado y desplegado como `v0.5.36`. Rama: `codex/f10-trainer-lab`.

## Cambios

- `apps/web/src/features/trainer/TrainerScreen.tsx`: encabezado compacto «Entrenamiento», empty state único en respuesta exitosa vacía, y controles/historial visibles solo cuando existe Review. El CTA existente conserva `href="/student/review"` y callback `onStartReview`.
- `apps/web/src/features/trainer/trainer-screen.css`: jerarquía compacta y estilo Pixel Night del empty state, CTA con foco visible y sin ilustración.
- `apps/web/src/features/trainer/TrainerScreen.test.tsx`: cobertura de carga sin empty state, respuesta vacía/CTA, error/reintento y Review real sin reto inventado.
- `task-list/F10.3/intent.md`, `spec.md` y `task-list/TASKS.md` actualizados.

## Assets F16

- Notion F10/F16 y el catálogo de assets consultados el 2026-11-23. La experiencia UX-13 continúa `Pendiente` y no hay asset aprobado en catálogo para ilustrar el estado vacío de Trainer.
- Se comprobó el asset del kit A-001 «Personaje · Goggle Kid (caminata)»: estado `Aprobado en kit`, SHA-256 del archivo local `73f58fc11bcc830524b880d2dbd9e85eec880c7fcd8101852f0ad38dba2887b3` (coincide con catálogo). Su uso permitido lo identifica como animación F16 y requiere confirmar ubicación/motion. No se usa en esta pantalla.
- Resultado: estado vacío gráfico-free; no se editó ni generó ningún asset.

## TDD y verificación

- Regresión inicial: `pnpm --filter @fragments/web exec vitest run src/features/trainer/TrainerScreen.test.tsx` — falló como esperado: la vista aún mostraba «Trainer» en lugar de «Entrenamiento».
- `pnpm --filter @fragments/web exec vitest run src/features/trainer/TrainerScreen.test.tsx` — PASS, 1 archivo / 4 tests.
- `pnpm --filter @fragments/web typecheck` — PASS, `tsc -p tsconfig.json` exit 0.
- `git diff --check` — PASS, sin salida.

## Limitaciones y commits

- PR #176 integrado por merge normal en `main` como `cf2edb14ad97fda4b07a87e806d3ae9e3191e1be`; CI del PR `45151950478` SUCCESS. Revisión reflexiva independiente: sin hallazgos bloqueantes.
- Commit de implementación: `020a99318f044c3968c0461f7bb9b7e3c437a799` (`feat(f10): refina empty state trainer`).
- F14 tag anotada `v0.5.36` → SHA exacto `cf2edb14ad97fda4b07a87e806d3ae9e3191e1be`; workflow `45153003708`: `verify-build`, ARM64, atestación Sigstore y publicación SUCCESS.
- Verificación pública cache-bypass: `/health` HTTP 200, `status=ok`, `database=ready`; bundle `/assets/index-CCBddJ1x.js` contiene `v0.5.36` y el SHA exacto. Durante la aplicación automática hubo una lectura HTTP 502 transitoria; la observación siguiente recuperó HTTP 200 y bundle nuevo. No se invocó deploy manual ni se apagó/reinició producción.
- Ego Lite en una pestaña nueva de la sesión estudiantil existente: H1 «Entrenamiento», estado vacío y CTA `/student/review` visibles; con Tab el CTA mostró contorno lima sólido de 3 px. A 390 px el link quedó visible (121×48), `scrollWidth=390`, sin overflow horizontal. No se pulsó CTA ni se escribieron datos. Sesiones y pestañas previas permanecieron abiertas.
- El gate local impidió inspeccionar el componente antes del deploy; la comprobación productiva posterior sí observó la UI real. No se revisó lector de pantalla. El estado se presenta como guía inicial, no como lista explícita vacía.
