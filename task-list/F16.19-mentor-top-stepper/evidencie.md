# Evidencia F16.19 — Mentor top stepper

## Estado

Delta accesible implementado y verificado localmente; PR y revisión integradora pendientes. No se hace release.

## Brecha y cambio

- En `origin/main` (`89fad1c`) ya existían el stepper superior de seis etapas, estados derivados del borrador/contexto/evaluación, etapa única visible, progreso por campos válidos, navegación compacta y acciones de guardado. No se reimplementó esa base ni se recuperó un submenú.
- Brecha concreta: los seis controles cambiaban el contenido del formulario, pero no expresaban la relación de control en el árbol accesible. Añadí `aria-controls="mentor-proposal-form"` a cada botón de etapa.
- Test de regresión: una navegación con seis botones, cada botón controla el mismo formulario único, y el stepper aparece antes de ese formulario.

## Verificación

- TDD: el nuevo test falló antes del atributo y pasó después.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` — PASS, 44/44.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS. Advertencias existentes: chunk principal superior a 500 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.
- QA visual/authenticated Ego Lite, tab-order real, zoom 200 %, lector de pantalla, contraste formal y aprobación visual propietaria: **NO COMPROBADOS**. No se usaron assets candidatos ni se declara aprobación de Pixel Night.
- Commit y PR: pendientes de registrar.

## Registro de integración · 2026-11-24

- Commit de implementación: `227b882285e0764f18d45a7fda296a7d19ec728b`.
- PR, CI, integración a `main` y release: pendientes. Esta rama no se despliega.
