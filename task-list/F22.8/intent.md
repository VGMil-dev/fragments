# F22.8 — Estados de acceso admin en directorio y diagnósticos

## Problema

`/admin/teachers` y `/admin/diagnostics` reducen 401 y 403 al mismo mensaje, aunque las APIs ya preservan `AUTH_REQUIRED` y `FORBIDDEN`. El QA de F22 encontró sesiones no admin rechazadas; la interfaz no explicaba la diferencia.

## Objetivo

Mostrar mensajes estáticos y seguros que distingan sesión ausente de rol admin insuficiente en ambas superficies, con reintento funcional y mensaje genérico para otros errores.

## No objetivos

- Modificar permisos, rutas, APIs, contratos, migraciones, infraestructura o roles.
- Exponer el mensaje recibido del servidor o datos de sesión.
- Contactar o escribir en producción.

## Owner y criterio

- Owner: worker F22.8 (UI de directorio docente y diagnósticos admin).
- TDD focal en ambas pantallas: 401, 403, error genérico, reintento y redacción segura.
