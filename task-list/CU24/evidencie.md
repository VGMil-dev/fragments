# CU-24 — Evidencia

Estado: guardas integradas localmente en pruebas de Trainer; PR/CI pendientes. El CU funcional integral sigue PARCIAL/NO COMPROBADO sin Review real y sesión Ego Lite estudiante disponible.

## Cobertura existente observada

- Local, antes del cambio: `pnpm --filter @fragments/api exec vitest run src/features/trainer/service.test.ts src/features/trainer/http.test.ts src/features/trainer/repository.test.ts` — lógica service fake 6/6 PASS; HTTP/Prisma PostgreSQL 3 omitidas por ausencia de `DATABASE_URL`.
- Local, antes del cambio: `pnpm --filter @fragments/web exec vitest run src/features/trainer` — 13/13 PASS; pruebas de UI con APIs mockeadas.
- Producción autenticada en la matriz anterior: Trainer mostró estado vacío porque el propietario no tenía Review completada; no se sortearon retos ni se registraron intentos. En esta sesión los Spaces 44/80 no aparecen en runtime; no se abre otro Space.

## Cambio y verificación local

- `apps/api/src/features/trainer/http.test.ts` y `repository.test.ts` ahora confirman `current_database() = fragments_test` antes de fixtures; el cleanup depende de que esa guarda haya pasado.
- `pnpm --filter @fragments/api exec vitest run src/features/trainer/service.test.ts src/features/trainer/http.test.ts src/features/trainer/repository.test.ts` — 1 archivo PASS, 6/6 pruebas service; 2 archivos y 3 pruebas PostgreSQL omitidas al no existir `DATABASE_URL` local.
- `pnpm --filter @fragments/api typecheck` PASS; `git diff --check` PASS.

## Cambio

- Implementado localmente: validar `current_database() = fragments_test` antes de fixtures HTTP y Prisma, y evitar cleanup si la validación falla.

## Pendiente

- CI/PostgreSQL efímero, PR e integración normal pendientes.
- Review real propia, fuente/proveedor y presupuesto IA, sorteo/criterio de reto, persistencia de intento y recuperación en Ego Lite autenticado: NO COMPROBADOS.
