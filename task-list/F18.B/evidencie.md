# Evidencia F18.B

## Regresión de continuidad misión → Mentor — 2026-11-22

- Se añadió `apps/api/src/features/assignments/academic-flow.integration.test.ts`: PostgreSQL fixture con IDs UUID, preflight obligatorio `current_database() = fragments_test` y cleanup limitado a sus propios registros.
- El recorrido de repositorio comprueba publicar misión v1 con habilidad requerida, visibilidad a matrícula activa, crear/recuperar propuesta ligada al ID inmutable de v1, publicar v2 con habilidades requerida y optativa, y conservar snapshot/contexto de v1 para evaluación Mentor a nivel servicio etiquetada `fake/local-heuristic-v1`. No simula ni declara comprobadas las autorizaciones de endpoints HTTP.
- Revisión reflexiva detectó y corrigió que v2 debía conservar al menos una habilidad requerida; la fixture ahora prueba categorías requeridas/optativas distintas. La URL debe apuntar a localhost y a `fragments_test` antes de conectar; `current_database()` se valida antes de escrituras. La limpieza queda protegida con `finally`.
- Verificación local: `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 1 prueba omitida porque `DATABASE_URL` no está configurada. No se abrió conexión; integración PostgreSQL queda **NO COMPROBADA localmente**, pendiente de CI efímero.
- Verificación local: `pnpm --filter @fragments/api typecheck` — PASS; `git diff --check` — PASS.
- Commits con slice, corrección de fixture y evidencia: `2bdcb5268ad8532c43077f63c1503bdd2277d1ac`, `26e323342df4490b4158a45000b8ba2f5257b6f5`, `d53e48ebb8f6967ee6c31c8f6999c50625672c3b`. CI PR #101 run `45045147138` SUCCESS (tests, typecheck, lint y build con PostgreSQL efímero); revisión independiente final pendiente.
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

## Seguimiento HTTP autenticado misión→propuesta→Mentor — 2026-11-22

- Referencias auditadas: `origin/main` en `b9eabda7d60360e437285a7907af0dce4b883a65` (PR #101) y página Notion F18 actualizada el 2026-11-22. Notion confirma que PR #101 cubre repositorio/servicio con provider fake y CI `45045147138` PASS, pero no cubre endpoints HTTP; el trayecto productivo continúa NO COMPROBADO porque no hay misión publicada/skill QA activa.
- Se añadió en `apps/api/src/features/assignments/academic-flow.integration.test.ts` una prueba HTTP PostgreSQL con identidades `fixture-*` y `fake/local-heuristic-v1`: docente autentica, crea/publica misión; estudiante sin matrícula recibe 404; estudiante matriculado lee la misión y crea borrador ligado al `assignmentVersionId`; docente publica v2; el borrador conserva contexto v1 y Mentor evalúa por HTTP usando contexto v1. La prueba conserva el preflight local que exige URL `localhost` y `current_database() = fragments_test`.
- `pnpm --filter @fragments/api exec prisma generate` — PASS, cliente 7.10.1 generado desde el schema; no establece conexión.
- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts` — 1 archivo y 2 tests omitidos tras generar el cliente porque `DATABASE_URL` no está configurada en el proceso. No se realizó conexión ni migración.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/http.test.ts src/features/assignments/mentor-context.test.ts src/features/mentor/service.test.ts` — PASS, 3 archivos / 13 tests.
- `pnpm --filter @fragments/api typecheck` y `git diff --check` — PASS.
- Bloqueo concreto: el proceso no dispone de `DATABASE_URL`; por lo tanto no se puede confirmar `fragments_test`, ejecutar la integración HTTP contra PostgreSQL ni completar preflight/migración local. Ningún endpoint ni base de producción fue contactado; no se usaron sesiones Ego Lite.
- Commit del seguimiento HTTP: `f9b2c4456badb7c08770013e52e0ab57c55d792b` (`test(f18b): cover authenticated mentor HTTP mission flow`).

## Incremento UI estudiantil — contexto académico de misión — 2026-11-22

- En `apps/web/src/features/assignments/AssignmentsPanel.tsx`, cada misión estudiante incluye un disclosure nativo, cerrado inicialmente, con tema, consigna contextual, nivel esperado y requisitos del snapshot Mentor F11 ligado a esa versión. El CTA conserva el `StudentAssignment` exacto; no se exponen criterios/pesos ni se cambia la rúbrica.
- TDD verificó contenido, versión, apertura con teclado/nativo y omisión de criterios privados. Verificación del PR: `pnpm --filter @fragments/web test` — 154/154 PASS; typecheck y `git diff --check` PASS. QA visual Ego Lite sigue NO COMPROBADO.
- PR #106 integrado normalmente en `main` como `7d4802c73bff58e8a58920b3f8213ac35e0e8490`; head `eb1ba79c74dbaea66500dad3ec927fc92a18b0ec`, CI `45050161446` SUCCESS, revisión independiente PASS.
- No se tocaron contratos, API, esquema/migraciones, producción ni recursos de aula. No se usaron sesiones Ego Lite durante el PR.

## Integración y observación productiva read-only — 2026-11-22
## Integración y observación productiva read-only — 2026-11-22

- PR #104 integrado normalmente en `main` como `3911d401326027898991cde4ad1b8fbd5ed6444a`; CI final `45047900668` PASS y revisión independiente PASS. El CI inicial/post-merge ejecutó schema y suite completa contra PostgreSQL disposable; los dos casos nuevos pasaron allí. Localmente se omitieron al no haber `DATABASE_URL`.
- En la prueba HTTP, auth fixture confirma anónimo 401, otro docente 404 y alumno sin matrícula 404. Con matrícula activa crea y recupera borrador ligado a misión v1; publicar v2 no cambia el snapshot que Mentor fake recibe. Esto no prueba Better Auth real ni provider IA real.
- Ego Lite read-only en producción v0.5.13: aula `Programación Móvil`, período `2026 - 2027`, contexto acordado y matrícula activa; no hay habilidades habilitadas ni misiones publicadas. La UI bloquea crear una misión hasta activar una habilidad. El portal estudiantil refleja matrícula activa, sin skills ni misiones. No se cambió ni guardó ningún recurso y ambas páginas quedaron abiertas.
- Pendiente para recorrido visual/UI funcional con datos QA: habilidad y misión sintéticas en `fragments_test`, cuando exista un acceso permitido. Flujo de evaluación en producción, Better Auth real y puntuación IA continúan **NO COMPROBADOS**.

## Release v0.5.14 — UI de contexto académico — 2026-11-22

- El release F14 `v0.5.14`, run `45052895014`, está aplicado: bundle `/assets/index-C8xxczOG.js` confirma SHA `d40817ad2e62d1d9971fccbef5b878543307f9e9` e incluye el código de PR #106 (merge `7d4802c`, CI `45050161446` PASS, revisión independiente PASS).
- Las sesiones Ego Lite docente y estudiante permanecieron abiertas. No se navegó ni se modificó ningún recurso durante el release.
- Estado funcional conocido sin cambios: el aula productiva no tiene habilidades habilitadas ni misiones publicadas; por ello el recorrido misión→propuesta→Mentor no se puede validar con esos datos. Better Auth real, evaluación/provider IA y flujo completo quedan NO COMPROBADOS. Se requiere QA sintética permitida en `fragments_test`.

## Spot check independiente Ego Lite v0.5.14 — 2026-11-22

- El revisor independiente observó las sesiones existentes de estudiante y docente, ambas devueltas abiertas; versión `v0.5.14`, commit `d40817a`. No cerró pestañas ni cambió o guardó recursos.
- Estudiante: matrícula activa en `Programación Móvil`, ninguna habilidad autorizada y ninguna misión publicada; la vista indica “Tu docente aún no ha publicado misiones en esta aula.”
- Docente: ninguna habilidad habilitada, sin misiones y CTA “Crear misión” deshabilitado. Esto coincide con la restricción de requisito previo de habilidad.
- El disclosure de contexto académico de una misión queda NO COMPROBADO porque exigiría habilitar una habilidad o publicar recursos en producción. No se tomó captura: la vista mostraba datos personales. QA de datos sintéticos en `fragments_test`, Better Auth real y evaluación IA real siguen pendientes.

## Recorrido F18.B en PostgreSQL disposable — 2026-11-22

- Se creó un contenedor PostgreSQL temporal local, ligado solo a `127.0.0.1`, sin volumen persistente; se confirmó que existe únicamente `fragments_test` y se aplicaron ahí las cinco migraciones vigentes. La integración vuelve a verificar la base y URL local antes de crear fixtures.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 2/2 PASS. Ejercita HTTP con auth fixture, misión v1, rechazo anónimo/ajeno/sin matrícula, matrícula activa, borrador vinculado a snapshot, publicación v2 y Mentor fake conservando contexto de v1.
- `pnpm --filter @fragments/web exec vitest run src/features/assignments/AssignmentsPanel.test.tsx --maxWorkers=1` — 3/3 PASS. Comprueba disclosure cerrado/abrible, contexto/versión, exclusión de criterios/pesos y entrega del snapshot exacto.
- La base temporal fue detenida y eliminada; no se modificó el test DB compartido, producción ni sesiones Ego Lite. Esto no verifica Better Auth ni IA reales. El disclosure en sesión productiva no puede comprobarse mientras no haya una misión habilitada; no se escribieron recursos productivos.

## Incremento UI docente — acceso al catálogo — 2026-11-22

- `apps/web/src/features/classroom/ClassroomStudio.tsx`: el estado sin habilidades mantiene el aviso existente y suma el enlace visible “Ir al catálogo de habilidades” a `/teacher/skills`, usando el callback de navegación establecido.
- `apps/web/src/features/classroom/ClassroomStudio.test.tsx`: la regresión renderiza un aula fixture sin habilidades, comprueba aviso y `href`, y activa el enlace para confirmar la navegación.
- TDD: la prueba nueva falló antes del cambio porque no encontró el enlace; tras implementarlo, `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx --maxWorkers=1` — PASS, 4/4.
- `pnpm --filter @fragments/web typecheck` — PASS.
- Se leyó `vercel-react-best-practices`; se aplicó enlace semántico accesible y la navegación existente. Sin navegador ni producción, acorde al alcance indicado.
- Sin cambios a contratos, rutas compartidas/App.tsx, schema, migraciones, APIs, servicios o datos reales.
- Commit de implementación: `a69f563c93833358f6688b0b1bc45f73b0438e41`. Sin push ni despliegue.

## Continuidad — catálogo con habilidades archivadas — 2026-11-22

- Cuando no hay habilidades activas, el enlace aparece tanto si el aula está vacía como si conserva solo habilidades archivadas. Las filas archivadas y su mensaje de referencias conservadas permanecen visibles.
- Prueba nueva: `ClassroomStudio` renderiza una habilidad fixture archivada, confirma su nombre y nota, y comprueba el enlace contextual. La prueba falló antes del ajuste porque faltaba el enlace.
- Verificación fresca: `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx --maxWorkers=1` — PASS, 5/5; `pnpm --filter @fragments/web typecheck` — PASS; `git diff --check` — PASS.
- Commit incremental: `72cd2a52d4a124f01b5ede499ebfa21f49955955`. Sin push ni cambios fuera del alcance.

## PR #116 y post-release Ego Lite v0.5.16 — 2026-11-22

- PR #116 se integró normalmente en `main` como `23528bccfb256dabaa3d6317a36138ad6f0edbd6`; CI `45060350800` SUCCESS. Revisión independiente PASS. El caso adicional de solo habilidades archivadas está cubierto.
- F14 `v0.5.16`, run `45060644194`, se aplicó según bundle público `/assets/index-B5aKBWSl.js`; footer Ego Lite confirmó `v0.5.16 · 23528bc`, `/health` `database=ready`.
- Ego Lite docente: el detalle real de Programación Móvil mostró cero habilidades activas y el enlace contextual “Ir al catálogo de habilidades”. La navegación abrió `/teacher/skills` y mostró el formulario; regresé el navegador al mismo detalle. Sin creación/guardado.
- Ego Lite estudiante: matrícula activa de Programación Móvil visible, sin habilidades autorizadas ni misiones publicadas. Las páginas docente y estudiante quedaron abiertas; no se alteró ninguna sesión o dato.
- Resultado real limitado: link y navegación docente PASS; inscripción/estados estudiantiles presentes. Crear habilidad, habilitarla, publicar misión, propuesta, Mentor y provider IA permanecen NO COMPROBADOS; no se escribieron datos productivos. Las pruebas existentes son HTTP/UI con fixtures/fake y PostgreSQL disposable.

## Incremento UI docente — inspección de snapshots publicados — 2026-11-22

- `apps/web/src/features/assignments/AssignmentsPanel.tsx` añade un disclosure “Revisar versiones publicadas” en cada misión con historial. Cada versión muestra título, consigna, objetivos, habilidades obligatorias y optativas snapshot y `mentorContextVersion`; inicia cerrado y no ofrece controles de edición.
- La prueba `AssignmentsPanel.test.tsx` cubre dos snapshots con distinto contexto y habilidades; TDD falló antes por ausencia del disclosure y pasó tras el cambio. Verificación: prueba focal 4/4 PASS, `pnpm --filter @fragments/web typecheck` PASS y `git diff --check` PASS.
- Revisión independiente PASS: confirmó fuente `ClassroomAssignment.versions`, solo snapshots publicados en orden ascendente y disclosure sin edición. No repitió pruebas ni typecheck; interacción/teclado no se ejercitaron y se apoyan en el elemento nativo `<details>`.
- Commits de implementación y evidencia: `6b92166929c027a00d88821bf84ee81fa21dd030`, `6de99611ef6d68aa82ce5b20f4122b7525f0483e`, `f524ba669332ec1c188a01461931963aee2f6cfb`.
- No cambia contratos, rutas compartidas, API, schema, migraciones ni datos. QA visual y verificación productiva del historial siguen NO COMPROBADOS; sesiones Ego Lite docente y estudiante quedan abiertas.

## Snapshot de misión y release v0.5.18 — 2026-11-22

- PR #119 merge `45d80c8b122da53039c2ef891ce03cf30e4b1759`, CI `45064333176` PASS: UI docente expone historial cerrado de snapshots publicados; prueba UI 4/4, typecheck/diff-check PASS y revisión independiente PASS. Solo lectura, sin edición.
- F14 `v0.5.18` run `45068388150` SUCCESS y aplicación automática verificada en SHA `214fb1344816172ecc52c99de5e7351508d77324`; health DB ready. No hubo cambio de F18 en esa release.
- No hay misiones ni habilidades activas en el aula de QA productiva. El historial con datos, publicar misión, iniciar propuesta y completar el contexto de Mentor siguen NO COMPROBADOS. No se escribieron datos productivos; páginas/sesiones Ego Lite permanecen abiertas.

## PR #119 — integración normal

- PR #119 se integró normalmente en `main` como `45d80c8b122da53039c2ef891ce03cf30e4b1759`; CI `45064333176` SUCCESS.
- El historial docente queda integrado en main. Al momento de integrar PR #119, F14 v0.5.17 y el reflejo productivo estaban pendientes. F14 v0.5.18 fue aplicada posteriormente; la inspección visual del historial con una misión real sigue NO COMPROBADA. No se modificaron recursos académicos.

## Incremento UI estudiantil — reintento por aula y recurso — 2026-11-22

- `apps/web/src/features/student/StudentClassroomsScreen.tsx`: separa el estado/carga de habilidades y misiones, ofrece un retry local junto a cada error por aula y anuncia carga durante el reintento. Un `useRef` con clave aula+recurso evita duplicar solicitudes simultáneas; al reintentar no se refresca `onRefresh` ni se vuelve a pedir el recurso hermano.
- `apps/web/src/features/student/StudentClassroomsScreen.test.tsx`: cubre fallo→éxito de misiones y habilidades, que el recurso hermano se solicite una sola vez y que clicks duplicados simultáneos por recurso no creen requests adicionales. Comprueba los estados alert/status y contenido vacío tras éxito.
- TDD: las tres pruebas nuevas fallaron antes del cambio porque faltaban botones de reintento; tras el cambio, `pnpm --filter @fragments/web exec vitest run src/features/student/StudentClassroomsScreen.test.tsx --maxWorkers=1` — PASS, 6/6.
- Suite focal web: `pnpm --filter @fragments/web exec vitest run src/features/student/StudentClassroomsScreen.test.tsx src/features/assignments/AssignmentsPanel.test.tsx src/features/classroom/ClassroomStudio.test.tsx --maxWorkers=1` — PASS, 15/15. `pnpm --filter @fragments/web typecheck` — PASS; `git diff --check` — PASS.
- El commit inicial no cambió contratos, API, migraciones, datos productivos ni sesiones; no se realizó navegador ni release en ese momento.
- Commit de implementación: `d72fa6111c9418e18fbea5d7e8923634c421986c`.

## Sincronización con main para PR #126 — 2026-11-22

- Se confirmó worktree limpio en `codex/f18b-classroom-retry`; `HEAD` era ancestro de `origin/main`, por lo que se integró `origin/main` (`8e72af9133abedecc927cbda3723466398d8913b`) con merge normal, sin rebase/reset/force.
- El conflicto de esta evidencia se resolvió conservando el historial completo del snapshot/release F14 v0.5.18 y el apartado de reintentos F18. Se preservaron los demás cambios de documentación/TASKS que llegaron desde main.
- Commit de merge y resolución: `93a57648f53fb286f5d858eb647b1e2456bbc89f`.
- Verificación fresca post-merge: suite focal web 15/15; `pnpm --filter @fragments/web typecheck` PASS; `git diff --cached --check` PASS.
- PR #126 se actualizó con push normal y CI final `45071108105` SUCCESS; merge normal `af8e6b4764b58ffa299ef7f1b85dfd674318c6ee`.

## PR #126 y release F14 v0.5.19 — 2026-11-22

- PR #126 implementa en Mis aulas reintento independiente por aula para errores de habilidades y misiones. Código `d72fa6111c9418e18fbea5d7e8923634c421986c`; CI final `45071108105` PASS, suite focal 15/15, typecheck y diff-check PASS. Revisión independiente PASS (head `d4c6c3b`; el commit posterior solo actualizó `TASKS.md`). Main merge `af8e6b4764b58ffa299ef7f1b85dfd674318c6ee`.
- F14 `v0.5.19`, run `45071360770`, aplicada por timer/agente normal. SSH read-only confirma web/API healthy en SHA exacto; `/health` ok/DB ready; bundle público `index-BgnTqOr6.js` confirma versión/SHA y ambos botones retry.
- El PR no toca contratos, rutas compartidas, API, esquema ni migraciones. No hubo escrituras productivas. En producción no se provocó una falla para ejercitar retry; ese recorrido sigue NO COMPROBADO en navegador. La misión real e historial de contexto tampoco pueden validarse porque el aula QA no tiene misiones/habilidades.

## Continuidad UI — asociación segura de misión en Mentor — 2026-11-22

- La prueba de composición `apps/web/src/App.student-flow.test.tsx` inicia desde misión v1, comprueba contexto F11 snapshot v7 y guarda con el `assignmentVersionId` exacto. También recorre Mis entregas → Abrir Mentor y Review → Volver a Mentor y comprueba contexto general v2, sin asociar los borradores nuevos al ID de misión anterior.
- Se encontró y corrigió estado stale en la navegación, en “Abrir Mentor” desde Mis entregas y en el retorno desde Review. `App.tsx` conserva el snapshot solo en la transición explícita iniciada desde la misión.
- Verificación fresca tras ampliar rutas: `pnpm exec vitest run src/App.student-flow.test.tsx` PASS 1/1; `pnpm --filter @fragments/web test` PASS 181/181; `pnpm --filter @fragments/web typecheck` PASS; `git diff --check` PASS.
- Los APIs se simulan en esta prueba. No se comprobó persistencia remota ni producción; la integración real HTTP/PostgreSQL y Mentor fake previa sigue en sus evidencias anteriores. Sin cambio de contratos, rutas de servidor, esquema, migraciones o datos.
- Commits de implementación/prueba: `41a32456c65f56267f903285ec67c15cc8c52f7` y follow-up del hallazgo independiente `3435c8365a7e2f0a0ba4e2cb9d8671cfff05e538`.
- Revisión independiente del head `7c82e0f` PASS: las rutas Mis entregas→Abrir Mentor y Review→volver prueban contexto general v2 sin `assignmentVersionId` anterior. Señaló que Projects→Continuar mantiene el valor solo en memoria para una propuesta existente; la pantalla usa `onUpdate` y el revisor no encontró asociación stale a borrador nuevo.
- PR #128 integrado normalmente como `1041d1af3f949a13671d761ee96a59c52d2a1d78`; CI final `45074239987` SUCCESS. Revisión independiente del head `7c82e0f` PASS.
- F14 `v0.5.20` tag object `67483ab021a0b30970ec7ba5a4b1892e0e088a37`, SHA `1041d1af3f949a13671d761ee96a59c52d2a1d78`, run `45074528240` SUCCESS en los tres jobs y aplicación automática confirmada. `/health` ok/DB ready; bundle `/assets/index-DQ4oYmnp.js` confirma versión y SHA.
- La asociación de misión se validó con APIs fake. El aula QA productiva sigue sin habilidades/misiones; persistencia remota del borrador, flujo completo con datos académicos reales y calidad de evaluación IA continúan NO COMPROBADOS. Sin escrituras productivas.
- Commit de reconciliación F14/F18.B: `303f2c824670d2bc1100f305a08bde4507b5f876`; integrado mediante PR documental #129 como `f324469c5959c368c920e9c0c24bf12fca60f6a7`, CI `45075978694` SUCCESS.
- Estado de integración registrado en `beedba8acaf86e62ccd9fd2d8c9326dc327544c2`.

## Incremento UI estudiantil — identificación de versión de misión — 2026-11-22

- `apps/web/src/features/assignments/AssignmentsPanel.tsx` añade en cada tarjeta estudiantil la etiqueta visible `Misión publicada vN · Contexto Mentor vM`, con `version` y `mentorContextVersion` del mismo `StudentAssignment`, antes del disclosure y el CTA.
- La prueba existente `AssignmentsPanel.test.tsx` comprueba la etiqueta fuera del disclosure cerrado y mantiene la comprobación de que el CTA entrega el objeto completo, con el ID de versión, callback.
- TDD: la prueba falló antes del cambio porque no aparecía la etiqueta. Suite focal web `pnpm --filter @fragments/web exec vitest run src/features/student/StudentClassroomsScreen.test.tsx src/features/assignments/AssignmentsPanel.test.tsx src/features/classroom/ClassroomStudio.test.tsx --maxWorkers=1` — PASS, 15/15; `pnpm --filter @fragments/web typecheck` — PASS; `git diff --check` — PASS.
- Fuente de datos: `StudentAssignment` ya contiene ambos números versionados. Sin cambios a contratos, API, rutas, esquema/migraciones, datos productivos o sesiones. No se usó navegador ni se hizo release.
- Commit de implementación: `c8e222b2d65e77497566e76afa551e51ae3e3c6a`.
- PR #133 abierto contra `main` (`codex/f18b-student-mission-version`), head de código `e1caa2545d495860faa9d4526fcd7edbcd6cba34`; CI `verify` run `45081014837` SUCCESS. La actualización documental del PR queda en un commit separado, sin cambios de código.

## Aplicación F18.B v0.5.23 y comprobación Ego Lite · 2026-11-22

- PR #133 integrada normalmente en `main` como `411747c5ad55e630d2bb572f2ba71d1d96aba97b`; CI `45081295834` SUCCESS y revisión independiente PASS. Tag anotada `v0.5.23` en el SHA exacto; F14 `45081907608` terminó SUCCESS en verify-build, attest-package y publish-approved-release.
- Aplicación por el mecanismo pull normal: API/web healthy en imagen `sha-411747c5...`; `/health` status ok/database ready. Bundle cache-bypass `/assets/index-NaEOWqTZ.js` contiene v0.5.23, SHA exacto y la etiqueta de versiones.
- Ego Lite: perfil estudiante y TaskSpace existentes permanecieron abiertos. `/student/classrooms` muestra Programación Móvil sin misiones publicadas y 0 tarjetas. La etiqueta y su posición fuera del disclosure quedan NO COMPROBADAS porque no hubo una tarjeta que observar. No se guardó ni alteró nada.
- El recorrido misión→propuesta→Mentor sobre recursos reales y calidad IA siguen NO COMPROBADOS; no se crearon habilidades ni misiones productivas.

## Revalidación del recorrido académico en PostgreSQL desechable · 2026-11-22

- Sobre `fcfe599185dcc4700577159552c8206ac5a08075` se levantó un contenedor PostgreSQL 18.6 temporal, sin volumen y publicado únicamente en `127.0.0.1:55444`. Se aplicaron las cinco migraciones vigentes solo en la base `fragments_test`; `current_database()` confirmó ese nombre antes de ejecutar el test.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 2/2 PASS. Recorrió HTTP: acceso anónimo y docente ajeno denegados, misión v1 publicada, estudiante sin matrícula denegado, matrícula activa y misión visible, draft ligado a `assignmentVersionId`, publicación docente v2 y recuperación/evaluación Mentor fake con snapshot/contexto v1 preservados.
- La prueba usa auth fixture y `fake/local-heuristic-v1`; confirma integración de rutas/repositorios/PostgreSQL, no Better Auth ni proveedor IA reales. El contenedor temporal se detuvo y eliminó sin volumen persistente.
- **NO COMPROBADO:** UI con misión activa en Ego Lite, persistencia en producción, Better Auth real y calidad de puntuación IA real. La vista Ego Lite sigue mostrando un aula sin misiones, por lo que el label visual permanece NO COMPROBADO.

## Aserción exacta de versión de contexto en evaluación HTTP · 2026-11-22

- Revisión independiente recomendó reemplazar la aserción `expect.any(Number)` de la evaluación Mentor por la versión exacta fijada en el contexto del borrador. Añadí esa comparación en `academic-flow.integration.test.ts`; tras publicar v2, la respuesta de evaluación debe seguir reportando el contexto Mentor v1 asociado al borrador.
- PostgreSQL 18.6 desechable, enlazado solo a `127.0.0.1:55444`; `current_database()` fue comprobado por el test y se aplicaron las cinco migraciones vigentes en `fragments_test`.
- Comando `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 2/2 PASS; `git diff --check` — PASS. El contenedor temporal se detuvo y eliminó; F23 y UX08 quedaron activos.
- Commit de test: `b06f5e2`. CI run `45084702142` SUCCESS; revisión independiente PASS; PR #138 integrado normalmente como `bc6aaf9487b0710a41e101dfd69bcec5b9433eca`.
- El test usa HTTP local, auth fixture y Mentor fake. No prueba Better Auth real, proveedor IA real, UI de misión activa ni datos de producción.

