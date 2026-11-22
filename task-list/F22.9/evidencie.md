# Evidencia F22.9 — Estados de acceso en solicitudes y cola

## Implementación

- Rama nueva `codex/f22-requests-queue-access` desde `origin/main` `bb6e70532e26ac71aaf31543b20413040d7bc581`; rama F22.8 previa conservada sin reset.
- Solicitudes académicas y estado de cola muestran razones distintas para `AUTH_REQUIRED` y `FORBIDDEN`; otros errores conservan texto genérico. Todos los mensajes son fijos y no usan el detalle del servidor.
- Retry preservado. La prueba de solicitudes pasa por filtro `pending`, offset de página 20 y tres retries, verificando que el filtro/offset se conservan.
- No se cambió autorización, API/contracts/rutas compartidas/migraciones/producción. No se requiere interfaz compartida: los tipos API ya llevan `error.code`.

## Verificación

- TDD rojo inicial: las pruebas nuevas fallaron en ambas pantallas porque 401 mostraba el texto genérico.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-requests/AdminRequestsScreen.test.tsx src/features/admin-queue/AdminQueueSummaryScreen.test.tsx --maxWorkers=1` — PASS, 6/6 repetidas después del commit (22 nov 2026, 15:35:38 local).
- `pnpm --filter @fragments/web typecheck` — PASS repetido después del commit (22 nov 2026, 15:35:38 local).
- `git diff --check` — PASS después del commit y al cerrar evidencia.
- Revisión independiente solicitó verificar explícitamente que los errores OTHER no muestran `private http detail`; ambas pruebas lo afirman ahora. Tras ese commit: focal 6/6, typecheck y diff-check PASS (22 nov 2026, 15:39:57 local).

## Commit

- Commit de implementación: `cce9908e6737cd64fdcf61ee784eea67cd18978b` (`feat(admin-console): aclara acceso a solicitudes y cola`).
- Aserciones OTHER: `064ee4fc2beee839865afb461819d0b1731594ba` (`test(admin-console): asegura redacción de otros errores`).
- Evidencia actualizada en commit documental posterior; sin reescritura de historia.

## Limitaciones

- La UI informa del motivo de denegación; no cambia roles ni concede acceso.

## PR #123 — integración normal

- PR #123 se integró normalmente en main como `8d984817e7e7fa3224a118ff081da89e329abc2b`; CI `45067784339` SUCCESS.
- Revisión independiente PASS del mensaje 401/403, redacción OTHER, retry, filtro y paginación. Las aserciones agregadas en `064ee4f` verifican que los errores OTHER no exhiban `private http detail`.
- En el momento de abrir PR #123, F14 v0.5.18 estaba pendiente. Su aplicación posterior se verificó el 2026-11-22; véase el cierre de verificación abajo. Sesión admin y lecturas/eventos productivos siguen NO COMPROBADOS; sin cambios de permisos ni escrituras.

## F14 v0.5.18 y Ego Lite — cierre de verificación

- PR #123 merge `8d984817e7e7fa3224a118ff081da89e329abc2b`, CI `45067784339` PASS; PR #124 merge `214fb1344816172ecc52c99de5e7351508d77324`, CI `45068097463` PASS.
- F14 tag anotada `v0.5.18` sobre SHA exacto `214fb1344816172ecc52c99de5e7351508d77324`, run `45068388150` SUCCESS. Aplicador normal success; web/API healthy en SHA exacto; `/health` ok y database ready; bundle público confirma versión.
- Ego Lite read-only: en `/admin/queue` y `/admin/requests` la cuenta docente recibe el mensaje fijo de falta de permisos (403), sin tabla ni filas. No hubo login admin ni escrituras; pestañas docente y admin se dejaron abiertas/restauradas.
- La prueba manual 401 con sesión sin autenticar y acceso admin autenticado siguen NO COMPROBADOS. Eventos, solicitudes reales y worker separado también NO COMPROBADOS. Sin cambios de roles ni API.
