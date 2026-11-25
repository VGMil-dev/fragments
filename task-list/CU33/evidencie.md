# CU-33 — Evidencia

## Estado

Corrección implementada en `apps/web/src/features/admin-console/AdminOverviewScreen.tsx` y `apps/web/src/features/admin-ai-diagnostics/AdminAiDiagnosticsScreen.tsx`; no mezcla el ocultamiento de navegación con el control de autorización backend. Cuando una lectura en esas pantallas devuelve `AUTH_REQUIRED`/`FORBIDDEN`, omiten el nav administrativo. Errores genéricos conservan el nav y el botón de reintento. Las otras pantallas admin aún no forman parte de este incremento.

## TDD

- Rojo: `pnpm --filter @fragments/web exec vitest run src/features/admin-console/AdminOverviewScreen.test.tsx` — 4/5 PASS; regresión falla porque con dos respuestas fake `FORBIDDEN` todavía se renderizan los diez enlaces.
- Verde focal inicial en `/admin`: 5/5; comprueba ocultamiento con 403 y que un error genérico conserve nav/reintento.
- Verde focal consolidado: `pnpm --filter @fragments/web exec vitest run src/features/admin-ai-diagnostics/AdminAiDiagnosticsScreen.test.tsx src/features/admin-console/AdminOverviewScreen.test.tsx` — 2 archivos, 8/8 PASS; cubre denegación en ambas pantallas y conserva nav con error genérico.
- `pnpm --filter @fragments/contracts build` — PASS, necesario para resolver el workspace en este worktree limpio.
- `pnpm --filter @fragments/web test` — 57 archivos, 335/335 PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; Rolldown muestra advertencias existentes de chunk >500 kB y directivas `use client` de lucide-react.
- `git diff --check` — PASS tras todos los cambios.
- Commit de implementación: `c23b1f45a859e7dd889b502f6a0f3f29ca0e3c4d`.
- CI del PR #310: run `45671152783`, job `verify` — SUCCESS (todos los pasos y limpieza PASS).
- Revisión independiente formal: pendiente.

## Integración y producción

- PR #310 integrada mediante merge normal. Merge SHA `e6d397968e07d29a8e976bbd3a1726f71a4a3af4`; CI PR run `45671641514` SUCCESS.
- F14: tag anotada `v0.5.87`; run `45672204109` SUCCESS en verify-build, atestación y publicación; release ID `458474637` aplicada normalmente por el agente pull.
- Ledger: `deployed`; backup `fragments-prod-2026-11-25T18-17-57-139Z.dump`, 98,312 bytes, SHA-256 `0be49f2f2f1a0eb36a1dfdb833f763635d1d2a07b7d00efd1ac3a80c0d0c8616`, `restored_to_temporary_database`.
- API/web healthy en SHA exacto; `/health` HTTP 200 `ok/database=ready`; bundle `/assets/index-Bp8ZB-TH.js` contiene `v0.5.87` y el SHA esperado. Poll timer/apply path/cloudflared activos; `systemctl --failed` vacío; servicios vecinos healthy; disco 96 GB libres (51 % usado), inodos 11 %. Releases previas retenidas para rollback; rollback real no ejecutado.
- CU-33 funcional con Ego Lite en producción: NO COMPROBADO; Spaces autorizados 44/80 no aparecen en este runtime. El despliegue y bundle no sustituyen la verificación de navegación con rol real. Backend no fue modificado.

## Ampliación de cobertura de rutas · 2026-11-25

- Hallazgo: la primera corrección cubría `/admin` y `/admin/ai-diagnostics`, pero las pantallas de Diagnósticos, Solicitudes, Cola, Registro de actividad, eventos Review/Mentor/Trainer y Cuentas docentes todavía renderizaban los diez enlaces después de un `AUTH_REQUIRED`/`FORBIDDEN` de su propia API.
- Cambio: `AdminConsoleNavigation` ahora requiere `accessDenied` y no renderiza enlaces cuando el servidor confirmó falta de sesión/rol. Las diez rutas pasan su estado de denegación. Los errores genéricos mantienen navegación y recuperación; el backend continúa siendo la autoridad y no se modificaron endpoints.
- Prueba focal: AdminConsoleNavigation y las diez suites de pantalla — 11 archivos, 42/42 PASS.
- Suite web: `pnpm --filter @fragments/web test` — 58 archivos, 340/340 PASS.
- Typecheck: `pnpm --filter @fragments/web typecheck` — PASS.
- Build: `pnpm --filter @fragments/web build` — PASS. Permanecen los avisos conocidos de chunk >500 kB y directivas `use client` de lucide-react.
- Producción/Ego Lite: NO COMPROBADO en esta ampliación; no se sustituyeron los perfiles ni se modificó la autenticación. Despliegue F14 pendiente de PR/CI.
- Commit de código, PR, SHA de integración y release: pendientes.
