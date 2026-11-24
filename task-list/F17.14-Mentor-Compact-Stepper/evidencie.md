# F17.14 — Evidencia

## Implementación
Mentor ahora presenta hasta 1100 CSS px la etapa activa (`N de 6` + nombre), seis segmentos decorativos que reflejan las marcas existentes de etapa y el selector de etapa. El stepper horizontal completo se mantiene en pantallas anchas. No se alteró guardado, contratos ni progreso académico.

- Commit de implementación: `9289714` (`fix(F17.14): compacta stepper movil de Mentor`).

## Pruebas
- TDD inicial: las dos nuevas aserciones fallaron antes del cambio al faltar el indicador compacto/segmentos y al conservarse la cuadrícula de seis etapas.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx`: 45/45 PASS.
- `pnpm --filter @fragments/web test`: 298/298 PASS.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS; conserva las advertencias existentes de chunk >500 kB y directivas `use client` de Lucide.
- `git diff --check`: PASS.
- Revisión reflexiva independiente: CLEAN; confirmó que desktop conserva el stepper y no se alteran flujos académicos.
- Revisión UX/UI independiente: CLEAN; confirma reflow 320–1100 y accesibilidad del selector. No usó navegador.

## Integración y producción
- PR [#258](https://github.com/VGMil-dev/fragments/pull/258) integrado por merge normal en `19c70b5cace015faaa62c1fb2bdd2e9aadd8bdd7`; CI `45377110207` SUCCESS.
- F14: release `v0.5.66` sigue sin aplicación confirmada; no se crea otra tag hasta resolver ese release.
- Ego Lite de producción: `NO COMPROBADO` hasta servir el SHA de esta implementación. Comprobación pública previa a este cambio: v0.5.65/SHA e2aa436; v0.5.66 aún no aplicado.
