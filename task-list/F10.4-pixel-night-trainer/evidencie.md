# Evidencia — F10.4 Trainer Pixel Night

Estado: commit `87dfb87ae90a7c874e1b81bc0a4357f7c4dce787` en `codex/pixel-night-trainer`; pendiente PR e integración. **Candidata visual, no aprobada ni validada en Ego Lite**.

## Archivos

- `apps/web/src/features/trainer/TrainerScreen.tsx`
- `apps/web/src/features/trainer/trainer-screen.css`
- `apps/web/src/features/trainer/TrainerScreen.test.tsx`

## Cambios

- Jerarquía de laboratorio por etapas: fuente real de práctica, sesión de práctica y traza personal.
- Estado vacío con ilustración funcional Lucide y CTA existente hacia Review.
- Reto mostrado solo tras el sorteo real; objetivo derivado de la revisión seleccionada.
- Autoevaluación anunciada claramente como en preparación.
- Superficies Pixel Night, reflow móvil, foco visible y `prefers-reduced-motion`.
- Historial con estados distintos de carga, error recuperable y vacío solo tras respuesta exitosa; retry con API actual y texto de persistencia limitado a revisión/sesión.

## Verificación fresca

- `pnpm exec vitest run src/features/trainer/TrainerScreen.test.tsx`: **6/6 PASS**; incluye carga, error de API y rechazo de red, reintentos y vacío tras éxito.
- `pnpm exec turbo test --filter=@fragments/web`: **49 archivos, 220 tests PASS**.
- `pnpm exec turbo typecheck --filter=@fragments/web`: **2 tareas (contracts build + web typecheck) PASS**.
- `pnpm exec turbo build --filter=@fragments/web`: **2 tareas (contracts build + web build) PASS**; advertencia de bundle >500 kB y directivas `use client` de Lucide.
- `git diff --check`: **PASS**.
- Una invocación inicial de `pnpm --filter @fragments/web test -- TrainerScreen.test.tsx` pasó por la suite completa y detectó el paquete compartido sin compilar; no se considera prueba de fallo funcional. Pipeline correcto ejecutado luego con Turbo.

## Límites

- Sin Ego Lite visual ni E2E: QA independiente pendiente.
- Sin pruebas de viewport, teclado, zoom o contraste en navegador.
- No hubo acceso a producción ni llamadas a proveedores externos.
- Revisión reflexiva confirmó corregidos los estados de carga/error/vacío del historial; no ejecutó tests.
