# F22.17 — Promoción acotada de cuenta docente existente

## Problema

La consola `/admin` usa el rol `admin` de Better Auth. Existe bootstrap de cuentas docentes, pero no un mecanismo seguro para elevar una cuenta docente ya existente cuando no hay una sesión admin disponible.

## Objetivo

Añadir un comando operacional de una sola cuenta que confirme dos veces el mismo correo, exija una cuenta docente existente y promueva únicamente su campo `role` mediante el almacenamiento Prisma de Better Auth. Tras verificar la promoción, solicitar una recuperación de contraseña y confirmar aceptación HTTP del proveedor Resend.

## No objetivos

- Crear cuentas nuevas, cambiar `isTeacher`, contraseña, sesiones o permisos de terceros.
- Añadir una ruta web/API de administración o modificar contratos.
- Leer secretos, conectarse a producción desde CI o omitir F14.

## Owner y criterio

PLANNER. TDD para la guarda exacta/idempotente, revisión de Better Auth/Resend, verificación fresca antes del commit. Skill visual/browser no aplica al comando; acceso posterior al dashboard se valida con Ego Lite.

## Resultado observado · 2026-11-24

PR #267 y corrección #268 están integrados; `v0.5.71` está aplicada por F14. El usuario autorizado existente fue promovido y verificado con `admin=true`, `isTeacher=true`; Resend aceptó el recovery. El owner debe completar el reset desde el correo; el login autenticado y las rutas `/admin` y `/teacher/dashboard` siguen pendientes. Véase `evidencie.md`.
