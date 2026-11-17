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

## Fases y checkpoints de implementación

Cada fase debe terminar en estado buildable y con sus pruebas enfocadas verdes antes de continuar:

1. **Esquema y ledger:** aplicar las migraciones aditivas v12/v13/v14 en `apps/api/src/db/migrate.ts`; implementar `operation_key`, índice parcial y control compartido de slots/cooldown/sondeo en `apps/api/src/adapters/ai/budget-ledger.ts`. Ejecutar `apps/api/src/db/migrate.test.ts`, `apps/api/src/db/open.test.ts` y `apps/api/src/adapters/ai/budget-ledger.test.ts`. Checkpoint: Review v11 y datos anteriores se conservan; operaciones ambiguas no se liberan; hasta dos despachos saludables pueden ejecutarse en paralelo.
2. **Clasificación y política de despacho:** implementar `apps/api/src/adapters/ai/gateway-error.ts`, `apps/api/src/adapters/ai/gateway-error.test.ts`, `apps/api/src/adapters/ai/gateway-dispatch-policy.ts` y `apps/api/src/adapters/ai/gateway-dispatch-policy.test.ts`. Checkpoint: Gateway 402 confirmado queda separado; 429 desnudo es incierto; retry solo con prueba positiva de no despacho; timeout solo se reintenta antes de `fetch`; backoff/cooldown quedan acotados y compartidos.
3. **Integración Mentor y UI:** actualizar `apps/api/src/adapters/ai/gateway-mentor-evaluator.ts`, `apps/api/src/features/mentor/service.ts`, `apps/api/src/features/mentor/http.ts`, `apps/api/src/features/mentor/service.test.ts`, `apps/api/src/features/mentor/http.test.ts`, `apps/web/src/features/mentor/mentor-screen.tsx` y `apps/web/src/features/mentor/mentor-screen.test.tsx`. Checkpoint: status/código/IDs permitidos y certeza de despacho sobreviven las capas; UI no reintenta sola ni llama al 429 agotamiento de presupuesto.
4. **Verificación integrada y entrega:** ejecutar la suite/tareas del workspace y CI `verify`; revisar diff y evidencia; completar revisión Goldfish sobre el SHA publicado. Checkpoint: cero Blockers/Majors en el HEAD final; sin llamada productiva, conciliación, merge ni deploy dentro de esta tarea. Puertas de release y conciliación permanecen en `recovery-plan.md`.

## Entradas y clasificación

- Gateway 429: límite temporal; respuesta HTTP 429, código/ID seguros y `Retry-After` cuando estén presentes.
- Conservar status, código, ID y certeza de despacho al transformar excepciones del SDK en errores internos; la política debe clasificar el error normalizado igual que la excepción original.
- Gateway 402 confirmado: restricción de presupuesto o pago; no confundirlo con un error 402 del proveedor.
- Gateway/proveedor 503: indisponibilidad temporal.
- Timeout antes de despacho: permitir recuperación controlada; timeout tras posible despacho: conservar reserva incierta.
- Resultado ambiguo: bloquear nuevos despachos y requerir conciliación manual.

## Despacho y ledger

- Para Mentor, la identidad lógica se deriva en el API de `proposal.id`, `proposal.version`, SHA-256 de la propuesta canónica y versión activa del contexto/rúbrica, en ese orden y separados por `:`. El API la usa también como clave de coalescencia/cache; el adaptador calcula SHA-256 de esa cadena UTF-8 antes de pasarla al ledger. El ledger valida y persiste únicamente el digest hexadecimal de 64 caracteres. El cliente no define ni modifica esta identidad. La ruta Mentor de producción siempre proporciona esa clave; el adaptador rechaza antes de reservar o despachar si no recibe una.
- El índice parcial reserva una sola operación activa/ambigua/liquidada por digest. `reserved`, `uncertain` y `settled` rechazan una repetición; solo `released` permite repetir la misma clave. Costo cero sigue siendo `settled`, no habilita repetición.
- En estado saludable se permiten hasta dos slots individuales; no existe lease global. Tras un 429 confirmado sin cargo o timeout pre-despacho, se activa el cooldown SQLite compartido, se drenan slots saludables en vuelo y un único lease de sondeo queda disponible; los demás workers esperan. El sondeo respeta el cooldown, una nueva limitación lo renueva y su éxito desactiva el modo limitado. Un lease vencido convierte su reserva en `uncertain` y bloquea nuevos despachos. Cualquier reserva `uncertain` bloquea globalmente antes de revisar slots.
- Reintentar como máximo tres veces (hasta cuatro despachos) dentro de la misma operación solo con evidencia afirmativa y confiable de que Gateway rechazó antes de intentar con un proveedor (por ejemplo `providerDispatchPossible=false` de una fuente confiable), y sin status/cuerpo de respuesta upstream ni evidencia contraria. La ausencia de ID de generación o de respuesta upstream, por sí sola, no confirma un rechazo previo. El `GatewayRateLimitError` disponible en el SDK actual no expone un contador/resultado de intentos de proveedor; por eso un 429 simple del SDK es ambiguo, no se reintenta y conserva la reserva incierta hasta conciliación.
- Un timeout se reintenta de forma acotada solo si el wrapper `fetch` demuestra que la solicitud HTTP aún no comenzó; después de entrar a `fetch`, el resultado es ambiguo y queda incierto.
- Backoff exacto: base de 1.000 ms; la cota exponencial es `min(30.000, 1.000 × 2^(racha−1))`; jitter uniforme entero de 0 a esa cota inclusive y la espera es `max(100 ms, Retry-After, jitter)`. Espera por lease añade jitter uniforme entero de 0 a 100 ms. `Retry-After` numérico o HTTP-date se limita a 86.400.000 ms. Se hace retry solo si cada espera es ≤30.000 ms y el tiempo acumulado más la espera no excede 60.000 ms desde el comienzo. Una cabecera mayor se respeta como cooldown compartido, pero no se duerme/reintenta esa operación; se devuelve el 429 con el tiempo restante. Espera por lease/cooldown tiene presupuesto de 30.000 ms; vencido, devuelve un rate limit local 429 con `Retry-After`. Un éxito de sondeo limpia la racha/cooldown.
- Ningún reintento automático cuando el resultado financiero sea incierto.
- Sin solicitud nueva al proveedor para validación.

