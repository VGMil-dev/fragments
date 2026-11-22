# Especificación F22.3 — Conteos de cola admin

## API feature-local

- `GET /api/admin/queue/summary` requiere `isAdmin(request)`: 401 anónimo, 403 rol no admin, sin consulta de store ni datos.
- Repository Prisma usa `job.count` y un único instante UTC: `pending`, leases no vencidos (`leased` y `leaseUntil > asOf`), leases vencidos o sin fecha (`leased` y `leaseUntil <= asOf` o nulo), `failed`, `done` y `other` (estado diferente a los conocidos).
- Respuesta solo conteos no negativos y `sampledAt`; sin IDs, tipo, lease owner, payload ni errores.
- Cada intento de lectura admin autorizado exige callback inyectado `{requestId,event,occurredAt,adminActorId}` antes de consultar el store; el actor no aparece en el DTO. Si identidad/sink fallan, no se consulta el store ni se devuelve resumen. Una falla posterior de store mantiene el audit event del intento.
- La consulta es de solo lectura; no migraciones, escrituras, reintentos ni persistencia adicional.
- Los conteos de jobs no prueban por sí solos liveness del worker.

## UI feature-local

Resumen accesible de seis conteos, muestra la hora de muestreo y estados carga/vacío implícito/error/reintento. Botón de actualización manual. No presenta acciones operativas.

## Integración

El arquitecto conecta `createAdminQueueSummaryHttp`/repository en `apps/api/src/http/app.ts` y agrega ruta/navigation web. No editar `app.ts`, `main.ts`, router/clasificador ni contratos compartidos.

## Verificación

Tests de repository fake revisan filtros temporales de leases y agregados; HTTP fake verifica admin 200, teacher 403, anónimo 401 y que no se consulta store en denegaciones; web tests cubren cliente y pantalla. Typechecks API/web y `git diff --check`.
