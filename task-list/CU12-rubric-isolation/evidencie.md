# Evidencia — CU-12 aislamiento de rúbricas

Estado: prueba añadida; PostgreSQL CI pendiente.

## Alcance

Se añadió una integración PostgreSQL a `academic-flow.integration.test.ts`: dos misiones con rúbricas diferentes se publican en `fragments_test`; luego A publica una v2. La prueba verifica rúbrica vigente por misión y snapshots históricos de A v1 y B v1. No cambia runtime ni requiere una nueva release. No llama a proveedor IA.

## Verificación

- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api test` — 53 archivos/206 pruebas PASS; 20 archivos/80 pruebas omitidas porque `DATABASE_URL` no está definida. No se muestra ni utiliza una URL de producción.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — la suite reporta 1 archivo/5 pruebas omitidas por falta de `DATABASE_URL`; no cuenta como ejecución de PostgreSQL.
- `git diff --check` — PASS.
- El daemon Docker Desktop no está disponible; no se creó ningún contenedor local. La validación PostgreSQL queda a cargo del CI existente, que provisiona su base desechable `fragments_test` y aplica migraciones.
- Cambio de runtime: ninguno. Release F14: no aplicable para una modificación de pruebas/documentación.

## Limitaciones

Space 44 no aparece en el inventario Ego Lite actual y `claimTaskSpace(44)` respondió `task space not found: 44`, pese a la autorización del propietario. No se creó ni sustituyó un espacio. La verificación autenticada docente permanece NO COMPROBADA; revisar tras recuperar la sesión autorizada.