## Ego Lite · estado de las aulas sin escritura · 2026-11-22

- Se conservaron abiertas las sesiones y pestañas Estudiante (TaskSpace 46) y Fragments-Docente (TaskSpace 44). Los dashboards y accesos a aulas cargaron sin errores de acceso.
- Estudiante: Programación Móvil · 2026–2027 muestra matrícula activa y no tiene misiones publicadas. Docente: el dashboard y detalle del aula cargan; se ven las secciones Habilidades y Misiones; “Crear misión” está deshabilitado porque no hay habilidades activas. No se guardaron cambios.
- El label de versión con una tarjeta real y el recorrido misión→propuesta→Mentor siguen NO COMPROBADOS porque no existe misión publicada. La pestaña original del estudiante que dejó de responder se conservó; la lectura se completó en una pestaña nueva del mismo TaskSpace.

## Continuidad UI — propuestas guardadas con contexto de misión

- PR #141 añade en cada propuesta guardada un marcador de misión vinculada, tema y versión de contexto Mentor. La UI no expone criterios ni rúbrica.
- Prueba actualizada: 27/27 PASS, typecheck PASS, CI `45089888475` SUCCESS y revisión independiente PASS. Merge normal `073819c31881fd1ae3513bf72a7afe322e5051e6`.
- Release anotada `v0.5.24` en ese SHA; F14 run `45090388470` SUCCESS. Aplicador normal terminó SUCCESS a 00:54 UTC; API/web healthy en imagen `sha-073819c31881fd1ae3513bf72a7afe322e5051e6`. Salud pública `/health`: `ok`, database `ready`; bundle `/assets/index-C_-XL4FG.js` contiene `v0.5.24` y SHA exacto.
- NO COMPROBADO: visualización del indicador con una misión productiva activa y evaluación IA real. Ego Lite muestra aula matriculada sin misión/habilidades activas; no se escribieron datos.