## API y UI

- Los errores de evaluación tienen cuerpo `{ok:false,error:{code,message}}`; la respuesta nunca incluye IDs de generación, códigos upstream, prompts, respuestas ni estado del ledger. Los diagnósticos redactados pueden incluir solo etapa, tipo seguro, estado Gateway/proveedor, códigos validados, ID `gen_…` validado, tipo de fallo, duración y `retry_after_ms`.
- Correspondencia HTTP/API: Gateway o proveedor 429 y cooldown local vencido → HTTP 429 `AI_RATE_LIMITED`; Gateway 402 → HTTP 402 `AI_GATEWAY_BUDGET_EXCEEDED`; provider 402 o Gateway/provider 503 → HTTP 503 `AI_PROVIDER_UNAVAILABLE`; bloqueo por reserva incierta/error local de presupuesto → HTTP 503 `AI_BUDGET_UNAVAILABLE`; espera máxima excedida u otros errores → HTTP 503 `EVALUATION_UNAVAILABLE`. Cualquier `Retry-After` validado acompaña 429/503. El 402 presupuestario solo corresponde a status Gateway confirmado; un 402 upstream nunca se etiqueta como agotamiento de presupuesto.
- El registro conserva el status Gateway y el del proveedor por separado; el status de respuesta HTTP refleja el código publicado en esta tabla. Un 429 upstream se comunica como límite temporal, pero no activa retry automático porque ya hubo respuesta/despacho posible.
- No registrar mensajes, prompts, respuestas, credenciales, datos de estudiantes ni cuerpos del proveedor.
- La UI muestra límite temporal o indisponibilidad con acción manual posterior; no programa retries ni clasifica el holdback como presupuesto agotado.
- No auto-reintentar en la UI un 429 ni ocultar el estado conciliatorio del ledger.

## Aceptación GIVEN / WHEN / THEN

- GIVEN Gateway 429 con evidencia afirmativa de que no se intentó despacho al proveedor WHEN se ejecuta la evaluación THEN respeta backoff, intenta hasta el máximo establecido y contabiliza una sola operación.
- GIVEN Gateway 429 sin evidencia afirmativa de que no despachó al proveedor WHEN falla la evaluación THEN no reintenta ni libera la reserva; la marca incierta aunque falten ID de generación y status upstream.
- GIVEN una señal explícita y confiable `providerDispatchPossible=false` para un Gateway 429 WHEN se ejecuta la evaluación THEN permite hasta tres reintentos con backoff/jitter, conserva una sola reserva y la libera solo al confirmarse sin cargo.
- GIVEN el adaptador normaliza la excepción del SDK WHEN la política recibe ese error THEN conserva la clasificación Gateway y ejecuta los mismos reintentos seguros.
- GIVEN un marcador `safeNoCharge=true` pero también status/respuesta upstream WHEN se evalúa la certeza financiera THEN evidencia upstream prevalece, no hay retry, y la reserva queda incierta.
- GIVEN respuesta del proveedor, ID de generación o timeout después de despacho WHEN el intento falla THEN no reintenta automáticamente y conserva el holdback para revisión.
- GIVEN Gateway 402 confirmado WHEN el intento falla THEN responde como limitación presupuestaria/pago sin llamarlo rate limit.
- GIVEN múltiples workers y una misma clave WHEN despachan concurrentemente THEN solo uno obtiene el lease y no se crean cobros duplicados.
- GIVEN claves distintas y sin rate limit/cooldown WHEN despachan THEN pueden estar simultáneamente en vuelo hasta el máximo saludable de dos; la tercera espera.
- GIVEN un rate limit confirmado WHEN workers esperan cooldown THEN existe un único lease de sondeo; resultado 429 renueva la espera, éxito libera el modo limitado y vencimiento del lease deja la operación incierta.
- GIVEN un 429 WHEN se informa al usuario THEN HTTP/UI indican límite temporal y no presupuesto agotado.
- GIVEN un 503 upstream con `Retry-After` WHEN el API lo informa THEN devuelve HTTP 503 `AI_PROVIDER_UNAVAILABLE`, conserva la cabecera y no expone IDs/códigos privados en el cuerpo.

