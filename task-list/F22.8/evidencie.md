# Evidencia F22.8 — Estados de acceso en dos superficies admin

## Implementación

- PR #118 F22.7 confirmado integrado en `origin/main` como `9da508544ea5f764a87cc60ca38c7689dba1ac14`.
- PR #119 confirmado integrado en `origin/main` como `45d80c8b122da53039c2ef891ce03cf30e4b1759`; traído a la rama con merge normal, sin reescribir commits.
- Rama nueva `codex/f22-admin-access-errors`; la rama previa quedó conservada intacta.
- Directorio `/admin/teachers` y diagnósticos `/admin/diagnostics` diferencian `AUTH_REQUIRED`, `FORBIDDEN` y errores restantes con texto estático. Preservan su retry y no imprimen detalle del servidor.
- No se cambiaron permisos, APIs, contratos, rutas, migraciones ni infraestructura. Sin contacto con producción ni datos de sesión.

## Verificación

- TDD rojo: pruebas nuevas fallaron en ambas pantallas porque se mostraba el error genérico para 401.
- TDD verde, repetido después de sincronizar PR #119: `pnpm --filter @fragments/web exec vitest run src/features/admin-teachers/AdminTeachersPanel.test.tsx src/features/admin-diagnostics/AdminDiagnosticsScreen.test.tsx --maxWorkers=1` — PASS, 8/8 (22 nov 2026, 15:07:35 local).
- `pnpm --filter @fragments/web typecheck`, repetido después de sincronizar PR #119 — PASS (22 nov 2026, 15:07:35 local).
- `git diff --check` — PASS después de sincronizar main; `git merge-base --is-ancestor origin/main HEAD` confirma que la rama incluye el main actual.

## Commit

- Implementación: `a069102daf4b23c75730c3944226a08d46a3daf5` (`feat(admin-console): distingue estados de acceso`).
- Hash de implementación y evidencia se registran en commit documental posterior; no se reescribe historia.

## Limitaciones

- La UI aclara el rechazo; no modifica ni concede permisos.

## PR #120 — integración normal

- Revisión independiente: PASS; 401/403/otros seguros, mensajes fijos, retry conservado y sin filtración del detalle backend.
- PR #120 merge normal `15b8f987a9c60ee40c37461d3c4d1a7264ca97a1`; `verify` run `45064857683` PASS. F14 de la versión con cambios F18/F22 sigue pendiente.
- La sesión admin y la lectura de eventos reales siguen NO COMPROBADAS; no se amplió autorización.
