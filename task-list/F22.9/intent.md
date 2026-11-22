# F22.9 — Estados de acceso en solicitudes y cola admin

## Problema

`/admin/requests` y `/admin/queue` muestran el mismo error genérico cuando la API responde 401 o 403, aunque las APIs ya clasifican ambos casos.

## Objetivo

En ambas superficies, distinguir sesión ausente de permisos admin insuficientes con mensajes estáticos, conservar el mensaje genérico para otros errores y mantener reintento y estado de paginación/filtro.

## No objetivos

- Cambiar autorización, API, contratos, rutas compartidas, migraciones o infraestructura.
- Exponer mensajes del servidor o datos de sesión.
- Acceder o escribir en producción.

## Owner y criterio

- Owner: worker F22.9 (UI admin de solicitudes y cola).
- TDD focal para 401, 403 y otros errores en ambas vistas; confirmar retry y estado de filtro/página.
- No se requiere cambio de interfaz compartida: ambas APIs ya exponen un código de error en su resultado discriminado.
