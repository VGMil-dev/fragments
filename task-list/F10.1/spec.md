# F10.1 — Especificación

## Banco

- Tomar como máximo un candidato por hallazgo/funcionalidad verificada diferente, con cita válida contra snapshot, SHA y digest del Review.
- Generar secuencialmente y persistir hasta cinco tareas no duplicadas. Reutilizar el banco en sorteos; ampliar una vez el banco anterior sin borrar retos ni intentos.
- Coordinar generación concurrente por `(review_id, commit_sha)` mediante reserva SQLite; solo el dueño vigente completa el banco.
- Si hay una sola tarea, decirlo en UI y permitir repaso; si no hay evidencia compatible, explicar el resultado sin inventar tareas.

## Validación

- Review live del repo público `VGMil-dev/fragments-test-app` sobre SHA completo; exigir el mismo SHA en respuesta y rehidratación Trainer.
- Verificar retos nuevos distintos, historial SQLite, sorteo de repaso, respuesta Trainer sin secretos privados Inspector y UI Ego Lite desktop/móvil.
- Proveedores fake para suite; máximo USD 0.05 adicionales en llamadas de desarrollo, reservados en ledger SQLite temporal.
- Mantener privacidad: `task-list/F10/evidence/` local/ignorada, máximo 20 archivos; sin `.env`, cookies, secretos o datos personales.
