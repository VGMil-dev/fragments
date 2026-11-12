# Evidencia — INC-MENTOR-503

## Estado
Corrección de diagnóstico e interfaz desplegada. **Incidente funcional parcialmente recuperado; Mentor continúa bloqueado para nuevas evaluaciones** mientras no exista capacidad de reserva conforme al límite configurado. No se modificó ninguna reserva ni presupuesto. No se declara resuelto porque no se pudo probar una evaluación exitosa en producción sin una reserva autorizada.

## Revisión del presupuesto — 2026-11-12
La reserva `releasef12cap20261111` (`release_cap`) contiene USD 0.970249 en estado `reserved`, `actual_microusd=NULL`, creada 2026-11-11 03:09:58.401 UTC (2026-11-10 22:09:58.401 America/Bogota), sin cambios desde su creación. La evidencia privada F12 demuestra que se creó deliberadamente como protección de gasto para el release; no es una llamada Gateway pendiente. No hay evidencia de que ese holdback haya caducado ni autorización para retirarlo, por lo que se conserva.

Ledger actual (SQLite live `mode=ro`, `integrity_check=ok`): gasto confirmado USD 0.028910, reserva USD 0.970249, capacidad disponible USD 0.000841, `uncertain=0`. El máximo de reserva Mentor es USD 0.000870; faltan USD 0.000029. Liberar la reserva completa aumentaría el margen potencial en USD 0.970249 y el límite efectivo de gasto dejaría de ser el holdback de protección.

Mecanismo: `SqliteAiBudgetLedger.releaseBeforeDispatch(id)` conserva la fila y el coste real; solo cambia `reserved` a `released` si sigue `reserved`, y rechaza una segunda liberación. No hay vencimiento automático ni comando administrativo específico. No se ejecutó en producción. La evidencia detallada y el cálculo se guardaron en el paquete privado `evidence/budget-reconciliation.txt` (11 archivos de máximo 20).

Prueba local añadida: `pnpm --filter @fragments/api exec vitest run src/adapters/ai/budget-ledger.test.ts` — exit 0, 1 archivo, 6 pruebas. La prueba demuestra la reconciliación de un cap sintético confirmado como pre-dispatch, idempotencia y conservación íntegra del registro settled histórico. Gasto AI Gateway: USD 0.

Acción pendiente del propietario: decidir si mantiene este límite efectivo o autoriza un cambio de capacidad. Para una reserva Mentor máxima basta +USD 0.000029 de capacidad global; una liberación completa del holdback expondría USD 0.970249. Ninguna de esas opciones se ejecutó ni se desplegó.

## Causa raíz demostrada
En la revisión productiva de Fragments v0.3.0, 50 POST de evaluación finalizaron HTTP 503 y generaron 151 intentos de recuperación GET que respondieron 404. Las propuestas existían y validaban; ninguna excedía 24 KiB. No se persistieron evaluaciones nuevas para esa ráfaga. El ledger presentaba una reserva `release_cap`; el máximo de reserva Mentor no cabía con ella. El flujo del adaptador reserva antes de ejecutar `generateText`, y el rechazo de reserva ocurre antes del despacho. Por eso estos POST no llegaron a AI Gateway y no hay status 429/503 ni `Retry-After` del proveedor para ellos. No se observó evidencia de rate limiting, cuotas del Gateway, alta concurrencia o validación de entrada como causa.

Logs productivos previos no guardaban excepciones del adaptador ni estado del proveedor; Nginx solo conservaba la respuesta final. La interfaz trataba todos los fallos como motivo para buscar una evaluación guardada, lo que explicaba los 404 secundarios.

No hubo invocaciones facturables de Gateway: USD 0.

## Cambio implementado
- API clasifica por etapa (incluye reserva, despacho/respuesta del proveedor y validación); emite un evento estructurado seguro con tipo, duración, status HTTP de salida y status/código/Retry-After del proveedor cuando existan.
- Los logs no incluyen prompts, contenido de propuestas, datos personales, mensajes libres del SDK/proveedor ni secretos.
- Reserva insuficiente devuelve `AI_BUDGET_UNAVAILABLE`; Mentor UI muestra el mensaje y no hace el GET de recuperación que producía el 404 engañoso.
- No se añadieron reintentos, concurrencia nueva, proveedor, modelo, dependencias, presupuesto, tarifa, rúbrica o reglas de calificación.
- Las solicitudes concurrentes para la misma propuesta/version continúan coalesciéndose; errores con reserva incierta siguen bloqueando despachos duplicados.

