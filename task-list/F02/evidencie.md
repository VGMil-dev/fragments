# F02 — Evidence / evidencie

Estado: READY FOR PLANNER INTEGRATION; no marcar DONE hasta cablear rutas y completar captura visual.
Owner: W2

## Skills y criterio

- Leídos: `AGENTS.md`, `SYSTEM_PROMPT_CODEX.md`, `skills/SKILLS_MATRIX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md`, `task-list/TASKS.md` y los archivos F02.
- `ego-browser` v2.2.0: leído y ejecutado `ego-browser skill` (salida completa). No se abrió navegador: `App.tsx` es zona del planner y todavía no enruta las superficies F02.
- `frontend-design`, `react-best-practices`, `web-design-guidelines`, `test-driven-development` y `verification-before-completion`: las copias originales no están instaladas en los directorios de skills locales ni en el cache local inspeccionado. No se instalaron ni se consultaron fuentes externas. Se siguieron las reglas explícitas de diseño, accesibilidad, TDD y verificación de este repositorio.
- Los exports y paths F02 se tomaron de los contratos y el mapa aprobado por el planner; no se añadieron DTOs ni endpoints.

## Rutas implementadas

- `apps/web/package.json`: dependencia workspace `@fragments/contracts` autorizada por el planner. El lockfile queda a cargo del planner.
- `apps/web/src/lib/api/api-client.ts` y `student-api.ts`: cliente de mismo origen, esquemas compartidos, timeout, cancelación, errores genéricos, validación de requests y descargas raw Markdown/PDF en memoria.
- `apps/web/src/hooks/async-state.tsx`, `use-api-request.ts`, `data-source-badge.tsx` y estilos/tests: carga, vacío, error recuperable, éxito y marca visible para fixtures/modelos `fake/` o `fake:`.
- `apps/web/src/features/gallery/`: galería composable con campos del contrato, selección, estado vacío y marca fake.
- `apps/web/src/features/mentor/`: formulario con validación del esquema compartido, evaluación, guía/evidencias del response, reevaluación y generación/descarga de entrega.
- `apps/web/src/features/review/`: validación del SHA completo, cola/progreso, hallazgos respaldados por evidencia y generación/descarga de entrega.
- `apps/web/src/features/submissions/`: descargas temporales Markdown/PDF usando el `id` de entrega; no muestra ni persiste el código de verificación.
- `task-list/TASKS.md`, `apps/web/src/App.tsx`, contratos, lockfile, marca y branding no se editaron.

## Verificación fresca

- `pnpm install --frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments` — exit 0 antes de declarar la dependencia web de contratos.
- `pnpm install --no-frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments` — exit 0 tras añadir el vínculo autorizado; el cambio de importer se descartó del worktree y el planner sincronizará el lockfile.
- `pnpm --filter @fragments/contracts build` — exit 0.
- `vitest run apps/web/src` — exit 0; 11 archivos, 40 pruebas aprobadas.
- `pnpm --filter @fragments/contracts test` — exit 0; 1 archivo, 16 pruebas aprobadas.
- `pnpm --filter @fragments/web typecheck` — exit 0.
- `pnpm --filter @fragments/web build` — exit 0. `App.tsx` sigue siendo la landing F01, por lo que este build no incluye todavía las nuevas rutas.
- Se ejecutaron primero pruebas rojas para los módulos nuevos; después las suites anteriores pasaron en verde.

## Capturas, hash y limitaciones

- Capturas / logs: no hay captura de F02; las superficies todavía no están conectadas a rutas. El planner debe integrar el enrutamiento y validar 390/1440 px, teclado y foco con ego(lite).
- Hash / commit de implementación W2: `74c62fc3c8371260ba1636e2922e1d2633d6ddae`.
- Limitación: la verificación visual/E2E completa depende de integración del planner. Las skills originales listadas arriba tampoco están disponibles localmente; ego-browser sí lo está.
- No se marcó F02 como DONE ni se actualizó `task-list/TASKS.md`.
