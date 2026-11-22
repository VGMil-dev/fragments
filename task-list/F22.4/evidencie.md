# Evidencia F22.4 — Feed efímero de auditoría admin

## Implementación feature-local

- Rama: `codex/f22-audit-log-feed`, basada en el `origin/main` actualizado que contiene PR #104 merge `3911d401`.
- Store: `apps/api/src/features/admin-audit-log/store.ts`.
- Solo acepta los dos tipos reales emitidos hoy por F22.2/F22.3. Emite el evento completo estructurado al writer inyectado; después retiene una proyección acotada que omite el actor ID. Falla cerrado si la escritura al sink falla.
- El buffer es efímero, máximo 100 registros. No se implementó una ruta/UI compartida; el arquitecto integrará el sink de `apps/api/src/http/app.ts` y la ruta de lectura autenticada/auditada, sin incluir su propio evento en la respuesta.
- No se contactaron producción, proveedores, bases de datos, hosting ni secretos. Las pruebas usan fake stdout y eventos sintéticos etiquetados `fake`.

## Verificación local

- `pnpm --filter @fragments/api exec vitest run src/features/admin-audit-log/store.test.ts --maxWorkers=1` — PASS, 5/5.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `git diff --check` — PASS.

## Limitaciones

- El feed aún no recibe eventos hasta que el arquitecto conecte los writers reales F22.2/F22.3.
- Historial antes de iniciar el proceso y recuperación tras reinicios: NO IMPLEMENTADOS.
- La retención/rotación del destino stdout depende del runtime y sigue NO COMPROBADA.
- No se abrió una sesión real admin; auth Better Auth real y vista administrativa real siguen NO COMPROBADAS.
- Las skills `backend-architecture`, `test-driven-development` y `verification-before-completion` de `SKILLS_MATRIX.md` no estaban instaladas en las rutas disponibles. Se ejecutó secuencia red-verde y verificación fresca local; no afirmar uso directo de esas skills.
