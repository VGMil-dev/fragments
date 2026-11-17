# INC-AI-LEDGER-V2 — Especificación

## Entrada y datos
- Cada despacho recibe una clave SHA-256 estable del trabajo lógico; no se almacena el prompt en el ledger.
- `ai_budget_reservations.operation_key` es nullable para preservar filas históricas. Nuevas reservas requieren clave válida de 64 caracteres hexadecimales.
- Las reservas `reserved`, `uncertain` o `settled` de la misma clave impiden otro despacho. Una reserva `released` puede reutilizarse tras evidencia explícita de no despacho.
- Una reserva incierta diferente no bloquea la operación solicitada. El importe, estado e historial inciertos siguen contando en el resumen financiero.
- La reserva se verifica dentro de una transacción contra el límite local: costos liquidados más reservas activas/inciertas más el nuevo estimado no pueden rebasarlo.

## Límites de despacho
- Sin modelo, proveedor fijado o tarifas positivas configuradas, el adaptador falla antes de invocar el Gateway.
- Se estima el texto completo del prompt (instrucciones incluidas), se valida contra los límites de bytes/tokens de la solicitud, se conserva el máximo de tokens de salida y se mantiene `maxRetries: 0`.
- La estimación por caracteres UTF-8/4 no es el tokenizer facturado y el Gateway puede añadir overhead. No constituye garantía de techo estricto de facturación.

## Errores Gateway
- `402 quota_for_entity_exceeded` solo se libera cuando no hay evidencia de respuesta del proveedor.
- `429` ambiguo, timeout y `503` de proveedor permanecen inciertos; no se reintentan automáticamente.
- Se propagan únicamente status, códigos saneados, `Retry-After`, y un ID de generación con formato permitido.

## Persistencia y compatibilidad
- Migración v12 agrega `operation_key` al ledger y la v13 agrega `ai_operation_key` a retos Inspector para recuperar un resultado completado. No modifican costos, estados ni marcas de tiempo existentes; los índices aceptan reservas históricas sin identidad.
- Migración desde esquema v11 y reapertura del mismo archivo SQLite deben preservar la reserva histórica de 870 microUSD, los seis intentos históricos y retos Inspector previos.

## Aceptación GIVEN / WHEN / THEN
- GIVEN una operación incierta; WHEN se reserva otra clave; THEN se permite si la solicitud tiene límites/precio válidos y se conserva la operación incierta original.
- GIVEN una clave incierta o activa; WHEN otro worker intenta reservarla; THEN falla antes del proveedor, también después de reabrir SQLite.
- GIVEN un resultado ya persistido; WHEN Review/Mentor lo recupera; THEN devuelve el resultado almacenado sin costo nuevo.
- GIVEN un reto Inspector ya persistido para la misma operación; WHEN se vuelve a solicitar; THEN devuelve el reto almacenado sin despacho nuevo.
- GIVEN una generación Inspector recibida y validada; WHEN se persiste el reto; THEN se guarda antes de asentar la reserva, de modo que una caída entre persistencia y asiento pueda recuperar el reto sin otro despacho.
- GIVEN el costo comprometido alcanza el límite local; WHEN otra operación intenta reservar; THEN falla antes de invocar el proveedor, incluso bajo concurrencia.
- GIVEN falta de tarifa, modelo o proveedor; WHEN se solicita IA; THEN el fake de despacho no se invoca.
- GIVEN un Gateway 429 con upstream 503; WHEN se procesa; THEN queda incierto y no hay segundo despacho automático.
- GIVEN un rechazo Gateway de cuota explícito sin evidencia upstream; WHEN se procesa; THEN se libera solo su propia reserva.
- GIVEN el esquema v11; WHEN se aplican v12 y v13; THEN la integridad SQLite y los registros históricos permanecen intactos.
