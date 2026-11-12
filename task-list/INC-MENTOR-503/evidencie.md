# Evidencia — INC-MENTOR-503

## Estado
El diagnóstico/interfaz `eef7eaf…` continúa desplegado. La nueva estación recuperó el parche remoto `0cc8ca68ffb40038f8e7eb672cc6cd4a3d6573e3`; las suites locales detectaron que el parche quitaba el bloqueo de despachos inciertos y aceptaba costo desconocido como éxito. La corrección local `683930d6706e872d688fe2c227dbcccaeb75b058` conserva ambos bloqueos, elimina el tope monetario local y cuenta con pruebas completas aprobadas. **INC-MENTOR-503 permanece abierto:** no se confirmó en el panel autenticado que el presupuesto USD 5/No Refresh informado en el contexto aplique hoy a la API key `Fragments`; por esa puerta no se creó backup de intervención, no se desplegó el commit local y no se hizo una evaluación facturable.

## Revisión del presupuesto — 2026-11-12
La reserva `releasef12cap20261111` (`release_cap`) contiene USD 0.970249 en estado `reserved`, `actual_microusd=NULL`, creada 2026-11-11 03:09:58.401 UTC (2026-11-10 22:09:58.401 America/Bogota), sin cambios desde su creación. La evidencia privada F12 demuestra que se creó deliberadamente como protección de gasto para el release; no es una llamada Gateway pendiente. No hay evidencia de que ese holdback haya caducado ni autorización para retirarlo, por lo que se conserva.

Ledger actual (SQLite live `mode=ro`, `integrity_check=ok`): gasto confirmado USD 0.028910, reserva USD 0.970249, capacidad disponible USD 0.000841, `uncertain=0`. El máximo de reserva Mentor es USD 0.000870; faltan USD 0.000029. Liberar la reserva completa aumentaría el margen potencial en USD 0.970249 y el límite efectivo de gasto dejaría de ser el holdback de protección.

Mecanismo: `SqliteAiBudgetLedger.releaseBeforeDispatch(id)` conserva la fila y el coste real; solo cambia `reserved` a `released` si sigue `reserved`, y rechaza una segunda liberación. No hay vencimiento automático ni comando administrativo específico. No se ejecutó en producción. La evidencia detallada y el cálculo se guardaron en el paquete privado `evidence/budget-reconciliation.txt` (11 archivos de máximo 20).

Prueba local añadida: `pnpm --filter @fragments/api exec vitest run src/adapters/ai/budget-ledger.test.ts` — exit 0, 1 archivo, 6 pruebas. La prueba demuestra la reconciliación de un cap sintético confirmado como pre-dispatch, idempotencia y conservación íntegra del registro settled histórico. Gasto AI Gateway: USD 0.

Acción pendiente del propietario: decidir si mantiene este límite efectivo o autoriza un cambio de capacidad. Para una reserva Mentor máxima basta +USD 0.000029 de capacidad global; una liberación completa del holdback expondría USD 0.970249. Ninguna de esas opciones se ejecutó ni se desplegó.

## Presupuesto externo Vercel — 2026-11-12
Verificado en Ego Lite: team `vgmil-dev's projects` (plan Hobby) > AI Gateway > Budgets & Spend, dimensión API Keys. Vercel muestra “No team budget”; la fila de API key `Fragments` indica `Budget: Unlimited`, gasto MTD `$0.03`, y el Default de API Keys está `Not Set`. El gasto local confirmado de producción USD 0.028910 coincide con los $0.03 redondeados atribuidos a la clave `Fragments`; no se inspeccionó ningún valor secreto. Esto confirma que no hay un control monetario externo activo aplicable a la autenticación API-key. El presupuesto de proyecto no se asumió aplicable.

Gate no superado: se mantiene `AI_BUDGET_UNAVAILABLE`, no se libera `releasef12cap20261111`, no se modifica SQLite y no se despliega una versión que quite el bloqueo. Falta configurar un presupuesto no ilimitado y activo directamente para la key `Fragments` (preferido) o demostrar que un presupuesto de equipo aplica a esa autenticación. El monto y periodo deben ser decididos por el propietario. No hubo llamadas AI Gateway; gasto adicional USD 0. No se creó backup de intervención porque la etapa de configuración de presupuesto externo aún no se completó.

Evidencia privada del panel: `task-list/INC-MENTOR-503/evidence/vercel-budget.txt`; Ego Lite utilizó 20/20 archivos privados, todos ignorados por `.git/info/exclude`. No quedaron cambios de UI/source ni se desplegó.

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
- Prueba local de reconciliación/cierre de presupuesto: `f98a0ef5eb0cc7809a49c9d8b067b25230693185`; solo test y documentación, no desplegada.

## Evidencia privada local ignorada
`task-list/INC-MENTOR-503/evidence/` contiene 11 archivos, ignorados por `.git/info/exclude`; incluye diagnóstico redactado, comandos de verificación SQLite y scripts sintéticos de Ego Lite. No contiene `.env`, secretos ni contenido de estudiantes.

- Documentación y registro del incidente: 2d35aad82785a85ba1e6bfab511b1ddd8f17b6cf.

