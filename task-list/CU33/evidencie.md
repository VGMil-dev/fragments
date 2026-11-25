# CU-33 — Evidencia

## Estado

Corrección inicial en `apps/web/src/features/admin-console/AdminOverviewScreen.tsx` y `apps/web/src/features/admin-ai-diagnostics/AdminAiDiagnosticsScreen.tsx`, ampliada después a las diez rutas de administración. `AdminConsoleNavigation` oculta la navegación ante `AUTH_REQUIRED`/`FORBIDDEN`; errores recuperables conservan navegación y reintento. La autorización backend no cambió.

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
- Revisión independiente formal del incremento inicial: pendiente.

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
- Commit de código: `dc355243baa84bbde4ece9663bbeea9420facd89`.
- PR #327 merge normal en SHA `d513d2283d5091fffa6c27a63206f37a209a6da5`; CI run `45706974889` SUCCESS. La release F14 `v0.5.92`, run `45707727984`, completó verify-build, attest-package y publish-approved-release; tag anotada apuntó al SHA exacto. GitHub Release `458690137`.
- Aplicación productiva normal comprobada por ledger F14: estado `deployed`, tag/SHA exactos. Backup `fragments-prod-2026-11-25T21-58-25-758Z.dump`, 98,409 bytes, SHA-256 `768fbf3a30fc605c5265494d32e0388a0b37d989663c22e3e95a1f35b108180e`, integridad `restored_to_temporary_database`.
- API/web Fragments healthy en `sha-d513d2283d5091fffa6c27a63206f37a209a6da5`; `/health` HTTP 200 `ok/database=ready`; bundle `/assets/index-Bwomdy0w.js` HTTP 200 con versión y SHA exactos. Poll timer, apply path y cloudflared activos; apply inactivo; `systemctl --failed` vacío. PostgreSQL, servicios vecinos y contenedores de prueba reportaron healthy. `/dev/sda1`: 77 GB libres (61 % usado), inodos 13 %. Imágenes de API/web de v0.5.91 y v0.5.90 conservadas; no hubo limpieza ni rollback.
- Ego Lite autenticado post-release: NO COMPROBADO. El runtime Ego Lite enumeró solo Spaces 0 y 3; Space 80 no estaba disponible. No se abrió un Space sustituto ni se alteraron cuentas. El cambio se verificó con APIs fake/CI y evidencia pública/técnica del release.
- El cierre documental se integró por PR #328, CI #45711180421 SUCCESS, merge SHA `47550c63f14bc238b19a6c01a8f3d772cb13b67a`.
- Revisión actual de Ego Lite: solo Spaces 0 y 3 enumerados; los Spaces autorizados 44 (docente) y 80 (estudiante) no estaban disponibles. No se reclamó ni abrió un reemplazo.
