# F12 — Evidencia de integración

Estado: INCOMPLETA. Rama local `codex/v0.3.0-integration`. No crear tag, publicar ni desplegar.

## Git
- Rama Trainer confirmada: `05ba030` (incluye `4133219` y `3cda9a4`).
- Rama Mentor confirmada: `81b185d` (incluye F11 `15491a9`).
- Base común: `8ae8b5537c1f136d422ba122566d668c741687e5`.
- Se creó worktree separado desde Trainer y se fusionó `codex/mentor-control` con merge normal. Conflictos únicamente en `migrate.ts`, `open.test.ts` y `TASKS.md`.
- `.env` no existe en este worktree. No se leyó ni imprimió ninguna clave.

## Integración SQLite
- Numeración canónica: v1–v6 base/Trainer, v7 `bank_ready`, v8 lease de generación Trainer, v9 configuración/versiones Mentor y metadatos de evaluación.
- No se saltan errores ni se marca migración sin ejecutarla. Cada SQL y registro de versión se ejecuta dentro de transacción.
- La prueba de migración conserva IDs, JSON y fecha de evaluaciones históricas y deja campos de rúbrica nuevos nulos para resultados antiguos. Prueba limpia abre dos conexiones y verifica nueve migraciones, tablas/columnas Trainer y versión Mentor sembrada; reapertura es idempotente.
- `apps/api/src/db/migrate.test.ts` y `open.test.ts`: 2/2 aprobadas como parte de API 90/90.

## Verificación fresca (2026-11-09)
- `$env:CI='true'; pnpm exec turbo test --force` — exit 0; contracts 19/19, API 90/90, web 52/52 (161 total).
- `$env:CI='true'; pnpm exec turbo typecheck --force` — exit 0, 4 tareas.
- `$env:CI='true'; pnpm exec turbo build --force` — exit 0, 3 paquetes.
- `$env:CI='true'; pnpm exec turbo lint --force` — exit 0; lint está configurado solo para contracts.
- `git diff --cached --check` — exit 0 antes del commit.

## Browser / auth / IA
- Se levantaron fixture local Mentor con `fake-provider:mentor-control-ego-fixture` y fixture Trainer con `fake-provider:ego-fixture`; no se llamó a servicios externos.
- Ego Lite 2.2.0 abrió la UI integrada y permitió inspeccionar el panel Mentor. Captura falló: la ventana nativa estaba minimizada. Se comprobó el bloqueo desde la interfaz de Windows; no se restauró. Las capturas escritorio/móvil y Trainer en esta rama quedan pendientes; no se afirman aprobadas.
- Better Auth real y AI Gateway real no se probaron. El worktree carece de `.env`; coste real de esta integración: USD 0. No se expuso ni cambió configuración.
- Inspector, aislamiento de retos, fórmula y recorridos API se cubren con suites y controles existentes; no hubo smoke de interfaz integrado completo.

## Evidencia privada
- Carpeta única: `task-list/F12/evidence/`, ignorada por Git; máximo 20 archivos.
- `git check-ignore -v task-list/F12/evidence/ego-integration.mjs` — confirma `.gitignore:21:/task-list/F12/evidence/`; no añadir su contenido al índice.
- La limitación de Ego Lite impide cerrar F12 como completada. Falta capturar con Ego escritorio/móvil una vez disponible la ventana, ejecutar recorrido integrado y validar credenciales/modelo en configuración local sin mostrar secretos.
