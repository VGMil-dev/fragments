# Especificación — INC-MENTOR-503

- Entrada: evaluación Mentor existente y fallos del adaptador/ledger.
- Diagnóstico interno: evento JSON con etapa, tipo de error, duración, HTTP resultante y status/código/Retry-After del proveedor cuando estén disponibles. Excluye prompt, propuesta, identidad, mensajes libres del proveedor y secretos.
- Reserva insuficiente: API devuelve `AI_BUDGET_UNAVAILABLE`; no se invoca el adaptador del proveedor; la UI presenta el motivo seguro y no hace recuperación de una evaluación inexistente.
- Otro error: mantiene respuesta genérica pública existente, con diagnóstico estructurado interno.
- Éxito: conserva el DTO, evaluación almacenada, criterios, cálculo del servidor y versión inmutable de la rúbrica.
- Idempotencia: solicitudes concurrentes para la misma propuesta/version comparten una evaluación; reservas inciertas bloquean redispatch. Sin política de retry nueva salvo evidencia de rate limiting.

## Aceptación
1. Dado un ledger sin capacidad, cuando Mentor evalúa, devuelve 503 clasificado como `budget_reservation` y no despacha.
2. Dado un error sintético 429 con `Retry-After`, cuando se procesa, diagnóstico conserva solo status, código seguro y demora; no se exponen mensajes ni prompts.
3. Dadas dos solicitudes concurrentes idénticas, cuando se evalúan, se guarda una evaluación y ambas reciben el mismo resultado.
4. Dado `AI_BUDGET_UNAVAILABLE`, la UI no realiza GET de recuperación.
5. Tests dirigidos, typecheck y build pasan.
