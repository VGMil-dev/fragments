# Especificación — INC-AI-GATEWAY-429

## Entradas y clasificación

- Gateway 429: límite temporal; respuesta HTTP 429, código/ID seguros y `Retry-After` cuando estén presentes.
- Gateway 402 confirmado: restricción de presupuesto o pago; no confundirlo con un error 402 del proveedor.
- Gateway/proveedor 503: indisponibilidad temporal.
- Timeout antes de despacho: permitir recuperación controlada; timeout tras posible despacho: conservar reserva incierta.
- Resultado ambiguo: bloquear nuevos despachos y requerir conciliación manual.

## Despacho y ledger

- Una sola operación por clave idempotente lógica; almacenar únicamente SHA-256 de la clave.
- Un lease compartido en SQLite limita el despacho concurrente entre workers.
- Reintentar como máximo tres veces (hasta cuatro despachos) dentro de la misma operación solo si Gateway confirma un 429 previo al proveedor y no hay ID de generación ni respuesta del proveedor.
- Un timeout se reintenta de forma acotada solo si el wrapper `fetch` demuestra que la solicitud HTTP aún no comenzó; después de entrar a `fetch`, el resultado es ambiguo y queda incierto.
- Aplicar backoff exponencial con jitter y respetar `Retry-After`; el cooldown se comparte entre workers.
- Ningún reintento automático cuando el resultado financiero sea incierto.
- Sin solicitud nueva al proveedor para validación.

## API y UI

- Conservar estado HTTP, código de Gateway, ID técnico y `Retry-After` en logs redactados/respuesta cuando existan.
- No registrar mensajes, prompts, respuestas, credenciales, datos de estudiantes ni cuerpos del proveedor.
- Presentar 429 como límite temporal; reservar 402 presupuestario para un 402 confirmado por Gateway.
- No auto-reintentar en la UI un 429 ni ocultar el estado conciliatorio del ledger.

## Aceptación GIVEN / WHEN / THEN

- GIVEN Gateway 429 inequívoco y sin respuesta upstream WHEN se ejecuta la evaluación THEN respeta backoff, intenta hasta el máximo establecido y contabiliza una sola operación.
- GIVEN respuesta del proveedor, ID de generación o timeout después de despacho WHEN el intento falla THEN no reintenta automáticamente y conserva el holdback para revisión.
- GIVEN Gateway 402 confirmado WHEN el intento falla THEN responde como limitación presupuestaria/pago sin llamarlo rate limit.
- GIVEN múltiples workers y una misma clave WHEN despachan concurrentemente THEN solo uno obtiene el lease y no se crean cobros duplicados.
- GIVEN un 429 WHEN se informa al usuario THEN HTTP/UI indican límite temporal y no presupuesto agotado.

## Datos y UI

Migración SQLite aditiva para clave de operación y control compartido de despacho/cooldown. UI Mentor distingue límite temporal y proveedor indisponible. No cambia contratos compartidos.

El procedimiento autorizado de backup, conciliación, smoke test y rollback está en `recovery-plan.md`; no se ejecuta durante esta tarea.
