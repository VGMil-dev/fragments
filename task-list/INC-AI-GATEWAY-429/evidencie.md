# Evidencia — INC-AI-GATEWAY-429

## Estado

Implementación y pruebas en rama aislada `codex/mentor-ai-incident`, basada y sincronizada con `origin/main` `e25bacf` mediante merge normal. Rama publicada por push normal y PR #43 abierto hacia `main`; no se fusionó ni desplegó. No se llamó al modelo.

## Diagnóstico de producción

- Vercel AI Gateway muestra el límite externo como HTTP 429 para la solicitud de generación `gen_01M7K1YVAMRVX1VXNKJ1E661T7` de `alibaba/qwen3.7-flash` (Alibaba Cloud), timestamp 2026-11-16 15:49:41 hora Bogotá.
- El panel de detalle registra respuesta upstream HTTP 503, “Service temporarily unavailable”, sin uso reportado y costo de inferencia/total USD 0.0000. El HTTP 429 no es prueba de presupuesto agotado.
- Presupuesto de equipo observado: USD 5, sin refresco; gasto MTD USD 0.02. Clave de producción `Fragments`: cap USD 5 sin refresco; gasto observado USD 0.05 y barra de consumo USD 0.02 / USD 5. No estaba agotado.
- API en `86313395ca2cc0470c5e84c9c4df9848b4a108d2`, saludable. A las 20:49:48.252550382Z el log registró `mentor_evaluation_failed`, etapa `provider_request`, tipo `GatewayRateLimitError`, estado registrado 503 y campos del proveedor nulos. El runtime SDK identifica ese tipo como status Gateway 429.
- Ledger productivo: una reserva incierta Mentor de 870 microUSD, creada 20:49:41.164Z y actualizada 20:49:48.251Z; coincide temporalmente con el evento Vercel. Total histórico settled USD 0.049498. La reserva incierta bloquea nuevos despachos.
- No existe ID de generación en el log del API para enlazar esa fila con el evento Vercel. Por tanto la coincidencia de tiempo más la evidencia de Vercel no es suficiente para atribuir con certeza el recibo de costo cero a la fila: queda en revisión manual. No se liberó, liquidó ni repitió.
- Vercel budget UI confirma que la cuota de Gateway no estaba agotada. No se tuvo evidencia de consola independiente del proveedor; los detalles disponibles proceden del registro integrado de Vercel.

## Cambios y verificación

- `apps/api/src/adapters/ai/gateway-error.ts` y `.test.ts`: clasifica por separado status/código de Gateway y del proveedor, valida IDs, interpreta `Retry-After` sin guardar cuerpos/mensajes, distingue rechazo sin cargo de despacho ambiguo.
- `apps/api/src/adapters/ai/gateway-dispatch-policy.ts` y `.test.ts`: máximo de tres reintentos (cuatro intentos totales), backoff exponencial con jitter, `Retry-After`, un lease/cooldown SQLite compartido. El timeout solo se reintenta si el wrapper confirma que `fetch` no comenzó; cualquier timeout después del límite de despacho queda incierto y no se reintenta.
- `apps/api/src/adapters/ai/budget-ledger.ts`, pruebas y migración 12: clave idempotente hasheada, sin duplicar operación terminada aunque el costo sea cero, libera solo si no hubo despacho o Vercel confirma rechazo sin cargo. Lease vencido se marca incierto. Se conserva la migración Review v11 incorporada desde el remoto.
- `apps/api/src/adapters/ai/gateway-mentor-evaluator.ts`, `apps/api/src/features/mentor/{service,http}.ts` y pruebas: preserva los estados/IDs de diagnóstico permitidos; HTTP 429 lleva `Retry-After`, Gateway 402 es distinto de provider 402, no afirma que un holdback signifique presupuesto agotado. Una auditoría final encontró que el adaptador perdía la categoría 429 al envolver la excepción SDK antes de que la política la viera; el fix preserva código, status, generación y posibilidad de despacho, con prueba que atraviesa el adaptador de producción usando `generateText` falso etiquetado.
- `apps/web/src/features/mentor/mentor-screen.tsx` y prueba: presenta rate limit y proveedor no disponible sin iniciar recuperación automática.
- La rama se actualizó por fetch y merge normal contra `origin/main` `e25bacf` (tag `v0.4.8`); la migración resultante conserva Review v11 y agrega Gateway v12. No cambia contratos compartidos.

Salidas frescas del HEAD local antes de publicar el PR:

