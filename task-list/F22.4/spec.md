# Especificación F22.4 — Store efímero de auditoría admin

- `createAdminAuditLog` acepta el writer real como dependencia; no accede a stdout directamente ni llama servicios externos.
- La entrada requiere UUID v4 de request generado por middleware, evento de la allowlist F22.2/F22.3/F22.4, fecha UTC canónica y actor admin no vacío.
- Valida y construye una nueva entrada; campos adicionales del llamador nunca se serializan.
- Primero espera que stdout confirme el evento estructurado completo, necesario para el registro operativo; solo entonces lo incorpora al buffer seguro.
- Si stdout rechaza, la promesa falla y no se agrega una entrada al buffer.
- El buffer conserva como máximo 100 eventos más recientes (configurable con límite de 1–100); `list()` retorna hasta 50 copias aisladas.
- Leer el buffer no emite auditoría por sí mismo. La futura ruta de lectura debe escribir `admin.audit_log.read` antes de responder y excluir el evento con el mismo `requestId` de esa respuesta; lecturas posteriores sí lo pueden ver.
- No modifica contratos, esquemas, tablas, rutas, auth ni UI.

## Verificación

- Tests unitarios con fake stdout etiquetado: proyección/redacción, orden writer-antes-buffer, fallo cerrado, allowlist y UUID/timestamp inválidos, capacidad, copia aislada y lectura no recursiva.
- `pnpm --filter @fragments/api exec vitest run src/features/admin-audit-log/store.test.ts --maxWorkers=1`.
- `pnpm --filter @fragments/api typecheck`.
- `git diff --check`.
