# F05 — Evidence / evidencie

**Estado actual:** PARCIAL. Review ya está conectado a rutas, SQLite, cola, GitHub público, Repomix y AI Gateway; falta una evaluación real de IA, bloqueada por la ausencia de tarifas máximas para estimar el coste.

**Owner:** W5

**Branch:** `task/f05-review`
**Commit de implementación:** `a5c3f4b` — `feat(F05): implementar review aislado por commit`

## Skills consultadas

- `backend-architecture` (`we-are-singular/skills`): aplicada directamente para los límites entre servicio, adaptadores y contrato compartido.
- `test-driven-development` (`obra/superpowers`): aplicada directamente. El primer test se ejecutó en rojo al faltar `review.service.js`; se implementó después y el pase final está registrado abajo.
- `verification-before-completion` (`obra/superpowers`): aplicada directamente con salida y código frescos antes del commit.
- Docs oficiales Promptfoo: criterio de provider JavaScript ESM y assertions deterministas.

Skills originales se leyeron desde los repositorios de origen porque no estaban instaladas localmente. No se instalaron skills.

## Rutas cambiadas

- `apps/api/src/features/review/review.service.ts`
- `apps/api/src/features/review/review.service.test.ts`
- `apps/api/src/features/review/in-memory-review-store.ts`
- `apps/api/src/adapters/github/github.repository-reader.ts`
- `apps/api/src/adapters/repomix/repository-packer.ts`
- `apps/api/src/adapters/ai/ai-provider.ts`
- `apps/api/src/adapters/ai/pdf-renderer.ts`
- `evals/promptfooconfig.yaml`
- `evals/fixtures/review-cases.yaml`
- `evals/providers/fake-review-provider.mjs`
- `task-list/F05/intent.md`
- `task-list/F05/spec.md`

`task-list/TASKS.md` no se cambió: AGENTS.md reserva ese archivo al planner.

## Comandos y resultados

- `pnpm install --frozen-lockfile --store-dir C:\Users\vgmil\.cache\pnpm\fragments` — salida 0; 2 proyectos de workspace, lockfile vigente, dependencias reutilizadas. No se editó el lockfile.
- Primer ciclo rojo: `pnpm exec vitest run apps/api/src/features/review/review.service.test.ts` — salida 1; Vitest informó que faltaba `./review.service.js` (el comportamiento aún no existía).
- `pnpm exec vitest run apps/api/src/features/review/review.service.test.ts` — salida 0; 1 archivo, 8 pruebas aprobadas.
- `pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --esModuleInterop --forceConsistentCasingInFileNames apps/api/src/features/review/review.service.ts apps/api/src/features/review/in-memory-review-store.ts apps/api/src/adapters/github/github.repository-reader.ts apps/api/src/adapters/repomix/repository-packer.ts apps/api/src/adapters/ai/ai-provider.ts apps/api/src/adapters/ai/pdf-renderer.ts apps/api/src/features/review/review.service.test.ts` — salida 0, sin errores.
- `pnpm exec turbo test --force` — salida 0; contratos ejecutados sin caché: 1 archivo, 9 pruebas aprobadas. Turbo solo conoce `@fragments/contracts` en el checkout base.
- `pnpm exec turbo build --force` — salida 0; build de `@fragments/contracts` aprobado.
- Desde `evals/`, con telemetría, actualizaciones y cache deshabilitados y configuración local fuera del repo: `npx.cmd --yes promptfoo@latest eval --config promptfooconfig.yaml --no-cache --no-progress-bar --no-table` — salida 0; Promptfoo 0.125.1, 3 casos, 3 aprobados, 0 fallidos, 0 errores. Solo se cargó el provider falso local `.mjs`.
- `npx.cmd --yes promptfoo@latest --version` — salida 0; `0.125.1`.
- `node --input-type=module -e "import Provider from './evals/providers/fake-review-provider.mjs'; const provider = new Provider(); const vars = { fixture: 'grounded', digest: 'a'.repeat(64), inputDigest: 'b'.repeat(64) }; const result = await provider.callApi('prompt', { vars }); const output = JSON.parse(result.output); if (provider.id() !== 'fake-local-review' || output.findings[0].evidence[0].path !== 'src/math.ts') process.exit(1); console.log('fake provider: valid id and structured fixture output');"` — salida 0; provider e identidad y fixture estructurado verificados.
- `Test-Path -LiteralPath '.env'` desde `evals/` — `False`; Promptfoo se ejecutó desde ese directorio. No se leyó ningún valor `.env`.
- `pnpm test` — salida 0, pero Turbo reprodujo caché del test de contratos; se volvió a ejecutar sin caché mediante `pnpm exec turbo test --force`.

