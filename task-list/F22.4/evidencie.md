# Evidencia F22.4 — Feed efímero de auditoría admin

## Implementación feature-local — PR #105

- Rama: `codex/f22-audit-log-feed`, basada en el `origin/main` actualizado que contiene PR #104 merge `3911d401`.
- Commits de implementación: `7dcf49ffff51a2ed6a1606ecc6feed63d6b2b2e2`, `4eff4a1aa9973828f59232815c09ae772f759948`.
- PR #105 integrado normalmente en `main` como `ab1d1633b14515ce1eb55f0f9e76b62e38d2fcf6`; head actualizado `34f99258238887015417013e923e7e1864fd2fd9`, CI `45050924430` SUCCESS y revisión independiente PASS.
- Store: `apps/api/src/features/admin-audit-log/store.ts`.
- Solo acepta `admin.classroom_requests.read`, `admin.queue_summary.read` y `admin.audit_log.read` (la ruta futura del feed). Emite el evento completo estructurado al writer inyectado; después retiene una proyección acotada que omite el actor ID. Falla cerrado si la escritura al sink falla.
- El buffer es efímero, máximo 100 registros. El store no agrega una ruta compartida por sí solo; la integración arquitectónica se registra abajo.
- No se contactaron producción, proveedores, bases de datos, hosting ni secretos. Las pruebas usan fake stdout y eventos sintéticos etiquetados `fake`.

## Verificación local

- `pnpm --filter @fragments/api exec vitest run src/features/admin-audit-log/store.test.ts --maxWorkers=1` — PASS, 6/6.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api test` — PASS, 121 passed, 68 skipped (17 files skipped; no database-backed tests were claimed as local verification).
- `git diff --check` — PASS.

## Limitaciones

- Historial antes de iniciar el proceso y recuperación tras reinicios: NO IMPLEMENTADOS.
- La retención/rotación del destino stdout depende del runtime y sigue NO COMPROBADA.
- No se abrió una sesión real admin; auth Better Auth real y vista administrativa real siguen NO COMPROBADAS.
- Las skills `backend-architecture`, `test-driven-development` y `verification-before-completion` de `SKILLS_MATRIX.md` no estaban instaladas en las rutas disponibles. Se ejecutó secuencia red-verde y verificación fresca local; no afirmar uso directo de esas skills.

## Integración arquitectónica — PR #108

- `apps/api/src/features/admin-audit-log/http.ts` agrega GET `/api/admin/audit-log?limit=1..50`, con adminCheck + actor Better Auth, escritura del evento `admin.audit_log.read` antes de consultar el buffer, y filtro del requestId de la misma lectura. Anónimos reciben 401, docente 403; un fallo del sink responde 503; el límite inválido responde 400 antes de registrar.
- `apps/api/src/http/app.ts` conecta los writers F22.2/F22.3 al store; el stdout estructurado continúa siendo el sink operativo. `diagnostics.ts` clasifica `admin.audit_log`.
- `apps/web/src/features/admin-audit-log/` añade cliente con esquema/allowlist estricta y pantalla `/admin/audit-log`: fecha UTC, evento, actor genérico y UUID de correlación; estados de carga, error recuperable, vacío y refresh manual. La UI explica el límite de retención en memoria y no muestra identidad de actor ni payload.
- Revisión independiente detectó la pérdida de una fila con `limit=1` porque el evento propio ocupaba el primer lugar. Se añadió `listExcluding(requestId,limit)`, que filtra antes de paginar; integración actual usa `limit=1` y confirma que vuelve el evento previo. Revisión independiente de la corrección PASS.
- Verificación completa fresca tras el fix: `pnpm exec turbo run test typecheck lint build --force` — 11/11 tareas PASS; API 125 passed/68 skipped (tests DB omitidos por no haber `DATABASE_URL`); web 160/160; contracts 29/29; typechecks, lint y builds PASS. Prueba focal store+HTTP 10/10; `git diff --check` PASS.
- Pruebas usan auth fixture y sink fake; no se accedió a producción, host, stdout real, datos de usuarios ni secretos. F14 sigue pendiente; el feed productivo aún NO está desplegado.
- Commit arquitectónico: `83a13823f9f59a316581e27aeb10bac1f08a45db` (`feat(f22): integra feed de auditoria admin`). PR #108 abierto contra `main`; CI `45052376136` SUCCESS. Merge y despliegue F14 pendientes.
