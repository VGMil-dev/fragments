# Especificación — INC-AI-GATEWAY-429

## Alcance de archivos

La implementación y sus pruebas se limitan a estos paths:

- `apps/api/src/adapters/ai/budget-ledger.ts` y `budget-ledger.test.ts`: reservas, idempotencia, conciliación del estado lógico y slot/cooldown compartido.
- `apps/api/src/adapters/ai/gateway-error.ts` y `gateway-error.test.ts`: clasificación redactada del error y extracción segura de Retry-After/IDs.
- `apps/api/src/adapters/ai/gateway-dispatch-policy.ts` y `gateway-dispatch-policy.test.ts`: política de despacho, backoff, límites y resultado financiero de reintentos.
- `apps/api/src/adapters/ai/gateway-mentor-evaluator.ts` y `gateway-mentor-evaluator.test.ts`: adaptación del SDK y preservación de estado/certeza de despacho.
- `apps/api/src/features/mentor/service.ts`, `http.ts`, `service.test.ts` y `http.test.ts`: traducción del error a la interfaz Mentor.
- `apps/api/src/db/migrate.ts`, `migrate.test.ts` y `open.test.ts`: migración aditiva y compatibilidad al abrir la base.
- `apps/web/src/features/mentor/mentor-screen.tsx` y `mentor-screen.test.tsx`: presentación del rate limit/indisponibilidad sin reintento automático.
- `task-list/INC-AI-GATEWAY-429/{intent.md,spec.md,evidencie.md,recovery-plan.md,goldfish_review_report.md}` y `task-list/TASKS.md`: alcance, evidencia y procedimiento operativo de este incidente.

No modificar `packages/contracts`, configuración raíz/workspace, configuración TypeScript compartida ni rutas no listadas. Si aparece una dependencia que requiere uno de esos cambios, proponerla al planner antes de editarla.

## Entradas y clasificación

- Gateway 429: límite temporal; respuesta HTTP 429, código/ID seguros y `Retry-After` cuando estén presentes.
- Conservar status, código, ID y certeza de despacho al transformar excepciones del SDK en errores internos; la política debe clasificar el error normalizado igual que la excepción original.
- Gateway 402 confirmado: restricción de presupuesto o pago; no confundirlo con un error 402 del proveedor.
- Gateway/proveedor 503: indisponibilidad temporal.
- Timeout antes de despacho: permitir recuperación controlada; timeout tras posible despacho: conservar reserva incierta.
- Resultado ambiguo: bloquear nuevos despachos y requerir conciliación manual.

## Despacho y ledger

- Una sola operación por clave idempotente lógica; almacenar únicamente SHA-256 de la clave.
- Un lease compartido en SQLite limita el despacho concurrente entre workers.
- Reintentar como máximo tres veces (hasta cuatro despachos) dentro de la misma operación solo con evidencia afirmativa y confiable de que Gateway rechazó antes de intentar con un proveedor (por ejemplo `providerDispatchPossible=false` de una fuente confiable), y sin status/cuerpo de respuesta upstream ni evidencia contraria. La ausencia de ID de generación o de respuesta upstream, por sí sola, no confirma un rechazo previo. El `GatewayRateLimitError` disponible en el SDK actual no expone un contador/resultado de intentos de proveedor; por eso un 429 simple del SDK es ambiguo, no se reintenta y conserva la reserva incierta hasta conciliación.
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

- GIVEN Gateway 429 con evidencia afirmativa de que no se intentó despacho al proveedor WHEN se ejecuta la evaluación THEN respeta backoff, intenta hasta el máximo establecido y contabiliza una sola operación.
- GIVEN Gateway 429 sin evidencia afirmativa de que no despachó al proveedor WHEN falla la evaluación THEN no reintenta ni libera la reserva; la marca incierta aunque falten ID de generación y status upstream.
- GIVEN una señal explícita y confiable `providerDispatchPossible=false` para un Gateway 429 WHEN se ejecuta la evaluación THEN permite hasta tres reintentos con backoff/jitter, conserva una sola reserva y la libera solo al confirmarse sin cargo.
- GIVEN el adaptador normaliza la excepción del SDK WHEN la política recibe ese error THEN conserva la clasificación Gateway y ejecuta los mismos reintentos seguros.
- GIVEN respuesta del proveedor, ID de generación o timeout después de despacho WHEN el intento falla THEN no reintenta automáticamente y conserva el holdback para revisión.
- GIVEN Gateway 402 confirmado WHEN el intento falla THEN responde como limitación presupuestaria/pago sin llamarlo rate limit.
- GIVEN múltiples workers y una misma clave WHEN despachan concurrentemente THEN solo uno obtiene el lease y no se crean cobros duplicados.
- GIVEN un 429 WHEN se informa al usuario THEN HTTP/UI indican límite temporal y no presupuesto agotado.

## Datos y UI

Migración SQLite aditiva v12 en `apps/api/src/db/migrate.ts`:

- Agregar `ai_budget_reservations.operation_key TEXT` nullable. No modificar ni backfill de las filas existentes.
- Crear índice único parcial `ai_budget_operation_active(operation_key)` cuando `operation_key IS NOT NULL AND status IN ('reserved','uncertain','settled')`. Las filas `released` no impiden una repetición segura de la misma clave; cualquier estado activo/ambiguo/liquidado conserva unicidad.
- Crear singleton `ai_gateway_dispatch_control`: `id INTEGER PRIMARY KEY CHECK (id = 1)`, `lease_id TEXT`, `reservation_id TEXT`, `lease_until INTEGER NOT NULL DEFAULT 0`, `cooldown_until INTEGER NOT NULL DEFAULT 0`, `transient_failure_streak INTEGER NOT NULL DEFAULT 0`, `updated_at INTEGER NOT NULL DEFAULT 0`; insertar id 1 con `INSERT OR IGNORE`.
- Mantener los cambios aditivos y preservar migraciones anteriores, en particular Review v11. No añadir índices/tablas distintos a los descritos sin proponer un cambio de especificación.

La tabla singleton serializa el despacho global entre workers: lease activo devuelve espera; vencimiento con reserva activa la hace incierta y bloquea; cooldown vigente devuelve espera; solo en otro caso se adquiere el lease. Liberar después de éxito, rechazo confirmado o error. Para 429 respetar `Retry-After` y el backoff con jitter compartido; reiniciar la racha tras éxito.

UI Mentor distingue límite temporal y proveedor indisponible. No cambia contratos compartidos.

El procedimiento autorizado de backup, conciliación, smoke test y rollback está en `recovery-plan.md`; no se ejecuta durante esta tarea.
