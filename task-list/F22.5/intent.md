# F22.5 — Directorio administrativo de cuentas docentes

## Problema

La consola F22 requiere una forma acotada de verificar qué cuentas Better Auth tienen habilitado el rol docente, sin inspección SQL ni exposición de estudiantes o credenciales.

## Objetivo

Proveer un servicio paginado, solo lectura, para listar cuentas docentes con identificador, nombre visible, correo y fecha de creación; acompañarlo con un panel web aislado de consulta y recuperación de errores.

## Límites

- Leer exclusivamente `user.isTeacher = true`; excluir explícitamente `role = admin`.
- Seleccionar solo `id`, `name`, `email`, `createdAt`; no consultar cuentas OAuth, tokens, sesiones ni datos estudiantiles.
- Paginación estable por `(createdAt, id)` descendente; límite predeterminado 20 y máximo 50; cursor opaco y validado.
- El handler local requiere admin y escribe un evento auditado antes de cualquier consulta del directorio; si auth, identidad o audit fallan, no consulta.
- GET solamente; sin crear, modificar, habilitar ni revocar cuentas.
- La ruta compartida, contrato, integración de auth/audit en `app.ts`, navegación y `TASKS.md` quedan para el arquitecto.