## Comportamiento cubierto

- Commit SHA completo, rechazo de referencia tipo rama, URL de repo no válida y respuesta con otro commit.
- Digest de snapshot/entrada, archivos y rangos de línea en evidencia; rechazo de rutas inexistentes.
- Empaquetado en memoria con presupuesto, omisión de credenciales y aviso de rutas excluidas.
- Cache por proyecto/commit/rúbrica/evaluador y feedback progresivo.
- PDF multi página bajo demanda y token consultable; no se persisten bytes PDF.
- Flujo offline integrado con lector GitHub y AI falsos, empaquetador y renderer locales.
- Evals deterministas para evidencia, prompt injection en README y ruta inexistente.

## Limitaciones

- El checkout F00 no contiene `apps/api`, router, `package.json` de API ni base SQLite. Los módulos quedan aislados y no se registra endpoint ni almacenamiento duradero; el planner/W3 debe integrarlos.
- GitHub es un puerto inyectable, sin cliente real ni solicitudes externas.
- AI es un puerto estructurado/falso; no se implementó ni invocó Gateway/AI SDK.
- El adaptador Repomix procesa snapshots in-memory con límites; no instala ni ejecuta Repomix CLI/procesos de repositorio.
- El PDF se crea con renderer local pequeño; no se hizo inspección visual o QA con lector PDF.
- Los tests funcionales viven bajo `apps/api`, por lo que Turbo no los recoge en este scaffold. Se ejecutaron directamente con Vitest y TypeScript.
- No se cambió el estado central de F05 ni se afirma integración E2E HTTP.

**Capturas/logs:** no se generaron capturas; salidas exactas resumidas arriba.

**Hash / commit:** `a5c3f4b` (implementación; evidencia adicional se registra en un commit documental posterior).
**Pendiente:** planner integra la ruta/persistencia en el paquete API común y actualiza `task-list/TASKS.md` tras revisión.

## Seguimiento de integración — 2026-11-04

Las limitaciones del checkout aislado descritas arriba quedaron resueltas por los commits de integración `60c9ab9` (`feat(f05): integrar review HTTP y worker`) y el commit raíz `codex/fragments-mvp` que incorpora el worker.

- Integración compartida de adaptadores, ledger y composición: `7d1417d` (`feat(mvp): integra flujos con proveedores seguros`).

- HTTP Review (`POST /api/reviews`, `GET /api/reviews/:id`, entrega PDF y verificación) quedó registrado en `createHttpHandler`.
- SQLite persiste trabajos, evaluación, entregas y códigos de verificación. El worker usa lease/heartbeat y devuelve estados duraderos.
- El lector REST consulta primero metadata del repo y rechaza todo salvo `private === false`; recibe SHA completo y no ejecuta archivos del repo.
- Repomix oficial procesa únicamente un árbol temporal construido por el servidor, con allowlist, configuración local/remota deshabilitada, límites de bytes/tokens y borrado de ese árbol al terminar.
- `evals/fixtures/fragments-test-commits.json` registra características verificadas/prohibidas de los tres commits indicados.
- `node --env-file=../../.env --import tsx ../../evals/scripts/audit-public-fixtures.mts` desde `apps/api` — exit 0. A `1104f40`: 11 archivos, 12,767 bytes, 3,403 tokens; formulario/lista sí, validación/búsqueda/recuperación no. B `a66a8da`: 13 archivos, 15,118 bytes, 4,023 tokens; formulario/lista y validación sí, búsqueda/recuperación no. C `e2b54b2`: 14 archivos, 21,548 bytes, 5,629 tokens; las cuatro funcionalidades sí.
- `pnpm test` — exit 0; API 78/78, contratos 18/18. Las pruebas incluyen rutas Review, SQLite, worker, lector GitHub simulado, Repomix local sintético, ledger y provider AI etiquetado offline.
- `pnpm build` — exit 0; 3/3 paquetes.
- `pnpm typecheck` — exit 0; 4/4 tareas.

