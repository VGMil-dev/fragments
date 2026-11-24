# Evidencia F16.14 — Mentor Pixel Night

## Estado

Implementación y verificación local completadas; commit y PR pendientes. No se hizo QA visual ni se abrió Ego Lite según la instrucción de esta tarea.

## Alcance aplicado

- Ownership: `apps/web/src/features/mentor/mentor-screen.tsx`, `mentor-screen.css`, `mentor-screen.test.tsx` y esta evidencia.
- Skill leída: `vercel-react-best-practices` (`C:\Users\vgmil\.agents\skills\vercel-react-best-practices\SKILL.md`). Aplicación selectiva: derivar el progreso en render desde los campos actuales; sin efectos, nuevas dependencias ni cambios de datos.
- «Borrador completado: X %» y su barra accessible se muestran también en Evaluación, sin cambiar el cálculo de campos válidos.
- Stepper conserva seis etapas, botones y estados reales. En el breakpoint compacto mantiene el listado visible con estados; 3 columnas hasta 520 CSS px y 2 columnas por debajo. Acentos alineados con cobalt/lime y tokens semánticos F16.
- Sin cambios a shell, navegación global, APIs, contratos, permisos, persistencia, rúbricas ni otros módulos.

## Verificación fresca

- Rojo TDD: `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` — falló en la expectativa nueva porque el progreso no se mostraba durante Evaluación; falló además la expectativa de regla compacta del stepper.
- Verde: `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` — `Test Files 1 passed (1)`, `Tests 39 passed (39)`.
- `pnpm --filter @fragments/web typecheck` — `tsc -p tsconfig.json`, terminado correctamente.
- `pnpm --filter @fragments/web build` — Vite terminó correctamente (`✓ built in 569ms`). Advertencias: chunk principal >500 kB y directivas `use client` de `lucide-react`.
- `git diff --check` — terminó correctamente.
- QA visual/Ego Lite, zoom 200 % y lector de pantalla: pendientes, no solicitados en este incremento.

## Integración

- Rama: `codex/f16.14-mentor-pixel-night`; base asignada `3f6d742`.
- Commit: pendiente.
- PR a `main`: pendiente.
- `task-list/TASKS.md` no se editó; permanece bajo ownership del planner.
