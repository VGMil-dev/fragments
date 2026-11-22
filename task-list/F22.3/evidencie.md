# Evidencia F22.3 — Estado agregado de jobs y leases

## Estado

Slice feature-local implementado en `codex/f22-queue-observability`, rama limpia creada desde `origin/main` en `0c4c5001659e12d18383393cdfa82a8111be6fbe`. F22 vigente en Notion confirma F22.2 desplegada en v0.5.12 y enumera la observabilidad de jobs/colas/worker como alcance F22 pendiente. Commit funcional: `34b946af5e60c2d699f45a5af677a644682c7afa`.

PR #102 se sincronizó con `main`, pasó CI `45046396155`, tuvo revisión independiente PASS y se integró por merge normal como `7ba8a1bd8ef020b59654cedef4f6c213b6a5fcae`. PR #103 integró rutas API/UI, revisión, auditoría-before-read y diagnósticos en `dd0222f92b1b6ebb836e66fcf30bf90c7786eb25`; CI `45047282256` PASS y revisión independiente PASS. F14 publicó y aplicó `v0.5.13`, run `45047598074` SUCCESS. Ego Lite confirma versión/SHA en páginas docente/estudiante y `/health` `database=ready`.

## Cambios

- Repository feature-local con seis `job.count` sobre la tabla existente: pending, leases vigentes, leases vencidos/sin fecha, failed, done y otros estados.
- Un único `sampledAt` UTC determina la clasificación del lease; no se leen filas/IDs/payload/worker IDs/errors.
- Handler `GET /api/admin/queue/summary`, autorización `isAdmin` inyectada, 401/403 sin consultar datos.
- Auditoría inyectada obligatoria del intento de lectura autorizado, escrita antes de `store.read()`: `{requestId,event,occurredAt,adminActorId}`. Reusa request ID server-side `x-request-id` con UUID server-side fallback. El actor no se devuelve en respuesta; actor/sink no disponible produce 503 sin consultar store ni resumir datos. Si la lectura falla después, el evento registra el intento autorizado.
- UI administra solo lectura, presenta seis conteos y muestreo UTC, con carga/error/reintento manual y nota visible de que conteos de cola no demuestran liveness del worker.
- El slice original no incluía rutas compartidas, cambios de auth/contratos, migraciones, writes, acciones operativas o cambios de infraestructura.

## Integración arquitectónica y release

1. Arquitectura conecta `createAdminQueueSummaryRepository(database)` y `createAdminQueueSummaryHttp(store, isAdmin, audit)` en `apps/api/src/http/app.ts`; usa Better Auth `adminCheck`/`userId` y writer JSON estructurado stdout con callback confirmado.
2. `/admin/queue` monta `AdminQueueSummaryScreen`/`adminQueueApi` y navegación cruzada; diagnósticos clasifica `/api/admin/queue/summary` como `admin.queue`.
3. Test integrado fake cubre 401/403/200, evento correlacionado, ausencia del actor en respuesta, orden audit antes de seis lecturas, y fallo del sink 503 sin consultar el store.

## Verificación local

- `pnpm --filter @fragments/api exec vitest run src/features/admin-queue --maxWorkers=1` — PASS, 2 archivos, 4 pruebas fake.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-queue --maxWorkers=1` — PASS, 2 archivos, 4 pruebas fake.
- `pnpm --filter @fragments/api exec vitest run src/http/admin-queue.integration.test.ts src/features/admin-queue src/features/admin-requests src/features/admin-diagnostics/diagnostics.test.ts --maxWorkers=1` — PASS, 6 archivos / 15 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-queue src/features/admin-diagnostics/AdminDiagnosticsScreen.test.tsx --maxWorkers=1` — PASS, 3 archivos / 6 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS (`GIT_DIFF_CHECK_PASS` en el staged diff).

## Revisión de orden de auditoría

El requisito F22 de registrar cada operación privilegiada implica registrar el intento antes de consultar datos; un registro posterior deja una ventana de acceso si el sink falla. Commit correctivo `c203cf2`. Se obtiene primero el actor y se escribe el evento; solo después se accede al store. La regresión valida la secuencia `actor → audit.write → store.read`; si falla el sink, comprueba que `store.read()` no se invoca y que no se devuelve el resumen. El callback también se ejecuta si la lectura posterior falla, dejando constancia del intento autorizado.

## Límites

- Las pruebas del repository usan Prisma delegate fake. La existencia/forma de datos reales no fue consultada; no se ejecutó contra `fragments_prod` o `fragments_test`.
- Los conteos reflejan estados de jobs, pero no prueban por sí solos que el worker esté vivo o procesando.
- La audit callback requiere integración de arquitecto. Si escribe a stdout, su retención/rotación depende del runtime y no está verificada.
- No se agregan reintentos; la vista es de solo lectura.
- Las rutas compartidas y UI quedaron integradas y desplegadas en v0.5.13. No se validaron sesiones admin, filas reales, persistencia/rotación de stdout ni worker vivo en producción.
- Producción: `GET /api/admin/queue/summary` anónimo → `401 AUTH_REQUIRED` y cuerpo sin conteos. No se usó identidad admin; lectura de jobs reales, auditoría del sink en runtime, retención/rotación stdout y liveness worker permanecen **NO COMPROBADOS**. El test integrado con roles/DB/sink fake confirma orden/códigos, no esos datos.
