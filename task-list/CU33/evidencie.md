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
- Revisión independiente formal y CI del PR: pendientes.

## Producción

- Sin cambios desplegados. Producción está en `v0.5.86`/SHA `11f113cd011bbc15f55785488a2e094436e15094`.
- Ego Lite UI post-release: NO COMPROBADO; Spaces autorizados 44/80 no aparecen en este runtime.
- Como es un cambio solo de presentación, no demuestra ni reemplaza el control de acceso backend; producción permanece pendiente hasta integrar y probar en el perfil real.
