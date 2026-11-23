# Evidencia F17.7 — Mis aulas Pixel Night

## Implementado

- `apps/web/src/features/student/StudentClassroomsScreen.tsx`: importación de hoja de estilos feature-scoped y clase Pixel Night en el elemento principal; acciones y contenido preservados.
- `apps/web/src/features/student/StudentClassroomsScreen.css`: jerarquía de página/aulas/misiones, superficies Night/Cobalt/Lime, layout adaptable, foco visible, texto envolvente y reduced-motion.
- `apps/web/src/features/student/StudentClassroomsScreen.test.tsx`: regresión focal confirma que el elemento principal usa el scope Pixel Night.
- Commit de implementación: `7576c1deb0eea35e413fb13eedb93923a71301f5`.
- Revisión reflexiva independiente: PASS; no encontró defecto accionable en el diff. Sin test propio ni browser.

## Verificación de código

- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/web exec vitest run src/features/student/StudentClassroomsScreen.test.tsx --reporter=dot` — **6/6 PASS**.
- `pnpm exec turbo typecheck --filter=@fragments/web` — PASS (contracts build y web typecheck).
- `pnpm exec turbo build --filter=@fragments/web` — PASS; avisos de chunk >500 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.

## QA Ego Lite — producción v0.5.39

- 2026-11-23, perfil estudiante autenticado, `/student/classrooms`, versión UI `v0.5.39`.
- Viewports emulados 320/390/768/1024/1440: sin overflow horizontal. Se observaron dos aulas activas, contenido real de misión/habilidad y formulario disponible.
- Teclado: 14 pulsaciones Tab desde carga alcanzaron «Solicitar ingreso» con `:focus-visible` y outline lima sólido de 3 px.
- `prefers-reduced-motion: reduce` quedó activo durante la comprobación.
- No se envió código ni se escribieron datos.
- Capturas PNG originales locales: `pixel-night-classrooms-1440.png`, SHA-256 `0FC2C87518B16F919EF070014B7FBF3FCEDEF9E740F0DE28F635A66502667C0C`; `pixel-night-classrooms-390.png`, SHA-256 `5714E0E8EDA60E6426B8910463648CC5BCCB123E6BB3FB93D4B3D60FC2760BB1`. Se mantienen fuera del repositorio porque muestran contenido de sesión.

## Límites

- PR, CI, release F14 posterior y revisión visual del propietario: pendientes en este commit.
- Ficha UX-02 confirma que no hay maqueta verificada ni assets vinculados. La propuesta permanece **CANDIDATA**.
- Zoom real al 200 %, lector de pantalla, contraste formal y flujos de envío/decisión de solicitud: **NO COMPROBADOS**.
