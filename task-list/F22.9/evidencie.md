# Evidencia F22.9 — Estados de acceso en solicitudes y cola

## Implementación

- Rama nueva `codex/f22-requests-queue-access` desde `origin/main` `bb6e70532e26ac71aaf31543b20413040d7bc581`; rama F22.8 previa conservada sin reset.
- Solicitudes académicas y estado de cola muestran razones distintas para `AUTH_REQUIRED` y `FORBIDDEN`; otros errores conservan texto genérico. Todos los mensajes son fijos y no usan el detalle del servidor.
- Retry preservado. La prueba de solicitudes pasa por filtro `pending`, offset de página 20 y tres retries, verificando que el filtro/offset se conservan.
- No se cambió autorización, API/contracts/rutas compartidas/migraciones/producción. No se requiere interfaz compartida: los tipos API ya llevan `error.code`.

## Verificación

- TDD rojo inicial: las pruebas nuevas fallaron en ambas pantallas porque 401 mostraba el texto genérico.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-requests/AdminRequestsScreen.test.tsx src/features/admin-queue/AdminQueueSummaryScreen.test.tsx --maxWorkers=1` — PASS, 6/6 (22 nov 2026, 15:35:11 local).
- `pnpm --filter @fragments/web typecheck` — PASS (22 nov 2026, 15:35:11 local).
- `git diff --check` — PASS antes de commit.

## Commit

- Hash de implementación y evidencia: pendiente de commit.

## Limitaciones

- La UI informa del motivo de denegación; no cambia roles ni concede acceso.
