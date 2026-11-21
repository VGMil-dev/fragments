# F17.2 — Mentor · Contexto (UX-06)

**Estado:** PASS; integrado y desplegado en producción mediante F14.

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
- PR #72 y CI run `44925110965`: success.
- SHA de merge: `00b548cc715c7b04e862e985a63f5bb265e0a54e`.
- Release F14 `v0.5.6`, run `44925403964`: success; release ID `453828612`, tag anotada sobre el SHA de merge.
- Producción comprobada: API/web `healthy`, versión `v0.5.6`, `/health` HTTP 200 y bundle público verificado con Ego Lite. Datos de usuario productivos no fueron modificados.

## Registro documental

La página UX-06 se actualizará con los enlaces del PR, referencia y paquete final.
