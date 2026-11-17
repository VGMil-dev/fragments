# INC-AI-LEDGER-V2 — Evidencia

## Estado
Implementación confirmada en `codex/ledger-v2`, basada en `origin/main` (`35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`). Commit de implementación: `c9d06d37129d52157bca6da99324917032c27dc9`; commits de evidencia: `9c40ff4ef535dbe1bac6f5ae26f7df7a81120ba0`, `e7df7245ac2089073074e6a739a80e6cb6e0ae46` y el presente. PR #46 abierto: https://github.com/VGMil-dev/fragments/pull/46. Los PR #43 y #45 se cerraron después de agregar a cada uno un comentario que los enlaza al #46.

## Trabajo y límites
- Se aisló la identidad financiera por operación; las migraciones SQLite v12/v13 guardan claves nuevas del ledger y de Inspector sin reasignar reservas ni retos antiguos.
- Se incorporó clasificación acotada de errores desde PR #43; no se copiaron su coordinador global, algoritmo de cooldown ni expansión de cola.
- Goldfish independiente (GPT-6 Luna, Medium solicitado explícitamente, antes del ajuste final): confirmó que el chequeo transaccional acumulado incluía costos liquidados y reservas activas/inciertas; en este ajuste se retiró ese techo local conforme a la delegación del presupuesto global a Vercel. También confirmó la persistencia previa al asiento de retos Inspector. Riesgo residual: una caída después de recibir la respuesta de Gateway y antes de la primera escritura SQLite puede dejar una operación incierta sin resultado recuperable; solo se bloquea esa misma clave para evitar doble despacho.
- Precio de catálogo consultado el 2026-11-17: Vercel muestra Alibaba Cloud para `alibaba/qwen3.7-flash`, USD 0.03/M entrada y USD 0.13/M salida ([catálogo Vercel](https://vercel.com/ai-gateway/models/qwen3.7-flash)); QwenCloud confirma tramos de entrada hasta 32K, 256K y 1M ([tarifas QwenCloud](https://docs.qwencloud.com/developer-guides/getting-started/model-prices)). No se cambió ni se leyó configuración productiva para verificar modelo/proveedor efectivos; no se aplican estas tarifas a ciegas.
- USD 0,05 es el máximo autorizado para una futura prueba sintética, no una garantía de facturación. Antes de ejecutarla: verificar el modelo/proveedor efectivo y tarifas vigentes; calcular el costo máximo estimado con límites de tokens y margen; usar una clave AI Gateway temporal y aislada con presupuesto acumulado de USD 0,05, sin BYOK; comprobar que el presupuesto aplica a esa clave; permitir una sola solicitud manual con `maxRetries: 0`, sin concurrencia ni workers; revisar el gasto resultante y revocar la clave. No ejecutar la prueba si no se puede verificar el alcance del presupuesto o el costo estimado dentro del monto autorizado. Vercel documenta sus budgets como soft cap: la solicitud que cruza el límite puede finalizar y producir un excedente; por tanto, este control reduce exposición pero no garantiza una factura máxima ([Vercel AI Gateway Budgets and Spend Limits](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets)). Esta prueba no se ejecutó.
- No se realizó ninguna llamada de IA pagada.
- La plantilla `.env.example` se comprobó sin secretos y se creó `.env` local desde ella; `.env` está ignorado por Git. No registrar ni copiar sus valores.

## Verificación
- Salida fresca del 2026-11-17: `pnpm exec turbo run test typecheck lint build --force` — 10/10 tareas exitosas; contratos 19/19, API 148/148, web 95/95; typecheck, lint y build completados. Solo advertencias de empaquetado preexistentes de `use client` en `lucide-react` y hash de Turbo en árbol modificado.
- Salida fresca: `git diff --check` — limpia.
- API focal Inspector/ledger — 28/28 pruebas exitosas; typecheck API exitoso.
- `git push -u origin codex/ledger-v2` — PASS; rama publicada sin force push.
- PR #46 creado contra `main`; PR #43 y #45 cerrados con referencia al reemplazo.
- CI del PR #46 (`verify`, head `e7df7245ac2089073074e6a739a80e6cb6e0ae46`) — SUCCESS. Una anotación de advertencia informa que las actions actuales usan Node.js 20 y serán forzadas a Node.js 24; no hubo fallas.
- Sin operaciones externas de producción ni invocaciones pagadas. El PR #46 permanece abierto y sin merge.

## Ajuste final solicitado
- Se retiró el techo acumulado local de USD 1. No se rechaza una operación independiente por costos históricos liquidados o inciertos.
- El ledger sigue contabilizando importes por estado (`settledMicroUsd`, `reservedMicroUsd`, `uncertainMicroUsd`), valida tasas/costo de cada operación, serializa reservas SQLite, y bloquea duplicados únicamente por la misma `operation_key` incierta, activa o liquidada.
- Se añadió una regresión que asienta más de USD 1, conserva una reserva incierta y permite reservar una operación distinta; el estado histórico no se libera ni se modifica.
- El límite de USD 0,05 solo rige como autorización operativa de una futura prueba sintética aislada según los pasos anteriores; no es un límite local de ejecución ni garantiza el costo final.
- Verificación fresca posterior al ajuste, 2026-11-17: 4 archivos focales, 29/29 pruebas; suite completa `pnpm exec turbo run test typecheck lint build --force`, 10/10 tareas, API 148/148, web 95/95, contratos 19/19 y typecheck/lint/build PASS.
- Commit del ajuste: `5b4364276e301ebf8656f3b72d99e29bc1a03c09`. CI `verify` para ese head — SUCCESS; única anotación: warning deprecación Node.js 20 en actions de GitHub, forzadas a Node.js 24. PR #46 actualizado; sin merge ni despliegue.

## Restricciones
Sin cambios de producción/SQLite productiva, sin release, sin gasto IA, sin liberación de la reserva de 870 microUSD y sin reproceso de las seis revisiones.

## Configuración de agentes
El entorno no expone selección/verificación del perfil del agente principal. Se informó esa limitación y no se afirma que el agente principal corriera con Luna Medium. Para el Goldfish solicitado, se eligió explícitamente `gpt-6-luna` y `medium`.

## Actualización — estado remoto 2026-11-17
- GitHub confirma PR #46 merged; commit de merge `2877be6cd2899a0642298070bd46eab12d6323d1`, también `HEAD` de `origin/main` al iniciar la preparación de v0.4.10.
- La release más reciente consultada es `v0.4.9`; `refs/tags/v0.4.10` devuelve 404. No se creó tag ni se ejecutó despliegue en esta actualización.
- La evidencia histórica anterior que indica PR abierto describe el estado antes del merge y queda reemplazada por este registro.
