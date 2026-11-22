# Evidencia F22.8 — Estados de acceso en dos superficies admin

## Implementación

- PR #118 F22.7 confirmado integrado en `origin/main` como `9da508544ea5f764a87cc60ca38c7689dba1ac14`.
- Rama nueva `codex/f22-admin-access-errors` desde ese `origin/main`; rama previa conservada intacta.
- Directorio `/admin/teachers` y diagnósticos `/admin/diagnostics` diferencian `AUTH_REQUIRED`, `FORBIDDEN` y errores restantes con texto estático. Preservan su retry y no imprimen detalle del servidor.
- No se cambiaron permisos, APIs, contratos, rutas, migraciones ni infraestructura. Sin contacto con producción ni datos de sesión.

## Verificación

- TDD rojo: pruebas nuevas fallaron en ambas pantallas porque se mostraba el error genérico para 401.
- TDD verde, repetido después del commit de implementación: `pnpm --filter @fragments/web exec vitest run src/features/admin-teachers/AdminTeachersPanel.test.tsx src/features/admin-diagnostics/AdminDiagnosticsScreen.test.tsx --maxWorkers=1` — PASS, 8/8 (22 nov 2026, 15:06:11 local).
- `pnpm --filter @fragments/web typecheck`, repetido después del commit de implementación — PASS (22 nov 2026, 15:06:11 local).
- `git diff --check` — PASS después del commit de implementación y al cerrar evidencia.

## Commit

- Implementación: `a069102daf4b23c75730c3944226a08d46a3daf5` (`feat(admin-console): distingue estados de acceso`).
- Evidencia actualizada en commit documental posterior; no se reescribe historia.

## Limitaciones

- La UI aclara el rechazo; no modifica ni concede permisos.