### AI Gateway y presupuesto

- Las únicas solicitudes externas realizadas fueron lecturas HTTP GET al repositorio público autorizado para los commits A/B/C. No se envió contenido al Gateway; gasto externo de IA registrado: USD 0.
- El `.env` no contiene `AI_GATEWAY_MAX_INPUT_USD_PER_MILLION` ni `AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION`. Sin ambas tarifas, el ledger rechaza la evaluación antes del proveedor. Por tu límite, se detuvieron las tres evaluaciones solicitadas.
- El ledger SQLite reserva hasta USD 1 acumulado, aplica una estimación con margen, contabiliza el recibo reportado por el Gateway y bloquea llamadas posteriores si el recibo es desconocido o excede la reserva. Vercel indica que sus budgets son soft limits; el ledger no garantiza por sí solo un techo estricto de gasto externo. [Documentación de budgets](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets).
- F05 permanece `[ ]` hasta ejecutar una evaluación real dentro de tarifas máximas configuradas y verificables.

## Seguimiento — contratos compartidos

**Estado:** IN PROGRESS; rutas y SQLite siguen pendientes.

El servicio ahora importa `@fragments/contracts`. La entrada pública se valida con `ReviewRequestSchema` y contiene únicamente owner/repo/SHA. `projectId`, `rubricVersion` y `evaluatorVersion` se pasan por un contexto interno separado. El estado de review se valida con `ReviewResponseSchema`; la entrega con `SubmissionResponseSchema` (incluye `id` y snapshot inmutable); la respuesta de verificación se valida con `VerifySubmissionResponseSchema` e informa `integrityValid`.

El worker branch todavía tiene el contrato anterior y carece del paquete `apps/api`. Para probar el cambio sin editar contratos/planner files, se generó un alias temporal bajo `C:\Users\vgmil\.codex\tmp\f05-contract-validation-affce9f772234e6ea3033b01a49c2453`, apuntando a `packages/contracts/src/index.ts` del commit compartido `918453c`.

Comandos frescos del seguimiento:

- `pnpm exec vitest run --config C:\Users\vgmil\.codex\tmp\f05-contract-validation-affce9f772234e6ea3033b01a49c2453\vitest.config.mjs apps/api/src/features/review/review.service.test.ts` — salida 0; 1 archivo, 9 pruebas aprobadas contra los contratos compartidos.
- `pnpm exec tsc --project C:\Users\vgmil\.codex\tmp\f05-contract-validation-affce9f772234e6ea3033b01a49c2453\tsconfig.review.json` — salida 0, sin errores.
- Un primer chequeo de tipos detectó que el contrato exporta `SubmissionResponseSchema` pero no un tipo `SubmissionResponse`; el tipo interno ahora se deriva con `ReturnType<typeof SubmissionResponseSchema.parse>`, sin duplicar el DTO.

**Commit de alineación:** `fc7309a` — `fix(f05): alinear review con contratos compartidos`. Las rutas cambiadas permanecen dentro de los archivos F05 propios; no se tocó `TASKS.md`, `MANIFEST.sha256.json`, lockfile, package root ni contratos compartidos.

## Integración en raíz

**Estado:** PARCIAL; el dominio y los adaptadores aislados están integrados en `codex/fragments-mvp`, pero F05 no está completa.

- Commits importados: `feat(F05): implementar review aislado por commit`, evidencia original, alineación de contratos y evidencia de alineación. La alineación ahora importa `@fragments/contracts` y separa el request público del contexto interno.
- `pnpm --filter @fragments/api build` — exit 0.
- `pnpm --filter @fragments/api typecheck` — exit 0.
- `pnpm --filter @fragments/api test` — exit 0; 8 archivos y 28 pruebas, incluidas las 9 del servicio Review.

**Pendiente para DONE:** rutas HTTP, persistencia SQLite de evaluaciones/entregas, worker/cola, lector real de GitHub, AI SDK/Gateway configurado por servidor e integración de descarga/verificación con la UI. No se hicieron solicitudes externas ni se afirma un análisis real del Gateway.
