# Evidencia F18.B

## Regresión de continuidad misión → Mentor — 2026-11-22

- Se añadió `apps/api/src/features/assignments/academic-flow.integration.test.ts`: PostgreSQL fixture con IDs UUID, preflight obligatorio `current_database() = fragments_test` y cleanup limitado a sus propios registros.
- El recorrido comprueba publicar misión v1 con habilidad requerida, visibilidad a matrícula activa, crear/recuperar propuesta ligada al ID inmutable de v1, publicar v2 con habilidad optativa y conservar snapshot/contexto de v1 para evaluación Mentor etiquetada `fake/local-heuristic-v1`.
- Verificación local: `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 1 prueba omitida porque `DATABASE_URL` no está configurada. No se abrió conexión; integración PostgreSQL queda **NO COMPROBADA localmente**, pendiente de CI efímero.
- Verificación local: `pnpm --filter @fragments/api typecheck` — PASS; `git diff --check` — PASS.
- No se modificaron contratos, migraciones, rutas, configuración de proveedores, datos productivos ni sesiones de navegador. La fake no valida calidad de IA real ni sustituye el recorrido Ego Lite.

## Estado

Implementación local parcial, sin migrar bases de datos. El CRUD docente, publicación versionada y lectura estudiantil están implementados; una misión inicia un borrador con su ID de versión inmutable. La API fija esa relación en `Proposal`, verifica matrícula activa y evalúa usando el snapshot y contexto/rúbrica F11 exactos versionados. Mis aulas ofrece el CTA y entrega el contexto de la misión.

## Cambios implementados

- Prisma: `ClassroomAssignment` guarda borrador y contador optimista; `ClassroomAssignmentVersion` conserva snapshot append-only de misión, skills requeridas/optativas y `mentorContextVersion`.
- API encapsulada en `apps/api/src/features/assignments/http.ts`: listar/crear/editar/publicar misiones con propiedad del aula; lectura estudiante requiere matrícula activa y aula activa. Respuesta de estudiante fija `assignmentId` y usa `id` de versión como identificador inmutable.
- Migración aditiva `apps/api/prisma/migrations/20261122100000_classroom_assignments/migration.sql`; agrega dos tablas, FK e índices; no altera UX-08 ni otros modelos.
- UI docente en el detalle de `ClassroomStudio`, con borrador y distinción requerida/optativa; componente estudiantil `StudentAssignmentsList` para montaje en Mis aulas.
- Borradores rechazan habilidades no habilitadas o archivadas al crear y editar; error de red en las consultas de Mis aulas termina en estado visible de error por recurso.
- Tests usan identidades `fixture-*`, mock Prisma y fake auth; no evalúan código estudiantil ni llaman proveedores externos.
- Migración aditiva `20261122120000_proposal_assignment_version`; propuestas legado permanecen con FK nula. Las ediciones de propuesta no cambian la versión académica vinculada.
- La lectura estudiantil y las propuestas recuperadas incluyen el contexto Mentor compuesto desde el snapshot de misión y su `mentorContextVersion`; el endpoint de evaluación reconsulta ambas versiones en servidor y añade el ID de misión al digest/idempotencia.

## Verificación local fresca

- CI anterior del PR #90, run `45030155130`, falló en `packages/contracts/src/index.test.ts:94`: el fixture StudentAssignment omitía el nuevo campo requerido `mentorContext`. Se corrigió el fixture con contexto versionado representativo; `pnpm --filter @fragments/contracts test` — PASS (29/29), `pnpm --filter @fragments/contracts typecheck` — PASS y `git diff --check` — PASS. El nuevo CI queda pendiente tras publicar este commit.
- Después de integrar F25 PR #92 en `main` (`74c413c`), la rama F18.B se sincronizó con `origin/main` mediante merge normal. En el árbol sincronizado: contratos 29/29, contratos/API/web typecheck y `git diff --check` — PASS. CI del head sincronizado pendiente de publicarse/terminar. Revisión estática independiente PASS en ownership, matrícula y binding de contexto; PostgreSQL runtime continúa NO COMPROBADO.
- CI run `45032024829` encontró un defecto de integración en `POST /api/proposals/:id/review`: el repositorio devuelve `assignmentContext` junto al borrador, pero la ruta lo propagaba a `ProposalResponseSchema` estricto de evaluación. Se corrigió construyendo el DTO de evaluación con sus campos permitidos y omitiendo el contexto de transporte. El mismo run informó timeout de 5 s en una prueba PostgreSQL de `apps/api/src/http/app.test.ts`; está pendiente saber si persiste tras la corrección. No hubo despliegue.
- Verificación local tras el fix: suite API completa 100 PASS/66 omitidas por `DATABASE_URL` ausente; web 145/145; contratos 29/29; typecheck API/web y `prisma validate` PASS. La ruta PostgreSQL que reprodujo el defecto se validará con el siguiente CI; su timeout de 5 s también queda pendiente de reevaluación.
- `pnpm --filter @fragments/contracts build` — PASS (`tsc -p tsconfig.json`).
- `pnpm --filter @fragments/api exec prisma validate` — PASS (`The schema at prisma\\schema.prisma is valid`).
- `pnpm --filter @fragments/api exec prisma generate` — PASS (Prisma Client 7.10.1 generado).
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/mentor-context.test.ts src/features/assignments/repository.test.ts src/features/mentor/http.test.ts src/features/mentor/repository.test.ts --maxWorkers=1` — PASS (7 tests ejecutados; 15 pruebas PostgreSQL omitidas por `DATABASE_URL` ausente). Persistencia de asociación/evaluación SQL queda NO COMPROBADA localmente.
- `pnpm --filter @fragments/api typecheck` — PASS (`tsc --noEmit -p tsconfig.json`).
- `pnpm --filter @fragments/web exec vitest run src/features/assignments/AssignmentsPanel.test.tsx src/features/classroom/ClassroomStudio.test.tsx src/features/student/StudentClassroomsScreen.test.tsx` — PASS (3 archivos, 7 tests; incluye el montaje de Mis aulas).
- `pnpm --filter @fragments/web typecheck` — PASS (`tsc -p tsconfig.json`).
- `git diff --check` — PASS.
- `pnpm --filter @fragments/web exec vitest run src/features/assignments/AssignmentsPanel.test.tsx src/lib/api/student-api.test.ts --maxWorkers=1` — PASS (17 tests); CTA devuelve versión completa y cliente transmite `assignmentVersionId`.
- `pnpm --filter @fragments/api exec prisma validate` — PASS.
- Revisión estática independiente encontró dos P2 (persistir IDs de habilidad no autorizados y carga eterna tras rechazo de red); ambos corregidos. Regresiones API cubren create/update inválido sin escritura parcial; UI monta llamadas rechazadas y valida estados de error.
- Verificación integrada posterior a esas correcciones: `pnpm exec turbo run test typecheck lint build --force` — 11/11 tareas PASS; contratos 29/29; API 91 aprobadas y 66 omitidas por falta de configuración de DB/servicios; web 140/140. El build mantiene advertencias conocidas de chunk >500 kB y directivas Lucide.
- Verificación integrada fresca en este checkout: `pnpm exec turbo run test typecheck lint build --force` — exit 0, 11/11 tareas Turbo; contratos 29/29, API 91 aprobadas y 66 omitidas por configuración ausente de DB/servicios, web 140/140. Warnings de build conocidos: chunk >500 kB y directivas `use client` de Lucide.
- Commits del slice: `631cd6550e3569d16aa79ec5f62da369dd960c6e` (`feat(f18b): agregar misiones de aula versionadas`), `b6eeac14daedc9ac996020504d92db882bedaf1a`, `fd0e2e12aefed46cba882ffca6924d4a4529b056` y `0309ca17f2ede2e7f365998ac6b492b0bfa67885` (`feat(f18b): integrar misiones con aula docente y estudiante`).

