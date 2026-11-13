# F15.1 — Vinculación explícita de GitHub para docentes

## Problema

`disableImplicitLinking` protege las cuentas docentes frente a asociaciones automáticas por correo, pero Better Auth rechaza el login GitHub de un docente cuya cuenta local aún no tiene ese proveedor asociado. Hace falta un proceso intencional que demuestre control de la sesión docente y contraseña antes de vincular las identidades.

## Objetivo

Permitir que una persona docente autenticada vincule GitHub con su cuenta existente mediante consentimiento explícito, reautenticación de contraseña comprobada en el servidor y el flujo de enlace oficial de Better Auth. El siguiente login GitHub debe continuar en el mismo usuario y conservar sus permisos.

## No objetivos

- Activar vinculación implícita por correo.
- Modificar identidades, roles, credenciales, SQLite o servicios productivos.
- Probar un consentimiento OAuth real ni realizar un despliegue.
- Crear/publicar la tag `v0.4.2`.

## Owner

PLANNER — rama `codex/f15-teacher-github-link`, derivada de `origin/main` `d71e7100a7830b40a8189910725c195406bc44d2`.

## Criterio aplicado

- Better Auth 1.7.17: `linkSocial` se ejecuta en servidor con sesión docente, tras verificación fresca de contraseña; la sesión y el proveedor quedan enlazados mediante el estado OAuth de Better Auth.
- `disableImplicitLinking` se mantiene, se bloquea el endpoint público genérico y se respeta el rechazo de conflictos de identidad de Better Auth.
- `ego-browser`: interfaz probada con fixture sintético en Ego Lite, escritorio y 390 px; no se usa navegador alternativo.
- Verificación antes de cierre: suites, typechecks, builds, lint disponible, `git diff --check` y SHA/CI pendientes de evidencia.