## Accesibilidad de acciones en propuestas guardadas · 2026-11-23

- PR #143 corrige nombres accesibles idénticos en acciones «Abrir propuesta». El lector de pantalla identifica la acción y el título, usando «Borrador sin título» cuando corresponde; no cambia el callback ni la identidad usada para recuperar.
- Regresión TDD fallaba antes del cambio; prueba focal 28/28, typecheck y diff-check PASS. CI `45092564145` SUCCESS, revisión independiente PASS; merge normal `52917ec6fcba790f487a7d2f9807c3c52927400d`.
- Release anotada `v0.5.25` sobre el SHA exacto; F14 run `45092884337` SUCCESS en los tres jobs. Aplicación automática verificada: API/web healthy en SHA exacto, `/health` público `ok/ready`, bundle `/assets/index-Iviv3wW8.js` confirma versión y SHA.
- Ego Lite conserva sesiones abiertas en v0.5.23; propuesta visible no está ligada a misión/contexto. Render con datos enlazados sigue NO COMPROBADO; no hubo escrituras académicas.

## Recuperación accesible desde Mis proyectos · v0.5.26 · 2026-11-23

- La observación de Ego Lite identificó que en «Mis proyectos» el botón «Continuar» no distinguía las propuestas. PR #146 añade el título o el fallback «Borrador sin título» al nombre accesible sin alterar la propuesta seleccionada ni su callback.
- La regresión de composición renderiza la App real en `/student/projects`, verifica nombre/fallback, pulsa «Continuar» y comprueba navegación a Mentor con la misma propuesta y `restoreEvaluation=true`. MentorScreen se simula solo como límite de props; su recuperación interna sigue cubierta por pruebas propias.
- Prueba focal 2/2 PASS; `pnpm --filter @fragments/web typecheck` y `git diff --check` PASS; CI `45095304380` SUCCESS y revisión independiente PASS sobre head `437bdc30398e09da9921960af0dc4e9ec8b2c29f`. PR integrada mediante merge normal en `1aa0690fa2573d18cd2fa46c2a5780833e523bb5`.
- F14 tag anotada `v0.5.26` en el SHA exacto; run `45095642953` completó `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. El sondeo/aplicador normal terminó con `Result=success`; verificación pública: `/health` `ok/ready`, bundle `/assets/index-CyC9Ismb.js` incluye `v0.5.26` y SHA completo exacto.
- Ego Lite posterior al despliegue confirmó `v0.5.26`: el botón único anuncia «Continuar propuesta:» con el título y navega a Mentor mostrando la misma propuesta. La pestaña nueva y las sesiones existentes quedaron abiertas; no hubo escrituras.
- Al continuar, Mentor intentó GET `/api/proposals/:proposalId/review` y recibió 404 porque no existe evaluación persistida para la propuesta. Esto confirma el intento de restauración, no la recuperación de un resultado.
- **NO COMPROBADO:** recuperación de evaluación persistida, handoff con una misión vinculada, identidad cruzada y calidad de puntuación IA. El test de App comprueba `restoreEvaluation=true` en el límite de Mentor simulado; no sustituye una recuperación evaluativa end-to-end en Ego Lite.

## Hotfix — congelar asunto del aula en versiones de misión · 2026-11-23

- Hallazgo: `classroom.subject` se puede editar después de publicar una misión y se usaba al reconstruir `mentorContext` tanto para estudiante/propuesta recuperada como para evaluar. Así, una misión y propuesta v1 podían cambiar de asignatura sin cambiar su versión publicada.
- TDD: la prueba focal de `mentor-context.test.ts` falló antes del fix: esperaba el asunto `Programación móvil` del snapshot y recibió `Asignatura editada después de publicar`.
- Fix F18.B: la publicación captura el asunto de aula en un campo interno del snapshot JSON; el compositor usa ese valor fijado para las lecturas y evaluación Mentor. Los DTO docente/estudiante retiran el campo interno y no cambia ningún contrato ni migración.
- Pruebas: `pnpm --filter @fragments/api exec vitest run src/features/assignments/mentor-context.test.ts src/features/assignments/repository.test.ts --maxWorkers=1` — 9/9 PASS; `pnpm --filter @fragments/api typecheck` — PASS.
- Integración HTTP PostgreSQL: contenedor PostgreSQL 18.6 efímero, sin volumen, publicado solo en `127.0.0.1:55445`; `current_database()` se comprobó como `fragments_test`; se desplegaron las cinco migraciones vigentes. `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 3/3 PASS. La prueba edita el asunto después de publicar v2 y verifica el asunto original en el listado estudiantil, propuesta recuperada y evaluación HTTP del snapshot v1. El contenedor se detuvo y eliminó.
- `git diff --check` — PASS. Sin producción, proveedores pagados ni sesiones Ego Lite.
- Límite legacy: snapshots publicados antes de este cambio no contienen el asunto histórico y mantienen el fallback al asunto actual; no existe evidencia suficiente para reconstruir su valor original sin una fuente histórica o una migración/backfill con datos confiables.
- Commit de implementación local `49e1a7ad41b5b38e96a7e3ff3bc58ff4a465752c` en `codex/f18b-proposal-recovery-evidence`; sin push.