## Continuación — presupuesto Vercel y liberación F12 (2026-11-12)
- Vercel AI Gateway muestra la API key `Fragments` con presupuesto de USD 5, `No Refresh`, y uso MTD de USD 0.03. El uso coincide redondeado con USD 0.028910 asentados en producción. No se modificó la configuración externa.
- Antes de escribir en producción, backup `/var/backups/fragments/fragments-2026-11-12T12-24-01-437Z.sqlite`, SHA-256 `f578c29efb335b3903d9018ecf55f83fad313247569be0f8371586f480689fd8`; `PRAGMA integrity_check=ok` y las tablas de propuestas, evaluaciones, sesiones y ledger coincidieron con la base viva.
- Se verificó el propósito de `releasef12cap20261111`: holdback pre-dispatch de QA F12. A solicitud explícita del propietario, el API ejecutó `SqliteAiBudgetLedger.releaseBeforeDispatch` sobre ese ID; conservó la fila, monto USD 0.970249 y `actual_microusd=NULL`, pasando de `reserved` a `released`.
- Cambios de código sin ejecutar pruebas: el ledger ya no compara gasto/reservas/estados inciertos contra el tope local de USD 1; sigue guardando reservas y costos confirmados, deja como inciertos los costos no confirmados y no bloquea nuevas llamadas por ello. Si faltan tarifas, registra una estimación mínima de 1 microdólar. Se quitó también el máximo local de USD 1 al convertir costos.
- Los errores de proveedor HTTP 402 ahora producen HTTP 402 `AI_GATEWAY_BUDGET_EXCEEDED`, conservan diagnóstico seguro y la interfaz no ejecuta GET de recuperación ni retry automático.
- Persisten la coalescencia de POST idénticos y la unicidad de evaluaciones. Sin cambios de rúbrica, modelo, proveedor, Pits, PostgreSQL, Cloudflare, tag `v0.3.0` o llamadas al Gateway.
- No se ejecutaron tests, typecheck ni build por instrucción posterior del usuario; tampoco se hizo evaluación real facturable ni se desplegó este parche. La evaluación real recuperable por GET, el panel docente de consumo y el despliegue siguen pendientes. El incidente no se declara resuelto.
- Evidencia privada ignorada: 16 archivos bajo `evidence/` (límite 20). El backup y el procedimiento de reconciliación están en `verify-budget-backup.py` y `reconcile-release-cap.mjs`.

## Continuación — estación, validación y preflight de despliegue (2026-11-12)
- Estación: `D:\Trabajo\fragments` estaba en `main`/`b83c4799059694385f94363c209dea91ec0b542f` con `env` sin seguimiento. Se conservó sin cambios. `git fetch origin` confirmó `origin/codex/mentor-503-diagnostic` en `0cc8ca68ffb40038f8e7eb672cc6cd4a3d6573e3`. El worktree exFAT no admitió enlaces pnpm; se usó una clonación aislada en NTFS `C:\Users\vgmil\worktrees\fragments-mentor-503`. La rama local queda un commit por delante de origin; no se hizo push.
- SSH: comando inocuo por identidad explícita y `StrictHostKeyChecking=yes` respondió `host=gavanti`, `user=ubuntu`. No se modificó SSH config ni permisos de la llave.
- Revisión de diff `eef7eaf…`→`0cc8ca68…`: mantiene historial, pero la reserva ya no consultaba `uncertain` antes del despacho y `run()` ignoraba el estado de liquidación incierto. La prueba dirigida inicial confirmó esos fallos. El commit `683930d6706e872d688fe2c227dbcccaeb75b058` restaura el bloqueo global ante `uncertain`, vuelve a rechazar costo sin recibo y mantiene costos confirmados/overruns en el ledger sin imponer el tope local de USD 1. Añade pruebas para HTTP 402 y la UI. No se tocaron rúbricas, evaluaciones históricas, modelo ni cálculo académico.
- Validación fresca en `C:\Users\vgmil\worktrees\fragments-mentor-503`: API `27` archivos/`101` pruebas; web `15` archivos/`57` pruebas; ambos typecheck correctos; `pnpm build` terminó con `3/3` paquetes; `git diff --check` correcto. Pruebas dirigidas de Mentor/ledger: `4` archivos/`23` pruebas; prueba UI dirigida: `1` archivo/`6` pruebas.
- Preflight productivo de solo lectura: API y web `healthy`, ambos etiquetados `eef7eaf15534b3a7f5161eafcc05941e5269b039`; `/`, `/health` y `/api/auth/get-session` dieron HTTP `200`. SQLite `integrity_check=ok`; conteos: propuestas `260`, evaluaciones Mentor `211`, versiones de rúbrica `2`, borrador de control `1`, `session=4`, `sessions=0`, sesiones Trainer `17`, reservas ledger `217`. `releasef12cap20261111` figura `released`, monto `970249` microUSD y costo real nulo. Pits API y PostgreSQL seguían `healthy` y no se reiniciaron.
- Gate pendiente: Ego Lite redirigió a login de Vercel, por lo que el estado actual/aplicabilidad del presupuesto USD 5 `No Refresh` no pudo verificarse en el panel. No hubo llamadas AI Gateway ni gasto nuevo. No se creó backup de intervención, no se modificaron servicios ni SQLite y no se desplegó. Pendientes: confirmar el presupuesto desde una sesión autenticada; ejecutar backup consistente y verificarlo; comparar estado de datos y rollback; desplegar API/web; ejecutar una evaluación sintética real, recuperar por GET y comprobar costo/ledger/servicios. No cerrar el incidente.
- Evidencia privada de esta continuación: `evidence-continuation/` (4 archivos, ignorados por `.git/info/exclude`).
