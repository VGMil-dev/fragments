# F06 — Evidence / evidencie

**Estado:** IMPLEMENTADO PARCIALMENTE EN AISLAMIENTO. La lógica de dominio y el panel docente están listos para integrar. F06 sigue abierto: no hay rutas de Inspector, DTOs de asignación/defensa, persistencia SQLite, pantalla conectada al flujo ni E2E visual.

**Owner:** W6.

## Skills consultadas

- `ego-browser`: lectura directa de `C:\Users\vgmil\.agents\skills\ego-browser\SKILL.md`. No se abrió navegador: el panel no está conectado a una ruta ni puede verificarse en la app. Se hará E2E con ego(lite) al integrar el flujo visible.
- `backend-architecture`, `test-driven-development`, `verification-before-completion`: no se encontraron `SKILL.md` locales en las carpetas consultadas. Se aplicó separación de puertos, pruebas red/verde y verificación con comandos frescos.
- Criterio de diseño aplicado: se reutilizan `InspectorChallengeSchema` y `InspectorChallengePublicSchema`, la paleta y las variables del sistema visual, teclado y diseño adaptable.

## Rutas cambiadas

- `apps/api/src/features/inspector/service.ts`
- `apps/api/src/features/inspector/service.test.ts`
- `apps/web/src/features/inspector/InspectorTeacherPanel.tsx`
- `apps/web/src/features/inspector/inspector-teacher-panel.css`
- `task-list/F06/intent.md`
- `task-list/F06/spec.md`
- `task-list/F06/evidencie.md`

## Cobertura implementada

- Un reto solo se crea desde un Review existente cuya revisión y snapshot comparten el SHA exacto actual.
- La fuente del reto la selecciona el dominio desde un hallazgo `verified`; ruta y digest deben existir en el snapshot validado y las líneas deben estar dentro del archivo. El proveedor no decide la ruta.
- El flujo privado valida `InspectorChallengeSchema`; la salida para estudiante construye y valida `InspectorChallengePublicSchema`, que rechaza `teacherHint`.
- Asignar requiere docente; registrar defensa exige el docente asignador y una entrada estricta de mutación, restauración y nota limitada.
- Un commit nuevo obsoleta retos pendientes, congela los asignados con `supersededByCommitSha` y conserva retos realizados/defensas.
- Pruebas usan `fake/local` provider y store en memoria. No se llama a IA/GitHub ni se ejecuta código estudiantil.
- El panel docente muestra fuente, precondición, mutación, demostración y restauración; la ayuda se separa en una sección identificada como privada. El componente sigue aislado y no altera `App` ni el routing global.

## Comandos ejecutados y resultados

- `pnpm install --frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments --config.confirmModulesPurge=false` — exit 0; worktree preparado sin ejecutar scripts de dependencias.
- `pnpm --filter @fragments/contracts build` — exit 0.
- `pnpm lint` — exit 0; Turbo ejecutó el lint declarado por contratos.
- `pnpm --filter @fragments/api build` — exit 0.
- `pnpm --filter @fragments/api typecheck` — exit 0.
- `pnpm --filter @fragments/api test` — exit 0; 8 archivos, 22 pruebas pasaron.
- `pnpm --filter @fragments/web build` — exit 0.
- `pnpm --filter @fragments/web typecheck` — exit 0, incluye el panel Inspector aislado.
- El ciclo de TDD tuvo fallas iniciales para reto no asignado y evidencia sin hallazgo verificado; después de ajustar reglas y fixtures, las 22 pruebas pasan.

## Limitaciones / trabajo pendiente

- Contratos compartidos no incluyen DTOs para asignación/registro ni respuesta de reto con estado y expiración; no se editaron por instrucción del planner. El router fijo enumera `POST /api/inspector/:reviewId/challenges` y `POST /api/inspector/challenges/:id/record`; el planner debe fijar sus payloads antes de conectarlos.
- Falta repositorio SQLite e integración con la persistencia real de Review.
- La autenticación docente debe proteger las rutas; el servicio recibe `teacherId` ya verificado por el borde HTTP.
- El panel usa importación de tipos desde el source compartido mientras el package link de `apps/web` queda pendiente de integración F02. El planner puede cambiarlo a `@fragments/contracts` cuando se agregue esa dependencia.
- No se probó E2E ni se capturaron screenshots porque la pantalla no tiene una ruta visible. La prueba visual debe usar exclusivamente ego(lite).
- No se ejecutó evaluación Promptfoo ni proveedor de IA real; el dominio se probó con un fake determinista.

## Hash / commit

Implementación parcial: `47c6d37d76b9379a3a7e6d34d281e49ba5c9c602` (`feat(f06): implementa retos Inspector privados`).
Estado real: sin integrar en `codex/fragments-mvp`; no se marcó F06 como completada.
