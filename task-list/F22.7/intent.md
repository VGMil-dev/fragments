# F22.7 — Diagnóstico de acceso al feed admin

## Problema

El cliente del feed conoce si la API respondió 401 (`AUTH_REQUIRED`) o 403 (`FORBIDDEN`), pero la pantalla colapsa ambos casos en un error genérico. Durante la observación F22, las solicitudes anónimas devolvieron 401 y las sesiones de estudiante/docente 403; la muestra no registró eventos allowlisted durante la ventana observada.

## Objetivo

Explicar en la vista del feed la diferencia entre falta de sesión y falta del rol admin, sin exponer mensajes internos y sin cambiar la autorización del backend.

## No objetivos

- Cambiar endpoints, DTO, contratos, navegación compartida, permisos o datos de sesión.
- Crear o alterar sesiones, roles, cuentas o configuración productiva.
- Generar eventos de prueba en producción o prometer que existen eventos.

## Owner y criterio

- Owner: worker F22.7 (pantalla local del feed admin).
- TDD UI focal: comprobar guía segura para 401 y 403, sin mostrar texto de error del servidor.
- Mantener retry y el mensaje general para fallos no clasificados.
