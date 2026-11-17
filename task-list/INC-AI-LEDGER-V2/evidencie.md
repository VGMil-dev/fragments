# INC-AI-LEDGER-V2 — Evidencia

## Estado
Implementación confirmada en `codex/ledger-v2`, basada en `origin/main` (`35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`). Commit de implementación: `c9d06d37129d52157bca6da99324917032c27dc9`; commits de evidencia: `9c40ff4ef535dbe1bac6f5ae26f7df7a81120ba0`, `e7df7245ac2089073074e6a739a80e6cb6e0ae46` y el presente. PR #46 abierto: https://github.com/VGMil-dev/fragments/pull/46. Los PR #43 y #45 se cerraron después de agregar a cada uno un comentario que los enlaza al #46.

## Trabajo y límites
- Se aisló la identidad financiera por operación; las migraciones SQLite v12/v13 guardan claves nuevas del ledger y de Inspector sin reasignar reservas ni retos antiguos.
- Se incorporó clasificación acotada de errores desde PR #43; no se copiaron su coordinador global, algoritmo de cooldown ni expansión de cola.
- Goldfish independiente (GPT-6 Luna, Medium solicitado explícitamente): confirmó que el chequeo de límite incluye costos liquidados y reservas activas/inciertas dentro de `BEGIN IMMEDIATE`; confirmó que Inspector persiste el reto antes del asiento para recuperarlo si falla el asiento posterior. Riesgo residual: una caída del proceso después de recibir la respuesta de Gateway y antes de la primera escritura SQLite puede dejar una operación incierta sin resultado recuperable. Se bloquea solo esa clave y no se duplica el despacho; borrar por completo ese intervalo exige un mecanismo duradero de almacenamiento de receipt en el momento de recepción.
- Precio de catálogo consultado el 2026-11-17: Vercel muestra Alibaba Cloud para `alibaba/qwen3.7-flash`, USD 0.03/M entrada y USD 0.13/M salida ([catálogo Vercel](https://vercel.com/ai-gateway/models/qwen3.7-flash)); QwenCloud confirma tramos de entrada hasta 32K, 256K y 1M ([tarifas QwenCloud](https://docs.qwencloud.com/developer-guides/getting-started/model-prices)). No se cambió ni se leyó configuración productiva para verificar modelo/proveedor efectivos; no se aplican estas tarifas a ciegas.
- Techo de USD 0.05 para una prueba futura no equivale a garantía de cobro: la estimación de tokens y el costo final del Gateway pueden diferir. No se realizó ninguna llamada de IA pagada.
- La plantilla `.env.example` se comprobó sin secretos y se creó `.env` local desde ella; `.env` está ignorado por Git. No registrar ni copiar sus valores.

## Verificación
- Salida fresca del 2026-11-17: `pnpm exec turbo run test typecheck lint build --force` — 10/10 tareas exitosas; contratos 19/19, API 148/148, web 95/95; typecheck, lint y build completados. Solo advertencias de empaquetado preexistentes de `use client` en `lucide-react` y hash de Turbo en árbol modificado.
- Salida fresca: `git diff --check` — limpia.
- API focal Inspector/ledger — 28/28 pruebas exitosas; typecheck API exitoso.
- `git push -u origin codex/ledger-v2` — PASS; rama publicada sin force push.
- PR #46 creado contra `main`; PR #43 y #45 cerrados con referencia al reemplazo.
- CI del PR #46 (`verify`, head `e7df7245ac2089073074e6a739a80e6cb6e0ae46`) — SUCCESS. Una anotación de advertencia informa que las actions actuales usan Node.js 20 y serán forzadas a Node.js 24; no hubo fallas.
- Sin operaciones externas de producción ni invocaciones pagadas. El PR #46 permanece abierto y sin merge.

## Restricciones
Sin cambios de producción/SQLite productiva, sin release, sin gasto IA, sin liberación de la reserva de 870 microUSD y sin reproceso de las seis revisiones.

## Configuración de agentes
El entorno no expone selección/verificación del perfil del agente principal. Se informó esa limitación y no se afirma que el agente principal corriera con Luna Medium. Para el Goldfish solicitado, se eligió explícitamente `gpt-6-luna` y `medium`.
