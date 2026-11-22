# Evidencia F22.7 — Diagnóstico de acceso al feed

## Contexto observado comunicado por coordinador

- GET anónimo admin: 401.
- Sesiones Ego Lite de estudiante y docente: 403.
- Contenedores API/web saludables.
- Cero eventos allowlisted observados durante 20 minutos.
- Estos datos se usan como contexto provisto; no se repitieron consultas ni se escribieron datos en producción.

## Implementación

- Rama de trabajo existente: `codex/f22-activity-event-filter`; no se hizo reset.
- La pantalla retiene el código de error seguro y diferencia sesión ausente de cuenta sin rol admin. Errores restantes conservan mensaje genérico. No muestra texto del servidor.
- No se modificaron API, contratos, rutas compartidas, migraciones, infraestructura ni datos productivos.

## Verificación local

- TDD rojo inicial: prueba focal falló porque la pantalla devolvía mensaje genérico ante 401.
- TDD verde, repetido después del commit: `pnpm --filter @fragments/web exec vitest run src/features/admin-audit-log/AdminAuditLogScreen.test.tsx --maxWorkers=1` — PASS, 5/5 (22 nov 2026, 14:55:02 local).
- `pnpm --filter @fragments/web typecheck`, repetido después del commit — PASS (22 nov 2026, 14:55:02 local).
- `git diff --check` — PASS después del commit y al finalizar evidencia.

## Commit

- Implementación: `5376efc1a0f53bbc586dd639c62b8f9c6f8e6545` (`feat(admin-audit-log): distingue acceso denegado`).
- Hash y verificación se registran en un commit documental posterior; no se reescribe historia.

## Limitaciones

- La mejora explica la denegación, pero no concede rol admin ni resuelve la falta de eventos observados.
- La disponibilidad de una sesión admin autorizada y la emisión de eventos reales siguen sin verificarse en este cambio.

## PR #118 — integración normal

- Revisión independiente: PASS; solo códigos seguros se convierten a mensajes fijos, el retry permanece y ningún detalle backend se muestra.
- PR #118 merge normal `9da508544ea5f764a87cc60ca38c7689dba1ac14`; `verify` run `45063736494` PASS. F14 de la versión con cambios F18/F22 sigue pendiente.