- Commits de ampliación: `37159dc` preview, `18af25127454bef80baf83a6c0d025e6185ea17c` CTA, `3d21f06623623dddcb53f38284d8e38c4e9ae858` asociación y contexto Mentor exactos.

## Límites y bloqueos

- Preflight seguro: `DATABASE_URL` ausente en el proceso; no se abrió conexión. No se aplicó migración ni se ejecutó persistencia PostgreSQL. La verificación solicitada de `current_database() = fragments_test` queda pendiente; no se contactó `fragments_prod`.
- No se usó Ego Lite ni se tomaron capturas. Falta QA visual/teclado en viewport disponible.
- No se ejecutó código de estudiantes, servicios AI, GitHub, Moodle ni destino de despliegue.
- El código está commit local en `3d21f06623623dddcb53f38284d8e38c4e9ae858`; PR #90 ya existe; la ampliación aún no se ha subido ni tiene CI actualizado o release.
- Los cambios F25 mergeados recientemente en `origin/main` (`c25f97a`) todavía no se han integrado en esta rama local.
- La migración no se aplicó: `DATABASE_URL` ausente. La persistencia de FK, autorización de asociación, digest/cache y consulta de la rúbrica exacta en PostgreSQL son NO COMPROBADAS hasta CI con DB efímera y preflight `current_database() = fragments_test`.
- No hubo QA Ego Lite ni sesiones docente/estudiante. No se contactó producción, proveedores IA, VPS, GitHub API, Moodle o despliegue.