## Merge y validación funcional local · v0.5.30 · 2026-11-23

- PR #154 `fix(F18.B): conserva la asignatura en el snapshot de misión` se integró mediante merge normal en `863dd4fde725a038fd2a181f985d504bc0a8ad83`; CI run `45113979791` SUCCESS. F14 publicó y aplicó `v0.5.30` sobre el SHA exacto; ver `task-list/F14/evidencie.md`.
- Ego Lite QA local sintética en TaskSpaces preservados 44 (docente) y 46 (estudiante): docente creó y publicó misión v1 con habilidad requerida; estudiante vio «Misión publicada v1 · Contexto Mentor v1», abrió Mentor, guardó una propuesta ficticia y tras recargar la recuperó. GET local verificó `assignmentVersionId`, contexto v1, tema y habilidad requerida. No se cerraron pestañas existentes.
- Sin evaluación IA ni llamadas pagadas, sin escrituras productivas. Prueba unitaria/regresión 9/9, integración HTTP/PostgreSQL efímera `fragments_test` 3/3, API typecheck y `git diff --check` PASS.
- Los snapshots publicados antes del fix no conservan asunto histórico; usan el fallback al asunto actual y no se puede reconstruir el pasado sin una fuente confiable. Evaluación IA real, datos de misión en producción e identidad cruzada siguen NO COMPROBADOS.
# Habilidades requeridas del snapshot en Mentor · 2026-11-23