- `pnpm exec turbo run test typecheck lint build --force` — PASS, 10 tareas; contratos 19/19, API 147/147 (31 archivos), web 97/97 (22 archivos); typecheck, lint y build PASS. Build web conserva avisos no bloqueantes `MODULE_LEVEL_DIRECTIVE` de `lucide-react` (`use client`).
- `node --test deploy/production/release-agent/test-release-agent-scripts.mjs deploy/production/release-agent/test-backup-script.mjs` — PASS, 10/10.
- `py -3 -m unittest discover -s deploy/production/release-agent -p 'test_*.py'` — PASS, 41 pruebas, 1 omitida.
- `node --test deploy/production/release-agent/test-turbo-release-metadata.mjs` — PASS, 1/1 con metadatos sintéticos. En esta unidad local exFAT se usaron opciones Git solo en el proceso para `safe.directory` y desactivar `core.commitGraph`; no se cambió configuración global ni del repositorio.
- `git diff --check` — PASS antes del commit de cierre.
- Prueba de regresión TDD del adaptador: falló antes del fix porque la evaluación rechazó tras el primer 429; pasó después con cuatro llamadas simuladas, una operación lógica y liquidación única. Suite focalizada Gateway/evaluador/API: 27/27 antes del último test de clasificación; tests actuales de evaluador y clasificador: 12/12.
- Revisión manual: cambios limitados al incidente, sin secretos, valores `.env`, prompts, respuestas o datos privados. No hay workflow/herramienta de análisis de seguridad automatizado disponible en el repositorio; pruebas específicas cubren redacción de logs, IDs permitidos, idempotencia, concurrencia y no reintento de resultado incierto. La revisión automatizada remota queda pendiente del CI del PR.
- Commits existentes: implementación inicial `d0c258399407b901f2ec7bb78e1ce223a63486d3`; merge normal `24802c15f88c8cda433abac4304678a3a037b903`; documentación inicial `da8270d205ee18803234bbefd3928703c52ace9d`; plan/ajuste de despacho `568812337ff1a38cae5207745fd160c2249fa6f3`; actualización de evidencia `df642b48f2d411cedb1291a7d2aeedc6b11a1143`; corrección de clasificación del adaptador `fd53ed48174e7442cdd375663e5d3d3669230e13`; informe Goldfish/estado de protección `226fe9ad6be382785d1c7cf4fc1f0e5be635e455`.
- PR: https://github.com/VGMil-dev/fragments/pull/43; run `44012457269` (#68) terminó `success` en HEAD `5ce6ab6d871a9bf602f4e42acec2ec71698cb4e4`, con tests, typecheck, lint, build, scripts de release y metadatos. PR abierto y mergeable.
- Protección de `main`: el endpoint clásico `/branches/main/protection` devuelve 403 para la integración conectada. Se leyó el ruleset activo `Fragments main via pull request` (ID 27138875), dirigido a `refs/heads/main`: requiere PR y el status `verify` estricto; requiere 0 aprobaciones humanas; exige resolver hilos de revisión; solo permite merge commit; niega force-push, borrado y bypass (`current_user_can_bypass=never`). Por esta regla no hay aprobación humana obligatoria. El PR no fue fusionado ni desplegado.
- Goldfish: tres revisores EGM frescos revisaron el HEAD `5ce6ab6d871a9bf602f4e42acec2ec71698cb4e4`: Codebase Details, Implementation Readiness y Zoom Out. Los tres completaron lecturas requeridas; resultado agregado 0 Blockers, 0 Majors y 0 Nits. Informe: `goldfish_review_report.md`. El reviewer de readiness deja como puerta previa a release verificar compatibilidad de la imagen API anterior con SQLite v12; no es un permiso de merge ni declara producción recuperada.
- CI `Fragments CI` run `44013119522` (#69) terminó `success` sobre el commit del informe Goldfish `226fe9ad6be382785d1c7cf4fc1f0e5be635e455`; job `verify` y todos los pasos finalizaron en verde. El siguiente commit es solo actualización de trazabilidad; requiere su propio CI y revisión Goldfish final sobre el HEAD definitivo.
- No hay análisis de seguridad automatizado de repositorio configurado. No hay CODEOWNERS ni revisión humana en PR #43. Se pidió al usuario que indique quién debe ser el revisor independiente; hasta entonces el PR está sin solicitud de revisión y R7 queda pendiente.
- Sin merge, tag ni despliegue.
- Plan operativo concreto, no ejecutado: `recovery-plan.md`. Como no existe endpoint ni CLI administrativa auditada para conciliar, cualquier modificación de la fila productiva sigue NO-GO sin correlación inequívoca, autorización y revisión doble.
- La fila incierta productiva sigue sin modificar. No se ejecutó evaluación, reconciliación ni llamada al proveedor.

## Límites y riesgo restante

- La producción continúa bloqueada por la reserva incierta hasta correlacionar con ID compartido o revisión manual autorizada.
- La recuperación de software está preparada en la rama, pero requiere revisión, integración y despliegue autorizado para afectar producción. La conciliación sigue bloqueada por falta de ID compartido y de mecanismo administrativo auditado.
- No se ha validado gasto con un nuevo llamado facturable y no debe inferirse un resultado de producción posterior.

## Revalidación tras Goldfish R2

- Goldfish revisó el HEAD `d29d0649a883113d0c5898d217e0cf279016c1e4` y encontró dos Majors: faltaba el caso de agotamiento de cuatro intentos confirmados sin cargo, y el estado de tarea/evidencia citaba CI de un HEAD anterior mientras afirmaba completitud. También dejó un Nit sobre el alcance SHA del informe previo. Ver `goldfish_review_report.md`; los ceros de R1 aplican solo a `5ce6ab6`.
- Se añadió en `apps/api/src/adapters/ai/gateway-dispatch-policy.test.ts` una regresión que comprueba cuatro llamadas como máximo, tres esperas, HTTP 429 final, una reserva idempotente liberada, cero monto liquidado/reservado y ledger no bloqueado.
- Verificación local fresca: prueba focalizada `pnpm --filter @fragments/api exec vitest run src/adapters/ai/gateway-dispatch-policy.test.ts --pool=forks --maxWorkers=1 --reporter=verbose` — PASS, 6/6. (El runner predeterminado quedó sin salida; se interrumpió y se ejecutó explícitamente con pool forks.)
- `pnpm exec turbo run test typecheck lint build --force` — PASS, 10/10 tareas; contratos 19/19, API 148/148, web 97/97; typecheck, lint y build PASS. El build mantiene avisos no bloqueantes `MODULE_LEVEL_DIRECTIVE` de `lucide-react`.
- `TASKS.md` se dejó `[ ]` hasta que el HEAD publicado tenga CI y revisión Goldfish frescos sobre SHA idéntico. En ese momento, la corrida local documentada correspondía a `a71ef7a`; la reserva productiva sigue intacta, sin llamada IA, conciliación, merge ni despliegue.
- El commit `a71ef7a1cf050b43c496bb159fc7371ea9d819d6` quedó publicado en el branch del PR #43. CI remoto `Fragments CI` run `44014427434` (#71), job obligatorio `verify` `133808817329`, terminó `success` sobre ese SHA; pasos de scripts de release y `test, typecheck, lint, build` terminaron en verde.
- La Goldfish R2 sobre `a71ef7a` encontró 0 Blockers, 1 Major y 1 Nit. El Major solicitó enumerar paths y especificar columnas/índices de SQLite v12; el Nit señaló que el estado decía commit/CI pendientes pese al HEAD ya publicado. La especificación se completó y las referencias se corrigieron en el cambio documental siguiente.
- Esta revisión documental crea un HEAD posterior; se conserva la tarea `[ ]` hasta publicar ese commit y confirmar CI y Goldfish frescos en el SHA nuevo. La validación citada para `a71ef7a` no se atribuye al HEAD posterior. Reserva productiva intacta; sin llamada IA, conciliación, merge ni despliegue.
- CI #72 (`44014942964`, job `verify`) terminó `success` sobre `743007db0340bf3c93ca5e3dd20f8645ec3edd69`.
- Goldfish R3 sobre ese mismo SHA halló un Major financiero: la envoltura tras 429 ambiguo omitía `providerDispatchPossible`, lo que podía hacer que ledger tratara el rechazo como confirmado sin cargo. También pidió que `spec.md` enumerara literalmente `service.test.ts` y `http.test.ts`; ambos paths ya están incluidos. Zoom Out y Readiness registraron Nits documentales/base local stale; no declararon falsos los resultados históricos. Ver `goldfish_review_report.md`.
- Se añadió una regresión completa en `gateway-dispatch-policy.test.ts` y el wrapper ahora conserva la señal explícita de posible despacho. TDD observado: la nueva prueba falló en el estado anterior al arreglo al no encontrar `providerDispatchPossible`; pasó tras el arreglo. Suite focalizada en estado corregido PASS 7/7. Estas modificaciones aún no tienen commit/CI/Goldfish final.
- Durante esta revalidación `git fetch origin main` confirmó que `origin/main` avanzó a `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf` (merge de PR #44), posterior a la base del PR consultada (`e25bacf`). Se integró al branch por merge normal `7ea1d43cfd0a7c4bf0422c628bf20f38674f1f8e`; no se modificó `main`.
- Tras ese merge, `pnpm exec turbo run test typecheck lint build --force` — PASS, 10/10 tareas; contratos 19/19, API 152/152, web 97/97; typecheck, lint y build PASS. Build conserva avisos no bloqueantes `MODULE_LEVEL_DIRECTIVE` de `lucide-react`. `git diff --check` — PASS.
- Este registro y el merge requieren un push posterior y checks nuevos; los CI #71/#72 y Goldfish R1/R2/R3 citados arriba pertenecen a SHA anteriores. No se atribuyen al HEAD nuevo. Producción/ledger permanecen intactos.
