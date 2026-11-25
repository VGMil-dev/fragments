# Evidencia — CU-12 aislamiento de rúbricas

Estado: integrado mediante PR #331; verificación PostgreSQL CI PASS.

## Alcance

Se añadió una integración PostgreSQL a `academic-flow.integration.test.ts`: dos misiones con rúbricas diferentes se publican en `fragments_test`; luego A publica una v2. La prueba verifica rúbrica vigente por misión y snapshots históricos de A v1 y B v1. No cambia runtime ni requiere una nueva release. No llama a proveedor IA.

## Verificación

- Commit de la prueba: `4e5bd98da450b7ac9f5187a2ba2eaf0525f44eb4`.
- PR #331 se integró por merge normal el 2026-11-25; SHA de merge `386513b6ef5e8383452437f071764571f779cb17`.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api test` — 53 archivos/206 pruebas PASS; 20 archivos/80 pruebas omitidas porque `DATABASE_URL` no está definida. No se muestra ni utiliza una URL de producción.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — la suite reporta 1 archivo/5 pruebas omitidas por falta de `DATABASE_URL`; no cuenta como ejecución de PostgreSQL.
- `git diff --check` — PASS.
- CI PR #331, run `45717303430`, head `94237c87a3d652f073892f2c39842aef6a7ad09d` — SUCCESS. Provisionó PostgreSQL desechable, aplicó migraciones, y `academic-flow.integration.test.ts` pasó sus 5/5 pruebas, incluida la nueva comparación de rúbricas por misión y preservación de snapshots; el job completo `verify` terminó SUCCESS. Run inicial `45716773427` también terminó SUCCESS sobre el commit de prueba.
- El daemon Docker Desktop no está disponible, por lo que la integración local no se ejecutó en PostgreSQL. La validación efectiva ocurrió en el entorno CI aislado `fragments_test`.
- Cambio de runtime: ninguno. Release F14: no aplicable para una modificación de pruebas/documentación.

## Limitaciones

Space 44 no aparece en el inventario Ego Lite actual y `claimTaskSpace(44)` respondió `task space not found: 44`, pese a la autorización del propietario. No se creó ni sustituyó un espacio. La verificación autenticada docente permanece NO COMPROBADA; revisar tras recuperar la sesión autorizada. CU-12 integral sigue PARCIAL.
