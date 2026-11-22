# Evidencia F22.3 — Estado agregado de jobs y leases

## Estado

Slice feature-local implementado en `codex/f22-queue-observability`, rama limpia creada desde `origin/main` en `0c4c5001659e12d18383393cdfa82a8111be6fbe`. F22 vigente en Notion confirma F22.2 desplegada en v0.5.12 y enumera la observabilidad de jobs/colas/worker como alcance F22 pendiente. Commit funcional: `34b946af5e60c2d699f45a5af677a644682c7afa`.

F22.3 todavía necesita integración del arquitecto en `apps/api/src/http/app.ts` y `apps/web/src/App.tsx`/navegación. PR #102 abierto contra `main`: https://github.com/VGMil-dev/fragments/pull/102 (head al crear `c4534f30efa3fceb8acc3888a26fd6d846be3ebf`). No hubo acceso a producción, secretos, bases reales o sesiones.

## Cambios

- Repository feature-local con seis `job.count` sobre la tabla existente: pending, leases vigentes, leases vencidos/sin fecha, failed, done y otros estados.
- Un único `sampledAt` UTC determina la clasificación del lease; no se leen filas/IDs/payload/worker IDs/errors.
- Handler `GET /api/admin/queue/summary`, autorización `isAdmin` inyectada, 401/403 sin consultar datos.
- Auditoría inyectada obligatoria de la lectura autorizada: `{requestId,event,occurredAt,adminActorId}`. Reusa request ID server-side `x-request-id` con UUID server-side fallback. El actor no se devuelve en respuesta; actor/sink no disponible produce 503 sin resumen.
- UI administra solo lectura, presenta seis conteos y muestreo UTC, con carga/error/reintento manual y nota visible de que conteos de cola no demuestran liveness del worker.
- Sin rutas compartidas, cambios de auth, contratos, migraciones, writes, acciones operativas o cambios de infraestructura.

## Integración requerida del arquitecto

1. Integrar `createAdminQueueSummaryRepository(database)` y `createAdminQueueSummaryHttp(store, isAdmin, audit)` en `apps/api/src/http/app.ts`; conectar `adminCheck`, `userId` y el writer estructurado stdout del patrón F22.2.
2. Conectar `AdminQueueSummaryScreen`/`adminQueueApi` en la ruta admin y navegación web compartidas.
3. Añadir test integrado fake para 401/403/200 y correlación de audit event; verificar que no se serializa actor ni detalle de job.

## Verificación local

- `pnpm --filter @fragments/api exec vitest run src/features/admin-queue --maxWorkers=1` — PASS, 2 archivos, 4 pruebas fake.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-queue --maxWorkers=1` — PASS, 2 archivos, 4 pruebas fake.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS (`GIT_DIFF_CHECK_PASS` en el staged diff).

## Límites

- Las pruebas del repository usan Prisma delegate fake. La existencia/forma de datos reales no fue consultada; no se ejecutó contra `fragments_prod` o `fragments_test`.
- Los conteos reflejan estados de jobs, pero no prueban por sí solos que el worker esté vivo o procesando.
- La audit callback requiere integración de arquitecto. Si escribe a stdout, su retención/rotación depende del runtime y no está verificada.
- No se agregan reintentos; la vista es de solo lectura.