## Cobertura de pruebas obligatoria

- Reintento agotado: cuatro respuestas Gateway 429 confirmadas sin cargo, exactamente cuatro llamadas, tres esperas, una fila `released`, cero costo y ledger sin bloqueo.
- `Retry-After`: una espera ≤30 s se respeta; una de 40 s no se reintenta, produce un 429, libera solo tras confirmación sin cargo y activa cooldown; cabecera HTTP-date válida y valor malformado se manejan sin lanzar error.
- Workers/cooldown: en estado saludable dos reservas distintas adquieren slots y la tercera espera; tras 429 se drenan los slots existentes, todos esperan hasta cooldown, solo un sondeo toma lease, éxito lo limpia, otro 429 renueva la espera y la expiración marca incierta su reserva.
- Idempotencia: misma identidad concurrente rechaza segunda reserva; `settled` con costo cero rechaza repetición; `released` permite retry de clave; DB contiene solo SHA-256 de identidad canónica.
- Migración: v11→v12→v13→v14 conserva IDs/datos históricos, `operation_key` existente queda null, `rate_limit_active` inicia en cero y la tabla nueva de slots inicia vacía.
- Incertidumbre: respuesta upstream, posible despacho, timeout después de `fetch`, o marcador de no-cargo que contradice status upstream nunca producen segundo despacho ni liberación; la fila termina incierta.
- HTTP/redacción: contrato por Gateway 429, cooldown local, Gateway 402, provider 402/503 y error genérico; `Retry-After` se conserva; solo campos permitidos aparecen en logs; ningún ID técnico se devuelve en el cuerpo.

## Datos y UI

Migraciones SQLite aditivas v12/v13/v14 en `apps/api/src/db/migrate.ts`:

- Agregar `ai_budget_reservations.operation_key TEXT` nullable. No modificar ni backfill de las filas existentes.
- Crear índice único parcial `ai_budget_operation_active(operation_key)` cuando `operation_key IS NOT NULL AND status IN ('reserved','uncertain','settled')`. Las filas `released` no impiden una repetición segura de la misma clave; cualquier estado activo/ambiguo/liquidado conserva unicidad.
- Crear singleton `ai_gateway_dispatch_control`: `id INTEGER PRIMARY KEY CHECK (id = 1)`, `lease_id TEXT`, `reservation_id TEXT`, `lease_until INTEGER NOT NULL DEFAULT 0`, `cooldown_until INTEGER NOT NULL DEFAULT 0`, `transient_failure_streak INTEGER NOT NULL DEFAULT 0`, `updated_at INTEGER NOT NULL DEFAULT 0`; insertar id 1 con `INSERT OR IGNORE`.
- En v13, agregar a ese singleton `rate_limit_active INTEGER NOT NULL DEFAULT 0`; el valor cambia a 1 tras un 429 confirmado sin cargo o timeout pre-despacho y solo se limpia tras éxito de sondeo.
- En v14, crear `ai_gateway_dispatch_slots(lease_id PRIMARY KEY, reservation_id UNIQUE, lease_until)` más índice de vencimiento. El modo saludable permite como máximo dos despachos con lease. Al vencer un lease, la reserva pasa a incierta. El cooldown impide nuevas adquisiciones saludables, espera que terminen los leases previos y deja un único sondeo activo.
- Mantener los cambios aditivos y preservar migraciones anteriores, en particular Review v11. No añadir índices/tablas distintos a los descritos sin proponer un cambio de especificación.

La tabla de slots limita la concurrencia normal a dos y guarda leases por reserva. El singleton coordina cooldown y el lease de sondeo. En modo limitado, leases saludables aún activos se drenan antes de sondear; lease de sondeo activo devuelve espera; su vencimiento hace incierta la reserva y bloquea; cooldown vigente devuelve espera; vencido el cooldown solo un worker obtiene el lease de sondeo. Un 429/no-cargo renueva cooldown; cada respuesta 429 adicional extiende el cooldown compartido. El éxito de sondeo limpia modo/raya/cooldown. Éxito de una solicitud saludable no puede limpiar un cooldown activado por otra solicitud.

UI Mentor distingue límite temporal y proveedor indisponible. No cambia contratos compartidos.

El procedimiento autorizado de backup, conciliación, smoke test y rollback está en `recovery-plan.md`; no se ejecuta durante esta tarea.
