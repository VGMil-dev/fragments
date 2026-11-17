# Evidencia — INC-AI-GATEWAY-429

## Estado

Implementación y pruebas en rama aislada `codex/mentor-ai-incident`. No se desplegó ni publicó. No se llamó al modelo.

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
- `apps/api/src/adapters/ai/gateway-dispatch-policy.ts` y `.test.ts`: máximo de tres intentos, backoff exponencial con jitter, `Retry-After`, un lease/cooldown SQLite compartido y sin reintento tras una respuesta/posible despacho del proveedor.
- `apps/api/src/adapters/ai/budget-ledger.ts`, pruebas y migración 11: clave idempotente hasheada, sin duplicar operación terminada aunque el costo sea cero, libera solo si no hubo despacho o Vercel confirma rechazo sin cargo. Lease vencido se marca incierto.
- `apps/api/src/adapters/ai/gateway-mentor-evaluator.ts`, `apps/api/src/features/mentor/{service,http}.ts` y pruebas: preserva los estados/IDs de diagnóstico permitidos; HTTP 429 lleva `Retry-After`, Gateway 402 es distinto de provider 402, no afirma que un holdback signifique presupuesto agotado.
- `apps/web/src/features/mentor/mentor-screen.tsx` y prueba: presenta rate limit y proveedor no disponible sin iniciar recuperación automática.
- Migración compatible e idempotente; no cambia contratos compartidos. Los archivos se compilaron desde la rama basada en `origin/main` `86313395ca2cc0470c5e84c9c4df9848b4a108d2`.

Salidas frescas:

- `pnpm --filter @fragments/api test` — PASS, 31 archivos, 135 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api build` — PASS.
- `pnpm --filter @fragments/web test` — PASS, 22 archivos, 96 pruebas.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; el bundler informó avisos `MODULE_LEVEL_DIRECTIVE` de `lucide-react` (`use client`), sin fallo.
- `git diff --check` — PASS.
- Hash de implementación y documentación inicial: pendiente del commit.

## Límites y riesgo restante

- La producción continúa bloqueada por la reserva incierta hasta correlacionar con ID compartido o revisión manual autorizada.
- La recuperación de software está preparada en la rama, pero requiere revisión, integración y despliegue autorizado para afectar producción.
- No se ha validado gasto con un nuevo llamado facturable y no debe inferirse un resultado de producción posterior.