- TDD: añadí primero pruebas para inicio de misión, recuperación con contexto fijado, fallback de Mentor general y separación de selección opcional. Las pruebas de composición/UI fallaron inicialmente porque la lista requerida no llegaba a Mentor.
- Implementación: `App` pasa los nombres de `selectedAssignment.requiredSkills`; al recuperar, deriva solo los requisitos con prefijo exacto `Habilidad requerida: ` cuando `assignmentContext.assignmentVersionId` coincide con el de la propuesta. `MentorScreen` los presenta como lista de referencia, separada de la selección editable del catálogo.
- Prueba focal: `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx src/features/mentor/mentor-screen.test.tsx --maxWorkers=1` — 2 archivos, 33 pruebas PASS.
- `pnpm --filter @fragments/web typecheck` — PASS. `git diff --check` — PASS.
- Sin API/contratos, backend, evaluación ni datos productivos. QA Ego Lite con autenticación sintética local en `127.0.0.1:5174`: misión v1/Contexto v1 muestra la habilidad requerida fijada/read-only, 1 requerida y 0 controles; `Quiero reforzar` aparece separado; Mentor general muestra “Sin asignación”. No se guardó ni evaluó. Sesiones conservadas.
- Límite: el contexto recuperado expone requisitos como texto, no como un campo estructurado de habilidades. La extracción requiere el prefijo exacto y la coincidencia de versión; no se valida IA ni recorrido remoto.
- Commit de implementación: `0e47317` en `codex/f18b-required-mission-skills`.

## Regresión por contexto vinculado a otra versión · 2026-11-23

- Añadí una prueba de composición para propuesta ligada a `mission-v1` cuyo `assignmentContext` apunta a `mission-v2`; Mentor no debe mostrar habilidades de ese contexto obsoleto.
- Mutación de control: al retirar temporalmente la comparación de `assignmentVersionId`, la prueba falla y muestra `No debe mostrarse`; restaurado el guard, la regresión pasa.
- Suite focal `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx src/features/mentor/mentor-screen.test.tsx --maxWorkers=1` — 2 archivos, 34/34 PASS. Typecheck y `git diff --check` PASS.

## Evitar duplicar habilidades requeridas en el selector optativo · 2026-11-23

