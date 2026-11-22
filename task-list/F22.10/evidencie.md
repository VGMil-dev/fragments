# Evidencia F22.10 — Proyección segura de eventos Review

## Implementación local

- Rama `codex/f22-safe-event-envelope`, basada en `main` merge `57276286df5c5530a03370c825d33898a63d77f8`.
- `writeReviewOperationalEvent` construye una proyección de allowlist antes de serializar. Omite eventos con discriminadores no permitidos, elimina propiedades runtime extra, valida UUIDs, acota etapa/estado, limita duración, intentos y retry-after, y conserva únicamente códigos Gateway/provider incluidos en allowlists exactas.
- El writer se puede inyectar en pruebas; se contienen fallos síncronos y promesas rechazadas. El writer de stdout espera el callback y escucha errores del stream sin dejar que afecten el resultado del worker.
- Se añadieron cinco pruebas con writer fake: allowlist, campos malformados, código opaco con caracteres seguros, fallo síncrono y fallo asíncrono.

## Verificación local

- Red inicial: la prueba reprocesó los tres defectos previos: propiedad extra emitida, valores de identificador/código con PII/nueva línea sin retirar y error del sink propagado.
- Verde final: `pnpm --filter @fragments/api exec vitest run src/features/review/review-errors.test.ts --maxWorkers=1` — 5/5 PASS.
- `pnpm --filter @fragments/api test` — 140 PASS, 68 omitidas (suite DB, sin `DATABASE_URL`).
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api build` — PASS.
- `git diff --check` — PASS.

## Límites

- Eventos generados por pruebas sintéticas; no se leyó ni cambió el log de producción.
- Sesión admin, eventos Review productivos y persistencia/rotación real de stdout siguen NO COMPROBADOS.
- No se realizaron llamadas IA, lecturas/escrituras de base productiva ni cambios de infraestructura.
- Skills de arquitectura backend/TDD/verificación no disponibles localmente; el cambio siguió prueba Red/Green y verificación fresca. Revisión independiente PASS: confirmó que las allowlists finitas rechazan el código con forma de secreto y que los errores sync/async del sink quedan contenidos.
- Commit/PR/CI y release F14 pendientes.