## Archivos de código modificados
- `apps/api/src/adapters/ai/gateway-mentor-evaluator.ts`
- `apps/api/src/adapters/ai/gateway-mentor-evaluator.test.ts`
- `apps/api/src/features/mentor/service.ts`
- `apps/api/src/features/mentor/http.ts`
- `apps/api/src/features/mentor/http.test.ts`
- `apps/web/src/hooks/async-state.tsx`
- `apps/web/src/features/mentor/mentor-screen.tsx`
- `apps/web/src/features/mentor/mentor-screen.test.tsx`

## Pruebas locales
- `pnpm --filter @fragments/api test`: 27 archivos, 99 pruebas aprobadas.
- `pnpm --filter @fragments/web test`: 15 archivos, 56 pruebas aprobadas.
- `pnpm --filter @fragments/api typecheck`: correcto.
- `pnpm --filter @fragments/web typecheck`: correcto.
- `pnpm build`: tres paquetes correctos.
- Casos offline: reserva bloqueada sin dispatch; APICallError sintético 429 registra status/código/Retry-After sin contenido privado y evita segundo dispatch; dos POST concurrentes iguales producen una evaluación; UI no solicita recuperación después de AI_BUDGET_UNAVAILABLE.
- Ego Lite: UI con API mock sintética presentó el mensaje de falta de presupuesto; 1 POST, 0 GET de recuperación. Sin Playwright.
- `git diff --check`: correcto.

## Backup, despliegue y rollback
Antes de desplegar: `sudo systemctl start fragments-backup.service`.
Backup: `/var/backups/fragments/fragments-2026-11-12T01-19-52-505Z.sqlite`.
Backup verificado con SQLite de solo lectura: `PRAGMA integrity_check = ok`.
Imágenes anteriores de rollback confirmadas disponibles: `fragments-api:b83c479-arm64` y `fragments-web:b83c479-arm64`. Rollback de código/imagen no necesita restaurar ni sobrescribir SQLite.

Release aislada desplegada desde `/opt/fragments/releases/eef7eaf15534b3a7f5161eafcc05941e5269b039`; Compose reutiliza la configuración y archivo de secretos en la release histórica, sin copiarlos. Se recrearon exclusivamente `fragments-api-1` y `fragments-web-1`, secuencialmente. No se tocaron Pits, PostgreSQL ni Cloudflare Tunnel.

Commit/SHA desplegado: `eef7eaf15534b3a7f5161eafcc05941e5269b039`.
Imágenes API/web etiquetadas con ese revision SHA y `v0.3.0`. El tag histórico `v0.3.0` no se modificó.

## Verificación posterior al despliegue
- API y web: contenedores `healthy`, revisión de imagen `eef7eaf15534b3a7f5161eafcc05941e5269b039`.
- Por el proxy local productivo: `/` = HTTP 200; `/health` = HTTP 200; `/api/auth/get-session` = HTTP 200.
- Logs recientes API: solo inicio normal; sin contenido sensible. Nginx web inició sin errores.
- SQLite live en modo solo lectura: `integrity_check=ok`; `mentor_evaluations=211`, `mentor_control_versions=2`, `mentor_control_draft=1`, `session=4`, `sessions=0`, `trainer_sessions=17`, `user=1`, `ai_budget_reservations=217`.
- Backup predespliegue arroja los mismos conteos y `integrity_check=ok`; rúbricas, evaluaciones, sesiones y reservas existentes permanecen idénticas.
- Pits API y PostgreSQL siguieron `healthy`; no reiniciados.
- El flujo de evaluación real exitoso en producción **no pudo verificarse**: el ledger no tiene headroom para una reserva nueva, y no se realizó ni se facturó un intento. La regresión del mismo bloqueo quedó verificada con fixture local. Hasta que el propietario revise la reserva activa y haya headroom legítimo, Mentor seguirá respondiendo 503 `AI_BUDGET_UNAVAILABLE` antes del Gateway.

## Commits
- Código: `eef7eaf15534b3a7f5161eafcc05941e5269b039`.
- Cierre documental anterior: `2d35aad82785a85ba1e6bfab511b1ddd8f17b6cf`; hash de su evidencia: `ab1b53ebf74bf7a2cfba8a6a43a1b412f874a441`.
- Reconciliación diagnóstica/prueba: pendiente de commit; no desplegada.

## Evidencia privada local ignorada
`task-list/INC-MENTOR-503/evidence/` contiene 11 archivos, ignorados por `.git/info/exclude`; incluye diagnóstico redactado, comandos de verificación SQLite y scripts sintéticos de Ego Lite. No contiene `.env`, secretos ni contenido de estudiantes.

- Documentación y registro del incidente: 2d35aad82785a85ba1e6bfab511b1ddd8f17b6cf.