- QA visual detectó que una habilidad fijada en el snapshot también aparecía como botón optativo cuando pertenecía al catálogo activo.
- TDD: amplié la prueba de Mentor con el catálogo que incluye “Navegación fijada” (requerida) y “Accesibilidad” (optativa). Antes del ajuste, fallaba mostrando ambas como botones; después, solo permite seleccionar “Accesibilidad” y el payload contiene únicamente su ID.
- El filtro usa el nombre normalizado del snapshot para no ocultar otras opciones autorizadas; la misma prop se usa en inicio y recuperación. Se conserva la regresión de contexto con `assignmentVersionId` discrepante.
- Suite focal `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx src/features/mentor/mentor-screen.test.tsx --maxWorkers=1` — 2 archivos, 34/34 PASS; typecheck y `git diff --check` PASS.
- Commit de corrección local: `37b518d12dae9c26ad13137e89ee8add83e31d75` en `codex/f18b-required-mission-skills`.
- PR #157 integrada normalmente como `376bb94bb9961b11cd9e70c4e8e5c43e0d67539a`; CI `45119166378` SUCCESS. F14 publicó y aplicó `v0.5.31` sobre ese SHA exacto; aplicación y healthchecks están documentados en F14.
- Reejecución independiente después del merge: suite focal web 34/34 PASS, web typecheck PASS y `git diff --check` PASS.
- Ego Lite posterior al filtro: en la misión QA existente, “Navegación móvil QA” sigue visible en el bloque de habilidades requeridas y ya no aparece como optativa. No se guardó ni evaluó. La misión no ofrecía otra habilidad opcional, por lo que la selección visual de una optativa distinta queda NO COMPROBADA; la prueba de componente confirma que “Accesibilidad” distinta sigue disponible y que su ID es el único que se enviaría.
- TaskSpaces 44 (docente) y 46 (estudiante), pestañas y sesiones se conservaron. Sin recursos nuevos, datos productivos ni llamadas pagadas. Calidad Mentor/Review real, recuperación evaluativa end-to-end, recorridos con misión productiva e identidad cruzada siguen NO COMPROBADOS.

## Habilidades obligatorias identificadas por snapshot en contexto de propuesta · 2026-11-23

- TDD rojo: el contrato rechazó el nuevo objeto enlazado con `requiredSkills`; la regresión UI devolvió una lista vacía al recibir la habilidad estructurada, al depender aún del prefijo textual de requisitos.
- Implementación inicial: `ProposalDraftResponseSchema.assignmentContext` expone la propiedad estructurada derivada de `ClassroomAssignmentVersion.snapshotJson.requiredSkills`; el texto de requisitos enviado a Mentor no cambió. La recuperación UI consume el campo solo si coincide `assignmentVersionId`; el guard para contexto de otra versión permanece.
- Revisión independiente encontró P2: filtrar solo por nombre reexponía la misma habilidad como optativa si el docente la renombraba después de publicar. Corrección en `d394bce`: el contrato transporta `{ id, name }[]` (máximo 20) y UI excluye la selección por ID; el snapshot sigue mostrando el nombre fijado al publicar y la habilidad de catálogo con el mismo ID ya no se ofrece, aunque hoy tenga nombre distinto. Las habilidades distintas conservan su opción optativa.
- Sin migración, persistencia adicional, cambio de rúbrica, modelo, prompt, evaluación IA ni datos productivos.
- Pruebas focales posteriores al fix: contratos `packages/contracts/src/index.test.ts` 30/30; API `mentor-context.test.ts` 5/5; UI `App.student-flow.test.tsx` + `mentor-screen.test.tsx` 34/34, incluida prueba donde el catálogo devuelve la misma ID con nombre actualizado. `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check` PASS. La compilación muestra avisos Vite por chunk >500 kB y directivas `use client` de lucide-react.
- Suite general `pnpm test`: PASS, 5 tareas Turbo; API 166 pruebas PASS y 71 omitidas, incluyendo el test PostgreSQL por la configuración offline predeterminada. Contratos 30 PASS; suites restantes PASS.
- Integración PostgreSQL separada: contenedor efímero nuevo sin volumen, publicado solo en `127.0.0.1:55447`; se aplicaron las cinco migraciones vigentes y se confirmó `current_database() = fragments_test`. `academic-flow.integration.test.ts` 3/3 PASS; la recuperación v1 tras publicar v2 confirmó ID y nombre de la habilidad fijada. El contenedor se eliminó al terminar; no se tocó ningún contenedor preexistente.
- Commits de implementación `5a697d1` y `d394bce` en `codex/f18b-structured-mission-skills`; documentación/evidencia `5115bd1`. PR #160 terminó integrada normalmente y desplegada en F14 `v0.5.32`; el reintento docente de misiones PR #164 quedó integrado/desplegado en `v0.5.33` (detalle y límites en las entradas siguientes).

## Reintento del listado de misiones docentes · 2026-11-23

- Comprobación del gap: una falla de `assignmentsApi.listTeacher` caía en un mensaje genérico del aula y la lista vacía seguía renderizando “Aún no hay misiones en esta aula”, confundiendo error con ausencia de datos.
- Cambio: `ClassroomStudio` separa la carga/error del recurso de misiones del resto del aula. `AssignmentsPanel` anuncia carga, presenta el error con `role="alert"`, oculta el estado vacío durante errores y ofrece “Reintentar carga de misiones”; durante el reintento el botón se reemplaza por el estado de carga.
- Prueba focal `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx src/features/assignments/AssignmentsPanel.test.tsx`: 2 archivos, 10/10 PASS. La regresión produce fallo de red, confirma que no aparece un falso vacío, reintenta solo `listTeacher` (sin repetir solicitudes de matrículas ni habilidades), comprueba el anuncio de carga y termina en vacío solo tras respuesta válida vacía.
- `pnpm --filter @fragments/contracts build` PASS; `pnpm --filter @fragments/web typecheck` PASS; `git diff --check` PASS.
- Commit de implementación `69c74a00c07e6880b729e394965e73814963e845` en `codex/f18b-next-ui`. PR #164 merge normal `446d3c3`; CI final `45125972349` SUCCESS en el head actualizado `3344b3c0b7aa187141c6901255c70cb3637f67d9`. F14 `v0.5.33` aplicada. Sin cambios de contrato, API o base de datos; no se escribieron datos productivos ni se alteraron sesiones Ego Lite.

## F18.B — reintento docente y release v0.5.33 · 2026-11-23

- PR #164 se integró por merge normal como `446d3c3d59180aa8e50bda54f29d8d78404a35f9`; CI del head actualizado `3344b3c0b7aa187141c6901255c70cb3637f67d9`, run `45125972349` SUCCESS. Prueba focal 10/10, contracts build/typecheck/diff-check PASS.
- `ClassroomStudio` separa fallos del listado de misiones del estado vacío legítimo, anuncia carga, expone `role=alert` y permite reintentar solo ese recurso. El test confirma no volver a consultar matrícula/habilidades y mostrar vacío solo tras respuesta vacía válida.
- F14 `v0.5.33` quedó aplicada al SHA `f256b6a02c54891040e1f4ba3591c2f85eea2c75`; health pública DB ready y bundle exacto incluyen el comportamiento nuevo. PR #160 snapshot de habilidades ya se había aplicado en `v0.5.32`.
- El aula productiva observada carece de misión QA activa; el flujo visual con una misión, recuperación/evaluación real, identidad cruzada y calidad Mentor/Review real permanecen NO COMPROBADOS. No se escribieron recursos académicos ni se llamó a IA real; sesiones Ego Lite no se alteraron.

## Misión asociada en Mis proyectos · 2026-11-23

