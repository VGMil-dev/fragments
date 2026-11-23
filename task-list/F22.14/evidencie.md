# Evidencia F22.14

## Implementación

- Añadidos filtros locales de etapa y resultado a las vistas administrativas de eventos Mentor y Review. No cambian API, DTO, contratos, almacenamiento, retención ni permisos; no generan consultas adicionales.
- La vista continúa mostrando únicamente la muestra que entrega el endpoint existente (hasta 50 filas). Acceso admin real y eventos visibles en una sesión autorizada quedan NO COMPROBADOS.

## Verificación

- En rama `codex/f22-admin-event-filters`, actualizada con merge normal de main `ab1a37f`: `pnpm --filter @fragments/web exec vitest run src/features/admin-review-events/AdminReviewEventsScreen.test.tsx src/features/admin-mentor-events/AdminMentorEventsScreen.test.tsx` — 2 archivos, **6/6 PASS**.
- `pnpm --filter @fragments/web typecheck` — PASS; `git diff --check` — PASS.
- PR #179 integrada normalmente en main como `3f127241afa16a88f83e36fb1a9e6d4cd7371f0b`; CI `45162396343` SUCCESS; revisión reflexiva PASS tras corregir la precisión del alcance en la documentación.
- F14 tag anotada `v0.5.38`, run `45162826521` SUCCESS. Apply automático observado en solo lectura: `fragments-release-apply.service` terminó `Result=success`, `ExecMainStatus=0`; API y bundle público confirman tag/SHA exactos, `/health` 200 `ok/ready`.
- Ego Lite en pestaña existente con sesión docente: `/admin/review-events` mostró 403 seguro, sin tabla/controles ni datos. Esto confirma el rechazo del rol; vista admin autenticada y filtros visibles en producción quedan **NO COMPROBADOS** por falta de sesión admin. No se cerraron páginas o sesiones.
- Eventos persistidos reales Mentor/Review en la ventana consultada: ninguno (`events: []`). Su historial visible continúa **NO COMPROBADO**.
- Implementación `e521434`; merge principal `3f12724`; tag `v0.5.38`. La implementación está desplegada; la aceptación visual de los filtros requiere acceso admin autorizado.
