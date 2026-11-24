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
- F14 recuperado tras agotar el almacenamiento del servidor. Se liberaron únicamente 142 tags de imágenes Fragments históricas, no referenciadas por contenedores ni por el rollback conservado. El poller aplicó `v0.5.66` automáticamente y luego `v0.5.67` por el flujo F14 normal.
- `v0.5.67` (tag anotada) apunta a `a40653c10b6874f72b47c9a8027dd2d24982ad37`, que incluye el merge de F17.14. Workflow F14 `45398587029`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Ledger de VPS: release `456771380`, estado `deployed`; `fragments-web-1` y `fragments-api-1` saludables en el SHA exacto; `/health` HTTP 200 con `ok/ready`.
- Ego Lite en la sesión estudiantil existente confirmó el pie `v0.5.67`, el indicador compacto y seis segmentos a 320, 390, 520 y 1100 CSS px; el selector cambió Idea → Contexto sin guardar datos. A 1101 y 1440 CSS px se mostraron los seis pasos horizontales y un único paso actual. Sin overflow horizontal en los anchos observados.
- La validación productiva de F17.14 queda comprobada funcionalmente en los tamaños probados; aceptación visual propietaria, teclado/lector de pantalla y zoom 200 % siguen NO COMPROBADOS. La sesión Ego Lite estudiantil quedó abierta.