- TDD: regresión con propuesta enlazada a `mission-v1`, contexto Mentor v7 y habilidad requerida. Antes del cambio, `Mis proyectos` no mostraba el disclosure. El test comprueba tema/versión/habilidades, resumen accesible y que la rúbrica/criterios no se muestran.
- La propuesta se puede continuar conservando `assignmentVersionId`, contexto y habilidad. Si el snapshot está desincronizado, la vista presenta “Misión vinculada · contexto no disponible”.
- Revisión independiente detectó que el contexto desincronizado aún podía llegar a Mentor desde la acción Continuar. El fix reutiliza `proposalMissionContext` para validar el contexto en reentrada y elimina el `assignmentContext` inválido de la propuesta activa y de las guardadas.
- Regresión demuestra que un mismatch `mission-v1`/`mission-v2` deja Mentor en error y no expone el tema, rúbrica ni habilidad stale. La revisión independiente del fix resultó PASS.
- Verificación fresca `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx src/features/mentor/mentor-screen.test.tsx --maxWorkers=1`: 2 archivos, **35/35 PASS**; web typecheck y `git diff --check` PASS.
- Ego Lite visual: **NO COMPROBADO**. Las pestañas QA existentes muestran el aula docente y `/student/mentor`, no “Mis proyectos”; no se navegó, recargó, hizo clic ni escribió para preservar las sesiones. TaskSpaces 44 y 46 quedaron abiertos.
- Commits funcionales `bf2513f642c07e51ebc94c5aa3628f9d40a6df8b` y `20c011e4125b86550d54d97e8da9c1e0b8e28184`; evidencia `2b5d247` y `7f73ebc`. PR #169 abierta; CI en curso. Sin cambios de contratos/API/rutas/DB.

## PR #169 y QA read-only posterior a v0.5.34 · 2026-11-23

- PR #169 se integró normalmente como `5ab32afde23e7ed29724a757ce7a064c3b40704b`; CI `45134521042` SUCCESS. F14 `v0.5.34` se aplicó; health pública `ok/database=ready` y bundle `/assets/index-CZSFpu9d.js` contienen versión y SHA exactos.
- En Ego Lite estudiante, `/student/projects` mostró colección vacía, CTA para crear y ningún error/loader. No había proyecto propio QA vinculado a misión; la presentación/recuperación visual del snapshot queda **NO COMPROBADA por falta de fixture**, sin evidencia de defecto. No se escribieron datos.
- En Ego Lite docente, «Cuenta y seguridad» abrió `/teacher/settings`; se confirmó el heading «Configuración» y se regresó la misma pestaña a `/teacher/dashboard`, donde cargó «Espacio docente». Todas las sesiones/tabs permanecieron abiertas.
- Suite focal F18.B 35/35, typecheck y `git diff --check` PASS; revisión independiente PASS. Los asserts UI son fake; no se ejecutó evaluación IA ni se creó recurso académico productivo. Identidad cruzada y recuperación/evaluación real siguen NO COMPROBADAS.

## Recorrido académico con recursos QA propios en producción · 2026-11-23

- En `v0.5.35` (`befbc7c3116bf9df2a33f5d344bbb7040b806939`), el perfil docente creó el aula aislada `FRAG-QA`, una habilidad propia y una misión publicada v1. El perfil estudiante QA solicitó ingreso; el docente aprobó la matrícula y el alumno vio estado activo. No se modificó el aula preexistente Programación Móvil ni usuarios ajenos.
- Desde la misión, Mentor mostró asignatura, consigna, contexto y habilidad requerida del snapshot v1. Se guardó una propuesta propia vinculada. Tras recargar y reabrir, se recuperaron los campos y el contexto de misión v1. Después se añadieron objetivo y alcance, se guardó, recargó y abrió de nuevo; ambos valores persistieron, el contexto seguía vigente y la propuesta alcanzó 100% de preparación.
- En la etapa de habilidades se observó la habilidad requerida fijada por la misión y el catálogo del aula QA. No se seleccionaron habilidades opcionales. El botón «Evaluar propuesta» quedó habilitado, pero no se accionó: proveedor/presupuesto no están verificados y no se realizaron llamadas IA.
- Validación real cubre aula→habilidad→misión→matrícula→contexto Mentor→borrador persistido/recuperado. Evaluación real, salida/puntuación, publicación automática en Galería, interacción de retry e identidad cruzada permanecen NO COMPROBADAS. No se escribió fuera de los recursos propios QA ni se cerraron pestañas.

## Incremento F18.B — continuidad académica de Review a Trainer · 2026-11-23

- Se amplió opcionalmente `ReviewAcademicLinkSchema` para conservar hasta 20 nombres de habilidades requeridas del snapshot publicado. El resolver solo toma los nombres del snapshot inmutable; los trabajos históricos sin la propiedad siguen siendo válidos.
- `GET /api/trainer/reviews` presenta un resumen de misión solo si Review está completado, pertenece al estudiante consultante, y el `linkedProposalId` coincide con `academicLink.proposalId`. El DTO contiene título de misión/aula, versiones y nombres de habilidades; no contiene IDs, puntuación, rúbrica ni contenido de propuesta.
- Trainer muestra ese resumen para la revisión elegida. Diferencia una lista vacía de habilidades de un snapshot histórico que no las conserva. No cambia prompts, modelo, rúbrica, generación de retos, rutas ni tablas.
- TDD: la prueba de pantalla falló inicialmente porque no aparecía «Misión vinculada»; después pasó. Pruebas focales: API/contexto y resolver Review **7/7 PASS**; web Trainer **7/7 PASS**; contratos incluidos en la suite.
- Verificación fresca: `pnpm test` — contratos **31/31**, web **217/217**, API **177 PASS / 72 omitidas** (requieren PostgreSQL/fixtures); `pnpm typecheck` — **5 tareas PASS**; `pnpm build` — **4 tareas PASS**; `pnpm lint` — **1 tarea PASS** (`contracts` ejecuta TypeScript); `git diff --check` — PASS.
- El build mantiene avisos de bundle Vite >500 KB y directivas `use client` de `lucide-react`; no son nuevos cambios del incremento. No se usó proveedor ni se ejecutó una evaluación IA.
- PostgreSQL end-to-end del nuevo resumen y QA visual Ego Lite con una Review vinculada: **NO COMPROBADOS**. La integración académica PostgreSQL se omitió por falta de `DATABASE_URL`; no había una Review QA vinculada autorizada para mostrar en la UI. Calidad real Mentor/Review continúa **NO COMPROBADA**.
- Commit de código: `b7e3a6109726a8a55aa6c036e47a60e9f6db1dfa` (`feat(F18.B): enlaza misión académica con Trainer`), branch `codex/f18-trainer-academic-context`. CI, PR y release F14 están pendientes.

## PR #178 — estado observado antes del merge · 2026-11-23

- PR #178 abierta contra `main`: https://github.com/VGMil-dev/fragments/pull/178. Run CI `45159579982` sigue `IN_PROGRESS`; no se ha fusionado ni creado tag.
- La revisión reflexiva independiente recomendó integrar y su único P2 (validar habilidad vacía o >100 caracteres en el cliente) quedó corregido; `trainer-api.test.ts` cubre ambos casos, 2/2 PASS.
- Run CI `45159579982` falló en integración PostgreSQL: el snapshot incluye `description` en habilidades y el resolver usaba un esquema estricto que la rechazaba, omitiendo la lista. Se cambió a `AssignmentSkillSnapshotSchema` y el test unitario ahora incluye descripciones; verificación focal `pnpm --filter @fragments/api exec vitest run src/features/review/academic-link.test.ts` — 2/2 PASS; `git diff --check` — PASS.
- El run `45159831451` también falló antes de esta corrección (mismo head funcional); falta publicar esta corrección y obtener CI completo sobre el nuevo head. No fusionar ni crear tag hasta entonces. Si merge y gates pasan, la siguiente release legítima será `v0.5.37` por F14; no existe deploy manual ni salto de gates.

