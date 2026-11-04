# F04 — Evidence / evidencie

Estado: INTEGRADO PARCIALMENTE EN `codex/fragments-mvp`; dominio, endpoints básicos y persistencia SQLite ya están conectados a `@fragments/contracts`. La fila central sigue pendiente porque las coincidencias con galería opt-in y la edición/versionado de borradores no están integradas. La fila central queda pendiente del planner (solo el planner edita `task-list/TASKS.md`).
Owner: W4

## Skills consultadas

- `backend-architecture` (`we-are-singular/skills`): no disponible como `SKILL.md` en las ubicaciones locales consultadas (`C:\Users\vgmil\.codex\skills`, `C:\Users\vgmil\.agents\skills`, `C:\Users\vgmil\.codex\plugins\cache`). No se instaló.
- `test-driven-development` (`obra/superpowers`): no disponible en esas ubicaciones. Se aplicó el ciclo rojo-verde: prueba de integridad falló antes del cambio y pasó después.
- `verification-before-completion` (`obra/superpowers`): no disponible en esas ubicaciones. Se registraron salidas frescas de comandos en esta evidencia.
- Criterio aplicado directamente: separar evaluador y renderizador detrás de puertos tipados, mantener el dominio sin framework y no persistir los artefactos generados.

## Rutas cambiadas

- `apps/api/src/features/mentor/service.ts`
- `apps/api/src/features/mentor/service.test.ts`
- `apps/api/src/features/mentor/http.ts`
- `apps/api/src/features/mentor/repository.ts`
- `apps/api/src/features/mentor/local-fakes.ts`
- `apps/api/migrations/002-mentor.sql` y migración runtime en `apps/api/src/db/migrate.ts`
- `apps/api/src/http/app.ts`, `apps/api/src/http/app.test.ts`, `apps/api/src/main.ts`
- `packages/contracts/src/index.ts` y `packages/contracts/src/index.test.ts` (DTOs compartidos fijados por el planner)
- `docs/CONTRACTS.md`
- `task-list/F04/evidencie.md`

## Comandos y resultados

- `pnpm install --frozen-lockfile --store-dir C:\Users\vgmil\.cache\pnpm\fragments` — exit 0; store reutilizado, lockfile sin cambios.
- `pnpm exec vitest run apps/api/src/features/mentor/service.test.ts` — exit 0; 1 archivo, 4 pruebas pasaron.
- Tras añadir la verificación de hash, `pnpm exec vitest run packages/contracts/src/index.test.ts apps/api/src/features/mentor/service.test.ts` — exit 0; 2 archivos, 14 pruebas pasaron.
- Ciclo TDD para alteración del snapshot: primera ejecución — exit 1, falló el caso “refuses to render when the snapshot JSON no longer matches its hash”; segunda ejecución tras corregir — incluido en las 14 pruebas pasadas.
- `pnpm --filter @fragments/contracts build` — exit 0 (`tsc -p tsconfig.json`).
- `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck apps/api/src/features/mentor/service.ts apps/api/src/features/mentor/service.test.ts` — exit 1: `TS2591 Cannot find name 'node:crypto'`; el scaffold aún no declara/provee `@types/node` ni `apps/api`.
- Integración en workspace con F03: `pnpm --filter @fragments/contracts test` — exit 0; 16 pruebas pasaron.
- `pnpm --filter @fragments/contracts build` — exit 0.
- `pnpm --filter @fragments/api build` y `pnpm --filter @fragments/api typecheck` — exit 0 con import desde el paquete compartido.
- `pnpm --filter @fragments/api test` — exit 0; 7 archivos, 18 pruebas pasaron.
- Tras integrar endpoints y persistencia: `pnpm --filter @fragments/api test` — exit 0; 7 archivos, 19 pruebas pasaron, incluyendo propuesta→evaluación fake→entrega inmutable→README/PDF efímeros→verificación.
- `pnpm --filter @fragments/api build` y `pnpm --filter @fragments/api typecheck` — exit 0 después de la integración HTTP.

## Cobertura demostrada

- Validación de propuesta con mensaje por nombres de campos, sin repetir contenido ingresado.
- Evaluador tipado falso valida salidas contra `AiAnalysisSchema`, adjunta orientación y similitudes.
- Snapshot cumple `SubmissionSnapshotSchema`, conserva datos de propuesta y evaluación, fija versión del renderer, genera SHA-256 canónico y token aleatorio; llamadas repetidas conservan el hash y emiten códigos diferentes.
- Snapshot inmutable y alteraciones de su contenido son rechazadas al generar README/PDF.
- README se crea bajo demanda sin revelar nota; PDF usa el puerto falso solo cuando se solicita. No se guardan los bytes o README.
- Sin aprobación docente ni llamadas a servicios externos; no se ejecuta código de estudiante.

## Limitaciones

- F03 debe aportar el manifiesto/configuración TypeScript de API y tipos Node para completar el chequeo de tipos sin ampliar la zona de W4.
- La API integrada usa un evaluador heurístico local explícitamente marcado `fake/local-heuristic-v1`; no usa el Gateway.
- La galería aún devuelve una lista vacía y no hay flujo opt-in ni coincidencias reales, ni edición/versionado de propuestas. La verificación Review queda deshabilitada hasta integrar F05.
- Se usaron evaluator/PDF fake etiquetados; no se probó proveedor IA ni renderer PDF real.
- No se modificó `task-list/TASKS.md` porque está reservado al planner.

## Hash / commit

Implementación: `526aec7bce82e6ba692c7c6023f3767a22e73067` (`feat(mentor): implementar evaluacion y entregas efimeras`).
Evidencia original: `582659532b0d584066331da2ecf6552d37dd5b86` (`docs(mentor): registrar evidencia de F04`).

Integración parcial de contratos, HTTP y SQLite: `codex/fragments-mvp`; permanece sin marcar como completa hasta integrar galería opt-in y coincidencias, edición/versionado de borrador y Review.
