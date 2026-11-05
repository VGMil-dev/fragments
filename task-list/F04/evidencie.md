# F04 — Evidence / evidencie

Estado actual: PARCIAL. Mentor, versionado, galería opt-in y conexión al evaluador Gateway están integrados; evaluación real del Gateway pendiente porque faltan tarifas máximas verificables en `.env`.
Owner: W4

## Skills consultadas

- `backend-architecture` (`we-are-singular/skills`): no disponible como `SKILL.md` en las ubicaciones locales consultadas (`C:\Users\vgmil\.codex\skills`, `C:\Users\vgmil\.agents\skills`, `C:\Users\vgmil\.codex\plugins\cache`). No se instaló.
- `test-driven-development` (`obra/superpowers`): no disponible en esas ubicaciones. Se aplicó el ciclo rojo-verde: prueba de integridad falló antes del cambio y pasó después.
- `verification-before-completion` (`obra/superpowers`): no disponible en esas ubicaciones. Se registraron salidas frescas de comandos en esta evidencia.
- Criterio aplicado directamente: separar evaluador y renderizador detrás de puertos tipados, mantener el dominio sin framework y no persistir los artefactos generados.

## Rutas cambiadas

- `apps/api/src/features/mentor/service.ts`
- `apps/api/src/features/mentor/service.test.ts`
- `task-list/F04/evidencie.md`

## Comandos y resultados

- `pnpm install --frozen-lockfile --store-dir C:\Users\vgmil\.cache\pnpm\fragments` — exit 0; store reutilizado, lockfile sin cambios.
- `pnpm exec vitest run apps/api/src/features/mentor/service.test.ts` — exit 0; 1 archivo, 4 pruebas pasaron.
- Tras añadir la verificación de hash, `pnpm exec vitest run packages/contracts/src/index.test.ts apps/api/src/features/mentor/service.test.ts` — exit 0; 2 archivos, 14 pruebas pasaron.
- Ciclo TDD para alteración del snapshot: primera ejecución — exit 1, falló el caso “refuses to render when the snapshot JSON no longer matches its hash”; segunda ejecución tras corregir — incluido en las 14 pruebas pasadas.
- `pnpm --filter @fragments/contracts build` — exit 0 (`tsc -p tsconfig.json`).
- `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck apps/api/src/features/mentor/service.ts apps/api/src/features/mentor/service.test.ts` — exit 1: `TS2591 Cannot find name 'node:crypto'`; el scaffold aún no declara/provee `@types/node` ni `apps/api`.

## Cobertura demostrada

- Validación de propuesta con mensaje por nombres de campos, sin repetir contenido ingresado.
- Evaluador tipado falso valida salidas contra `AiAnalysisSchema`, adjunta orientación y similitudes.
- Snapshot cumple `SubmissionSnapshotSchema`, conserva datos de propuesta y evaluación, fija versión del renderer, genera SHA-256 canónico y token aleatorio; llamadas repetidas conservan el hash y emiten códigos diferentes.
- Snapshot inmutable y alteraciones de su contenido son rechazadas al generar README/PDF.
- README se crea bajo demanda sin revelar nota; PDF usa el puerto falso solo cuando se solicita. No se guardan los bytes o README.
- Sin aprobación docente ni llamadas a servicios externos; no se ejecuta código de estudiante.

## Limitaciones

- F03 debe aportar el manifiesto/configuración TypeScript de API y tipos Node para completar el chequeo de tipos sin ampliar la zona de W4.
- Sin controlador HTTP ni persistencia: corresponden a la plataforma F03 y la integración posterior.
- Se usaron evaluator/PDF fake etiquetados; no se probó proveedor IA ni renderer PDF real.
- No se modificó `task-list/TASKS.md` porque está reservado al planner.

## Hash / commit

Implementación: `526aec7bce82e6ba692c7c6023f3767a22e73067` (`feat(mentor): implementar evaluacion y entregas efimeras`).
Evidencia: se registrará en el commit documental inmediato posterior.

## Seguimiento de integración — 2026-11-04

- Integración compartida con Review/Inspector y barrera de costes: `7d1417d` (`feat(mvp): integra flujos con proveedores seguros`).
- Integración raíz de la implementación Mentor: commit de la rama `codex/fragments-mvp` `4d5247f` (`feat(f04): implementar mentor y galeria opt-in`).
- `apps/api/src/main.ts` conecta el evaluador Gateway con el ledger SQLite; la galería, edición optimista por versión, historial y opt-in usan la persistencia existente.
- `apps/api/migrations/005-mentor-revisions.sql` agrega revisiones y opt-in por propuesta; el runner también ejecuta estas migraciones.
- Ego Lite observó Galería vacía al inicio. Desde la app local se comprobó alta de propuesta `201`, edición `200` versión 2, historial `200` con 2 versiones, opt-in `200` y 1 entrada visible.
- `pnpm test` — exit 0; API 78/78 y contratos 18/18.
- `pnpm --filter @fragments/api typecheck` y `pnpm --filter @fragments/web typecheck` — exit 0.

### Bloqueo y límites

- El `.env` tiene `AI_GATEWAY_API_KEY` y `AI_GATEWAY_MODEL`, pero no `AI_GATEWAY_MAX_INPUT_USD_PER_MILLION` ni `AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION`. El evaluador falla cerrado antes de despachar sin ambas tasas. No se hizo ninguna solicitud a AI Gateway; gasto externo observado: USD 0.
- Vercel documenta sus budgets como soft limits; por ello el ledger local estima, reserva llamadas en curso y contabiliza recibos, pero no se afirma un límite estricto del proveedor. [Documentación de budgets de Vercel AI Gateway](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets).
- F04 permanece `[ ]` en `task-list/TASKS.md` hasta probar una evaluación real autorizada con pricing verificable.
