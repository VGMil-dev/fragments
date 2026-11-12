# Especificación — INC-MENTOR-503

## Recuperación del presupuesto

- Gate obligatorio: confirmar presupuesto activo para la API key o equipo que autentica AI Gateway; un presupuesto de proyecto no se considera aplicable a una API key sin evidencia.
- Si falta presupuesto externo verificable, conservar el bloqueo monetario local y no liberar `release_cap`, desplegar gasto sin protección ni ejecutar llamada facturable.
- Consultar en modo solo lectura el ledger y el historial privado del release.
- Clasificar cada reserva por estado, propósito, antigüedad y vínculo a despachos reales; no considerar huérfana una reserva de protección deliberada solo porque no tenga llamada asociada.
- Calcular capacidad como límite - costes `settled` - reservas `reserved`/`uncertain`; una reserva `uncertain` mantiene el bloqueo global.
- Solo liberar reserva demostrablemente pre-dispatch mediante `releaseBeforeDispatch`; nunca borrar filas, cambiar importes a mano ni liberar automáticamente.
- Una vez verificado el presupuesto efectivo para la API key de producción, el ledger registra costos y reservas históricas; no aplica un tope monetario local ni bloquea llamadas por costos desconocidos. La respuesta Vercel HTTP 402 se propaga como error seguro sin reintentos.
- Probar en SQLite efímera que una reconciliación de fixture huérfana conserva cargos históricos y es idempotente.
- No llamar AI Gateway y no escribir en SQLite productiva durante este diagnóstico.

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
6. Dado un HTTP 402 sintético de Gateway, la API conserva HTTP 402 y un error seguro; la UI no inicia recuperación GET ni reintenta automáticamente.
