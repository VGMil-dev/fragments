# Especificación — INC-MENTOR-503

## Recuperación del presupuesto

- Gate obligatorio: confirmar presupuesto activo para la API key o equipo que autentica AI Gateway; un presupuesto de proyecto no se considera aplicable a una API key sin evidencia.
- Para llamadas facturables, exigir presupuesto global vigente y aplicable en Vercel AI Gateway. El ledger SQLite es registro de costos e idempotencia por operación, no un presupuesto ni un techo acumulado local.
- Consultar en modo solo lectura el ledger y el historial privado del release.
- Clasificar cada reserva por estado, propósito, antigüedad y vínculo a despachos reales; no considerar huérfana una reserva de protección deliberada solo porque no tenga llamada asociada.
- La reserva `uncertain` permanece registrada y bloquea únicamente una repetición con la misma clave de operación. No impide operaciones independientes; Vercel AI Gateway gobierna el presupuesto global.
- Solo liberar reserva demostrablemente pre-dispatch mediante `releaseBeforeDispatch`; nunca borrar filas, cambiar importes a mano ni liberar automáticamente.
- El ledger conserva costos y reservas históricos sin cambiar estados o montos; no aplica un tope acumulado local ni bloquea llamadas independientes por costos históricos o inciertos. La respuesta Vercel HTTP 402 se propaga como error seguro sin reintentos.
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
2. Dado un error sintético 429 con `Retry-After`, cuando se procesa, diagnóstico conserva solo status, código seguro y demora; no se exponen mensajes ni prompts. Si el resultado es ambiguo, solo la misma clave queda protegida contra otro despacho.
3. Dadas dos solicitudes concurrentes idénticas, cuando se evalúan, se guarda una evaluación y ambas reciben el mismo resultado.
4. Dado `AI_BUDGET_UNAVAILABLE`, la UI no realiza GET de recuperación.
5. Tests dirigidos, typecheck y build pasan.
6. Dado un HTTP 402 sintético de Gateway, la API conserva HTTP 402 y un error seguro; la UI no inicia recuperación GET ni reintenta automáticamente.
