# Evidencia F17.11

## Estado
Implementación en rama; integración y release F14 pendientes. Commit de código `ff19cda` (`feat(F17): inicia misiones desde dashboard`).

## Código
- `apps/web/src/App.tsx`: carga las misiones por aula activa y entrega el snapshot publicado al Dashboard.
- `apps/web/src/features/student/StudentDashboard.tsx`: muestra CTA real para abrir la misión en Mentor cuando no existe un borrador prioritario.
- Pruebas: `apps/web/src/features/student/StudentDashboard.test.tsx` y `apps/web/src/App.student-flow.test.tsx`.

## Verificación local
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx src/App.student-flow.test.tsx`: 2 archivos, 15 pruebas PASS (incluye inicio de misión real al nivel del flujo y error/reintento de aulas).
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS; mantiene los avisos del bundle >500 kB y directivas `use client` de Lucide.
- `git diff --check`: PASS.

## Pendiente
Revisión reflexiva independiente: hallazgo de error de consulta de aulas corregido; re-review **PASS**, regresión confirma que no se inventa un estado vacío y que se recupera el flujo tras reintentar. PR/CI y Ego Lite después de release legítima pendientes. No se hicieron escrituras en producción ni pruebas de navegador.
