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
- Commits existentes: implementación inicial `d0c258399407b901f2ec7bb78e1ce223a63486d3`; merge normal `24802c15f88c8cda433abac4304678a3a037b903`; documentación inicial `da8270d205ee18803234bbefd3928703c52ace9d`; plan/ajuste de despacho `568812337ff1a38cae5207745fd160c2249fa6f3`; actualización de evidencia `df642b48f2d411cedb1291a7d2aeedc6b11a1143`; corrección de clasificación del adaptador `fd53ed48174e7442cdd375663e5d3d3669230e13`.
- PR: https://github.com/VGMil-dev/fragments/pull/43; run `44012457269` (#68) terminó `success` en HEAD `5ce6ab6d871a9bf602f4e42acec2ec71698cb4e4`, con tests, typecheck, lint, build, scripts de release y metadatos. PR abierto y mergeable.
- Protección de `main`: el endpoint clásico `/branches/main/protection` devuelve 403 para la integración conectada. Se leyó el ruleset activo `Fragments main via pull request` (ID 27138875), dirigido a `refs/heads/main`: requiere PR y el status `verify` estricto; requiere 0 aprobaciones humanas; exige resolver hilos de revisión; solo permite merge commit; niega force-push, borrado y bypass (`current_user_can_bypass=never`). Por esta regla no hay aprobación humana obligatoria. El PR no fue fusionado ni desplegado.
- Goldfish: tres revisores EGM frescos revisaron el HEAD `5ce6ab6d871a9bf602f4e42acec2ec71698cb4e4`: Codebase Details, Implementation Readiness y Zoom Out. Los tres completaron lecturas requeridas; resultado agregado 0 Blockers, 0 Majors y 0 Nits. Informe: `goldfish_review_report.md`. El reviewer de readiness deja como puerta previa a release verificar compatibilidad de la imagen API anterior con SQLite v12; no es un permiso de merge ni declara producción recuperada.
- No hay análisis de seguridad automatizado de repositorio configurado. No hay CODEOWNERS ni revisión humana en PR #43. Se pidió al usuario que indique quién debe ser el revisor independiente; hasta entonces el PR está sin solicitud de revisión y R7 queda pendiente.
- Sin merge, tag ni despliegue.
- Plan operativo concreto, no ejecutado: `recovery-plan.md`. Como no existe endpoint ni CLI administrativa auditada para conciliar, cualquier modificación de la fila productiva sigue NO-GO sin correlación inequívoca, autorización y revisión doble.
- La fila incierta productiva sigue sin modificar. No se ejecutó evaluación, reconciliación ni llamada al proveedor.

## Límites y riesgo restante

- La producción continúa bloqueada por la reserva incierta hasta correlacionar con ID compartido o revisión manual autorizada.
- La recuperación de software está preparada en la rama, pero requiere revisión, integración y despliegue autorizado para afectar producción. La conciliación sigue bloqueada por falta de ID compartido y de mecanismo administrativo auditado.
- No se ha validado gasto con un nuevo llamado facturable y no debe inferirse un resultado de producción posterior.