## Resultado integrado y release v0.5.10 — 2026-11-22

- PR #90 mergeado normalmente a `main`, SHA `818b9c39acb739d272ae27ce234114b650ab3787`; CI `45032665876` SUCCESS. En el checkout: API 100 PASS/66 omitidas por falta de `DATABASE_URL`; web 145/145; contracts 29/29; typechecks y Prisma validate PASS. CI verificó la persistencia PostgreSQL; la consulta local de producción no se realizó.
- Se publicó la tag anotada `v0.5.10` apuntando al commit exacto `818b9c39acb739d272ae27ce234114b650ab3787`. Workflow F14 `45033466925`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; release publicado con bundles y manifiesto.
- El environment `fragments-production` se consultó de solo lectura: `reviewers_count=0`, `wait_timer=null`; reglas de ramas y gates técnicos preservados. No se editaron settings ni se saltó ningún gate.
- Apply reportado exitoso por agente F14: API/web en SHA `818b9c3`, backup íntegro SHA-256 `4c86afb2c3100166dcc3fb4dd48bc5fefcb098d1269f38fa3ef2e0d5d0c625f4`, contenedores saludables y `/health` con DB `ready`.
- Smoke Ego Lite read-only: docente autenticado abrió dashboard y aula (API 200). No había misiones publicadas; el trayecto misión→propuesta→Mentor queda NO COMPROBADO y no se crearon datos productivos. La vista admin de diagnósticos devolvió 403 al perfil docente; acceso con identidad admin queda NO COMPROBADO. Sesiones docente y estudiante se conservaron.

## Hotfix de contexto Mentor y rutas de misiones — 2026-11-22

