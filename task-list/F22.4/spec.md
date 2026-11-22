# Especificación F22.4 — Store efímero de auditoría admin

- `createAdminAuditLog` acepta el writer real como dependencia; no accede a stdout directamente ni llama servicios externos.
- La entrada requiere UUID v4 de request generado por middleware, evento de la allowlist F22.2/F22.3/F22.4, fecha UTC canónica y actor admin no vacío.
- Valida y construye una nueva entrada; campos adicionales del llamador nunca se serializan.
- Primero espera que stdout confirme el evento estructurado completo, necesario para el registro operativo; solo entonces lo incorpora al buffer seguro.
- Si stdout rechaza, la promesa falla y no se agrega una entrada al buffer.
- El buffer conserva como máximo 100 eventos más recientes (configurable con límite de 1–100); `list()` retorna hasta 50 copias aisladas.
- Leer el buffer no emite auditoría por sí mismo. La ruta `GET /api/admin/audit-log?limit=1..50` verifica admin y actor, escribe `admin.audit_log.read` antes de listar y excluye el evento con el mismo `requestId` de esa respuesta; lecturas posteriores sí lo pueden ver.
- La ruta devuelve `{ events: [{ requestId, event, occurredAt, actorType: "admin" }] }` con `Cache-Control: no-store`; respuestas anónimas son 401, teacher 403, auditoría indisponible 503 y query inválido 400.
- La UI `/admin/audit-log` presenta evento, hora UTC, actor genérico y correlación UUID. Tiene estados de carga, error recuperable y vacío; no presenta IDs de usuario ni payloads.
- Diagnósticos clasifican la ruta como `admin.audit_log`.
- No se modifican contratos, esquemas, tablas, migraciones ni datos productivos. La retención stdout del host, Better Auth admin real y duración del buffer tras reinicios se declaran NO COMPROBADAS.

## Verificación

- Tests unitarios con fake stdout etiquetado: proyección/redacción, orden writer-antes-buffer, fallo cerrado, allowlist y UUID/timestamp inválidos, capacidad, copia aislada y lectura no recursiva.
- `pnpm --filter @fragments/api exec vitest run src/features/admin-audit-log/store.test.ts --maxWorkers=1`.
- `pnpm --filter @fragments/api typecheck`.
- `git diff --check`.

## Criterios de integración arquitectónica

- HTTP verifica 401/403, actor admin, auditoría antes de lectura, filtro del propio evento, redacción de identidad y fallo cerrado si el sink no confirma.
- UI valida allowlist estricta y payload redacted; presenta carga/error/vacío y actualización manual.
- `pnpm --filter @fragments/web test` y typecheck; suite API, typecheck y verificación de integración.