## Reconciliación de PR #178 y continuidad PostgreSQL Review → Trainer · 2026-11-23

- Estado actual verificado después de los registros históricos anteriores: PR #178 se integró normalmente como `ab1a37f8ef69469a4b7b45c8f51c3c751b472c3e`; CI del merge `45160936114` SUCCESS. La tag anotada `v0.5.37` apunta a ese SHA exacto y el workflow `Fragments release` de F14 `45160936114` terminó SUCCESS. Este trabajo no volvió a consultar `/health` ni el bundle público, por lo que no afirma una comprobación de aplicación actual.
- Añadí `apps/api/src/features/assignments/academic-flow.integration.test.ts`: crea una misión versionada y propuesta fixture, solicita Review por HTTP con vínculo opt-in, procesa un resultado con fake local y lee `/api/trainer/reviews` con la identidad fixture del mismo estudiante.
- La aserción comprueba título de misión/aula, versión de misión, versión de contexto Mentor y habilidad requerida del snapshot; también verifica que Trainer no devuelva IDs internos, score ni hallazgos.
- Aislamiento: la reserva del worker está restringida al ID del job fixture dentro de una transacción y no reconcilia leases ajenos. Se limpian solo ese job, sus intentos y la sesión Trainer creada por el test. Los proveedores están rotulados `fake`; no acceden a GitHub ni a IA externa y no ejecutan archivos del repositorio.
- Base temporal nueva, sin volumen, publicada solo en `127.0.0.1:55447`; seis migraciones aplicadas a `fragments_test`. El test verifica host local y `current_database()` antes de escribir. No se conectó a `fragments_prod` ni se tocaron contenedores preexistentes.
- Verificación fresca: `pnpm --filter @fragments/api exec prisma generate` PASS; `pnpm --filter @fragments/contracts build` PASS; `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 4/4 PASS; `pnpm --filter @fragments/api test` — 66 archivos, 250/250 PASS; `pnpm --filter @fragments/api typecheck` PASS; `git diff --check` PASS.
- Revisión reflexiva independiente del test y su aislamiento: PASS, sin hallazgos restantes.
- Limitaciones conservadas: Better Auth y proveedores reales, evaluación/puntuación semántica IA, Review QA productiva vinculada visible en Ego Lite, ejecución de retos en Trainer y F25 siguen NO COMPROBADOS. No hubo escritura académica productiva ni llamada pagada. El estado real de F18.B permanece abierto hasta completar QA de Reviews vinculadas y calidad IA bajo presupuesto verificado.

## Incremento UI estudiantil — descripciones de habilidades · 2026-11-23

- La tarjeta de misión en Mis aulas conserva los nombres requeridos/optativos visibles y pliega cada descripción presente en un disclosure nativo `<details>` independiente. Descripción ausente no genera control y la categoría optativa vacía se omite. No se modificaron contratos, API, rutas, persistencia ni datos.
- Commit funcional `422d189da59a32bfb8d21a542527990a00a88c94` (`fix(f18b): plegar descripciones de habilidades`), sobre `f87a093aedd2ebef85679558683249fba1f74311` (`feat(F18.B): mostrar descripciones de habilidades`), rama `codex/f18b-next-mission-cues`.
- Verificación fresca contra el commit final: `pnpm --filter @fragments/web exec vitest run src/features/assignments/AssignmentsPanel.test.tsx --maxWorkers=1` — 5/5 PASS; `pnpm --filter @fragments/web typecheck` PASS; `git diff --check origin/main...HEAD` PASS. Worktree de código limpio al finalizar el implementador.
- Revisión UX/UI independiente y revisión reflexiva: PASS; sin defectos funcionales encontrados. Ambas anotan que la prueba no simula Enter/Espacio y confía en el comportamiento nativo de `<summary>`; una también señala que el foco visible depende del estilo del navegador. Ego Lite visual: NO COMPROBADO porque no había preview activo. No se usaron sesiones de producción ni se hicieron escrituras.
- Estado de PR, CI y F14 pendiente al momento de esa anotación; reconciliado en «Cierre de UI estudiantil» más abajo. F18.B permanece abierta por calidad de evaluación real y recorrido académico completo aún sin comprobar.

## Cierre de UI estudiantil — v0.5.44 · 2026-11-23

- PR [#195](https://github.com/VGMil-dev/fragments/pull/195) merge normal `d5d25527b67e9c4a3ed799154f76c187e351ece5`; CI `45217140767` PASS. F14 run `45217812854` SUCCESS para verify-build, attest-package y publish-approved-release; tag anotada `v0.5.44` sobre el SHA exacto.
- Producción comprobada sin escritura; Ego Lite abrió Mis aulas, pero no había misiones ni descripciones de habilidades visibles (missionCount 0 y skill disclosure count 0). La representación visual concreta del disclosure queda **NO COMPROBADA**.
- No se ejecutó Mentor/Review IA real ni se verificó Review productiva vinculada en Trainer. F18.B sigue abierta.

## Ego Lite producción — misión y habilidad visibles · v0.5.46 · 2026-11-23

- Desde la sesión existente Fragments-Estudiante se abrió `/student/classrooms` en modo solo lectura. Al menos una matrícula activa mostró una misión QA publicada v1, contexto Mentor v1 y una habilidad requerida autorizada.
- El disclosure «Ver descripción» de la habilidad estaba cerrado (`details.open=false`). En otra aula activa visible no se mostraron habilidades autorizadas ni misiones publicadas.
- La observación confirma presentación productiva de snapshot, versión y habilidad en Mis aulas. No se inició ni guardó una propuesta, no se pulsó «Evaluar propuesta», no se realizaron llamadas IA y no se escribieron datos.
- En aquella primera observación aún no se había abierto la misión en Mentor; la comprobación posterior de esa transición se registra en la sección siguiente. Calidad semántica Mentor/Review, Review productiva enlazada en Trainer, Galería e identidad cruzada siguen **NO COMPROBADAS**. Las pestañas y sesiones existentes se conservaron.

## Dashboard — resumen del snapshot de misión · 2026-11-23

- Commit funcional `87cbf51ef5e62beaae4c096b319f15463ba82d5e`: el Dashboard muestra versión publicada, versión de contexto Mentor y habilidades obligatorias desde el mismo `StudentAssignment` del CTA. Se mantiene la prioridad del borrador más reciente y no se consulta el catálogo para reconstruir el snapshot. Sin contratos, API, rutas, persistencia o datos.
- TDD: el test nuevo primero falló porque no existía el resumen de versión (`Misión publicada v4`); después del cambio pasó.
- Verificación fresca: `pnpm --filter @fragments/web exec vitest run src/features/student/StudentDashboard.test.tsx` — 7/7 PASS; `pnpm --filter @fragments/web test` — 49 archivos, 235/235 PASS; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS; `git diff --check` PASS.
- Revisión reflexiva estática independiente: PASS, sin hallazgos; confirmó prioridad del borrador y uso del snapshot sin mezclar contexto actual.
- Ego Lite verificó en la sesión existente v0.5.46 el recorrido Mis aulas → misión QA → Mentor, con misión v1, contexto v1 y skill requerida fijada; borrador al 0 %, sin guardar, evaluar ni invocar IA. Esta comprobación es previa al nuevo resumen del Dashboard; su visualización en producción queda pendiente del PR/release F14 y QA posterior.
- F18.B permanece abierta: calidad real Mentor/Review, Review productiva enlazada en Trainer, Gallery, e identidad cruzada siguen NO COMPROBADAS.
