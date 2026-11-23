# Evidencia F17.11

## Estado
Integrada y desplegada mediante F14 `v0.5.46`. Commit de código `ff19cda` (`feat(F17): inicia misiones desde dashboard`), PR #200 merge `f5c4e0d6750e327599b80a06d19ac4e42d67e219`.

## Código
- `apps/web/src/App.tsx`: carga las misiones por aula activa y entrega el snapshot publicado al Dashboard.
- `apps/web/src/features/student/StudentDashboard.tsx`: muestra CTA real para abrir la misión en Mentor cuando no existe un borrador prioritario.
- Pruebas: `apps/web/src/features/student/StudentDashboard.test.tsx` y `apps/web/src/App.student-flow.test.tsx`.

## Verificación local
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx src/App.student-flow.test.tsx`: 2 archivos, 15 pruebas PASS (incluye inicio de misión real al nivel del flujo y error/reintento de aulas).
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS; mantiene los avisos del bundle >500 kB y directivas `use client` de Lucide.
- `git diff --check`: PASS.

## Integración y release
- PR [#200](https://github.com/VGMil-dev/fragments/pull/200) merge normal; CI `45233169921` PASS.
- Tag anotada `v0.5.46` sobre `main` SHA `f5c4e0d6750e327599b80a06d19ac4e42d67e219`; F14 run `45233695756` SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`.
- Aplicación automática comprobada: `/health` HTTP 200 (`ok`, `database=ready`); bundle `/assets/index-Dt-RQvqU.js` contiene versión y SHA exactos. Sin deploy/reinicio manual ni cambio de controles.

## Ego Lite — producción v0.5.46
- Sesión existente Fragments-Estudiante, solo lectura y conservada. Dashboard muestra el borrador propio prioritario, dos aulas y la entrega más reciente; no se modificaron datos.
- Viewports 320/390/768/1024/1440 CSS px: `scrollWidth <= innerWidth`, contenido dentro del viewport. Métricas del viewport se restauraron a su tamaño original.
- Captura auténtica local: `C:\Users\vgmil\ego\fragments-f17-11-dashboard-v0546.png`; no se adjuntó a Git/Notion por identidad y datos de sesión.
- CTA nueva de misión en producción **NO COMPROBADA** porque la propuesta guardada tiene prioridad y oculta ese estado. Contexto y habilidades se comprueban en el flujo integrado de pruebas (15/15), no en producción.

## Límites
Revisión reflexiva independiente: defecto de error de consulta de aulas corregido; re-review **PASS**, regresión confirma estado de error y recuperación tras reintento. Zoom 200 %, contraste formal, lector de pantalla y CTA sin borrador en producción **NO COMPROBADOS**. Sin escrituras productivas.

## Observación adicional Ego Lite · v0.5.52 · 2026-11-23

- En `/student/dashboard` se vio el borrador propio prioritario junto a una misión publicada y su objetivo/habilidad requeridos. Esta observación actualiza el antiguo estado donde el borrador ocultaba toda misión; no se infiere contenido más allá de lo visible.
- El enlace «Iniciar en Mentor» no se pulsó para evitar crear/cambiar estado académico; su navegación con misión seleccionada sigue **NO COMPROBADA**. Viewports 320/390/768/1024/1440 sin overflow. Captura auténtica local: `C:\Users\vgmil\ego\fragments-continuation-20261123\dashboard-desktop.png`, no se añadió al repositorio.
