# F17.2 — Mentor · Contexto (UX-06)

**Estado:** Implementación y QA PASS; PR, merge y despliegue F14 pendientes.

## Implementación

- Mentor consulta `GET /api/mentor/context` únicamente al entrar en su ruta; la petición usa `AbortController` y distingue contexto académico, modo personal, carga y error recuperable.
- La vista académica presenta información publicada en solo lectura. La orientación usa únicamente `expectedLevel`; no se inventan objetivos docentes.
- El modo personal se muestra de forma excluyente cuando el servicio reporta `CONFIG_UNAVAILABLE`.
- Se preservaron la navegación y el guardado existente; se ajustó la composición y el comportamiento responsive de UX-06.
- No se modificaron API, contratos, permisos, F21, PostgreSQL, Prisma ni infraestructura.

## Revisión visual independiente

El Agente B emitió **PASS** tras comparar Ego Lite 1672 × 941 con la referencia aprobada. Se corrigieron las diferencias iterativamente. La altura final del panel supera la ilustración por datos autorizados adicionales y fue aceptada por el revisor; no hay recortes ni solapamientos. El detalle está en `COMPARACION_REVISION_VISUAL.md`.

Referencia verificada: SHA-256 `8db5e9cdc02abb67952b83dc537cc130e155c09ef7dec02c4b405861efb972d8`.

## Pruebas

Pruebas, typecheck, lint, build, interacción de teclado, guardado y persistencia sintéticos, estados académico/personal y anchos 320/390/768/1024/1440: PASS. Detalle en `PRUEBAS_QA.md`.

## Integración y producción

- Rama: `codex/f17-ux06-context`, basada en `origin/main` actualizado.
- Commit de implementación: `cc60def010e01fd2f4dd7abb1e2dbe1b2b48a87b`.
- PR y CI: pendientes.
- SHA de merge / tag: pendientes.
- F14 y verificación Ego Lite en producción: pendientes. El éxito de producción no se declara hasta completar estas comprobaciones.

## Pendientes de cierre

Actualizar este informe, `task-list/F17.2/evidencie.md`, `task-list/TASKS.md` y la página UX-06 con PR, SHA, release, comprobación productiva y enlaces reales al finalizar F14.
