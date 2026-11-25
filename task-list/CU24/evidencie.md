# CU-24 — Evidencia

Estado: guardas integradas por PR #325 (merge `8379e47ee7f177aaaa16dfe4e7197f8707ea2a6e`); el CU funcional integral sigue PARCIAL/NO COMPROBADO sin Review real y sesión Ego Lite estudiante disponible.

## Cobertura existente observada

- Local, antes del cambio: `pnpm --filter @fragments/api exec vitest run src/features/trainer/service.test.ts src/features/trainer/http.test.ts src/features/trainer/repository.test.ts` — lógica service fake 6/6 PASS; HTTP/Prisma PostgreSQL 3 omitidas por ausencia de `DATABASE_URL`.
- Local, antes del cambio: `pnpm --filter @fragments/web exec vitest run src/features/trainer` — 13/13 PASS; pruebas de UI con APIs mockeadas.
- Producción autenticada en la matriz anterior: Trainer mostró estado vacío porque el propietario no tenía Review completada; no se sortearon retos ni se registraron intentos. En esta sesión los Spaces 44/80 no aparecen en runtime; no se abre otro Space.

## Cambio y verificación local

- `apps/api/src/features/trainer/http.test.ts` y `repository.test.ts` ahora confirman `current_database() = fragments_test` antes de fixtures; el cleanup depende de que esa guarda haya pasado.
- `pnpm --filter @fragments/api exec vitest run src/features/trainer/service.test.ts src/features/trainer/http.test.ts src/features/trainer/repository.test.ts` — 1 archivo PASS, 6/6 pruebas service; 2 archivos y 3 pruebas PostgreSQL omitidas al no existir `DATABASE_URL` local.
- `pnpm --filter @fragments/api typecheck` PASS; `git diff --check` PASS.
- PR #325, código commit `f54cdf1f80e6ba8e64bd619e4ad41ac7d91600f5`; CI run `45704615780` PASS en `fragments_test` efímero. El workflow aplicó el esquema antes de ejecutar test/typecheck/lint/build. Merge normal en SHA `8379e47ee7f177aaaa16dfe4e7197f8707ea2a6e`.
- Cambio sólo de tests/registro: no requirió tag ni release F14 y no modificó código de aplicación.

## Cambio

- Implementado localmente: validar `current_database() = fragments_test` antes de fixtures HTTP y Prisma, y evitar cleanup si la validación falla.

## Pendiente

- Tests de negocio sobre un Review persistido real, reto derivado de proveedor IA con presupuesto comprobado, intento autenticado y revisión en Ego Lite: NO COMPROBADOS.
- Review real propia, fuente/proveedor y presupuesto IA, sorteo/criterio de reto, persistencia de intento y recuperación en Ego Lite autenticado: NO COMPROBADOS.