- Revisión reflexiva de `v0.5.10` encontró truncamiento en `buildAssignmentMentorConfig`: se combinaban objetivos, habilidades obligatorias y F11 y luego se cortaba el array a 20. Las habilidades optativas ni siquiera llegaban al contexto. Una misión válida permitía 12 objetivos + 20 habilidades de cada tipo, además de hasta 20 requisitos F11.
- La prueba de regresión reprodujo el caso máximo y falló antes del fix (recibía 20 requisitos; faltaban los restantes). Se definió `MentorEvaluationConfigSchema` con límite 72 para el contexto efectivo, manteniendo `MentorControlConfigSchema`/publicación F11 limitado a 20. Se etiquetan habilidades requeridas y optativas.
- QA Ego Lite también detectó que la pantalla de detalle recibía `No se encontró la ruta de Classroom Studio` desde el API: `classroomHandler` tenía un catch-all antes de `assignmentHandler`, por lo que los endpoints `/api/teacher/classrooms/:id/assignments` nunca llegaban al handler propio.
- Prueba de enrutamiento añadida: reproduce el mensaje de catch-all antes del fix; luego del cambio de orden llega al repositorio de asignaciones (404 de aula inexistente con fixture, en lugar de NOT_FOUND de ruta). No escribe base de datos.
- `pnpm --filter @fragments/contracts build` — PASS; contracts 29/29; `mentor-context.test.ts`, `service.test.ts` y `proposal-context.test.ts` — 11/11 PASS; `app-routing.test.ts` — 1/1 PASS; API typecheck PASS.
- Verificación integrada fresca `pnpm exec turbo run test typecheck lint build --force` — exit 0, 11/11 tareas PASS; contracts 29/29; API 103 PASS/66 omitidas por falta local de `DATABASE_URL`; web suite pasó. Build web conserva warnings conocidos de chunk >500 kB y directivas Lucide.
- Captura Ego auténtica de QA read-only, recortada al mensaje de error y sin datos personales: `C:\Users\vgmil\ego\f22-v0510-qa-20261122\teacher-route-status.png`. El editor de misiones quedó NO COMPROBADO: el botón estaba deshabilitado porque no había habilidades activas. No se activaron habilidades ni se publicaron misiones.
- Estado de hotfix: PR #95 en `codex/f18b-preserve-mentor-criteria`, cabeza `71acd311a49f584fc39439e1d026c2a4e7279d6a`, CI `45037421525` SUCCESS. Pendiente merge protegido y nueva release F14 antes de comprobar el comportamiento corregido en producción. Las pruebas PostgreSQL locales permanecen NO COMPROBADAS por `DATABASE_URL` ausente; CI usa su base efímera.

## Hotfix integrado y validación de producción — 2026-11-22

- PR #95 integrado mediante merge protegido; el hotfix quedó en `main` y `origin/main` en `a3c189f041694ccf898f208de41a51c36ad41a04`. CI del PR `45037887441` SUCCESS. Verificación integrada local posterior: `pnpm exec turbo run test typecheck lint build --force` — 11/11 tareas PASS; contracts 29/29, API 103 PASS y 66 omitidas por no tener `DATABASE_URL`, suites y typechecks web/API PASS. CI cubrió PostgreSQL efímero.
- Tag anotada `v0.5.11` apunta al SHA exacto de `main`. Workflow F14 `45038131003`: `verify-build`, build ARM64, `attest-package` y `publish-approved-release` SUCCESS. No hubo espera de aprobación humana; environment observado con 0 required reviewers y los controles técnicos intactos.
- Smoke Ego Lite de solo lectura en las sesiones existentes: en el aula docente desapareció el falso banner `No se encontró la ruta de Classroom Studio` y se cargó la sección de Misiones; vista estudiantil mostró Mis aulas, matrícula activa y ausencia de misiones publicadas. No se cerraron sesiones ni se escribieron datos.
- El editor/creación/publicación de misión queda **NO COMPROBADO**: el CTA estaba deshabilitado porque el aula no tenía habilidad activa. No se habilitó una habilidad ni se escribió en el aula productiva. El recorrido misión→propuesta→evaluación Mentor, incluida persistencia PostgreSQL real de ese flujo, también permanece **NO COMPROBADO**.
- Endpoint público `/health` reportó `status=ok`, `database=ready`; el bundle público contiene versión `v0.5.11` y SHA `a3c189f041694ccf898f208de41a51c36ad41a04`.
- Ledger del host, SHA del backup previo y labels de imagen en Docker quedan **NO COMPROBADOS**: la sesión no dispone de una fuente administrativa autorizada de solo lectura para esos datos. No se intentó SSH ni se alteró producción.
