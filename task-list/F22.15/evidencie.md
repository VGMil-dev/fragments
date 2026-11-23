# Evidencia

Estado: desplegada en v0.5.51. Commit de código: `10dbdb1e9c52d1970c8a6f995f2d0326158b9005`; PR #213 merge `c9576aad08dfd689a0852ec9a6b748d938fa2803`; CI `45274714433` SUCCESS. F14 run `45275604889` SUCCESS.

- `pnpm --filter @fragments/api exec vitest run src/features/admin-trainer-events/http.test.ts src/features/admin-operational-events/prisma-store.test.ts src/features/trainer/operational-events.test.ts`: PASS 15/15 (2026-11-23).
- `pnpm --filter @fragments/web exec vitest run src/features/admin-trainer-events/AdminTrainerEventsScreen.test.tsx`: PASS 6/6 (2026-11-23).
- `pnpm --filter @fragments/contracts build`: PASS.
- `pnpm --filter @fragments/api typecheck`: PASS después de reconstruir contratos.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `git diff --check`: PASS.
- No hay migración nueva; usa `OperationalEvent.source = trainer` y el límite/retención compartidos.
- Pruebas HTTP Trainer contra PostgreSQL aislado y autenticación real: NO COMPROBADO (DATABASE_URL no configurada para esta ejecución).
- Ego Lite producción read-only: `/health` 200 `ok/database=ready`; bundle `/assets/index-BDAa_SKe.js` incluye `v0.5.51`, SHA `c9576aad08dfd689a0852ec9a6b748d938fa2803` y la ruta admin. GET `/api/admin/trainer-events?limit=1` desde sesión sin rol admin responde 403 seguro.
- Sesión admin, visualización autenticada del feed, eventos reales y retención productiva: NO COMPROBADO. No se modificaron datos ni permisos.
- Release aplicada y verificada por F14/Ego Lite; PR integrado.
- Observación posterior v0.5.52, SSH read-only: web/API `healthy` en imágenes SHA `7da17eca74f1c5df7efb1e909e3a73abcd14794b`; asset `index-GzHAFdj-.js` incluye versión/SHA. Proyección remota de nombres allowlisted Mentor/Review/Trainer sobre `docker logs --since 24h fragments-api-1` devolvió 0 coincidencias; solo se emitieron conteos, no líneas crudas. Esto no mide filas de `admin_operational_events` ni prueba sesión admin/feed autenticado.
- Producción sin escritura: no se generó intento Trainer ni evaluación de prueba. Eventos Trainer reales, lectura autenticada y retención productiva siguen NO COMPROBADOS.
