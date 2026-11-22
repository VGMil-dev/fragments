# Evidencia F22.8 — Estados de acceso en dos superficies admin

## Implementación

- PR #118 F22.7 confirmado integrado en `origin/main` como `9da508544ea5f764a87cc60ca38c7689dba1ac14`.
- Rama nueva `codex/f22-admin-access-errors` desde ese `origin/main`; rama previa conservada intacta.
- Directorio `/admin/teachers` y diagnósticos `/admin/diagnostics` diferencian `AUTH_REQUIRED`, `FORBIDDEN` y errores restantes con texto estático. Preservan su retry y no imprimen detalle del servidor.
- No se cambiaron permisos, APIs, contratos, rutas, migraciones ni infraestructura. Sin contacto con producción ni datos de sesión.

## Verificación

- TDD rojo: pruebas nuevas fallaron en ambas pantallas porque se mostraba el error genérico para 401.
- Verde, typecheck, commit y CI: pendiente.

## Limitaciones

- La UI aclara el rechazo; no modifica ni concede permisos.
