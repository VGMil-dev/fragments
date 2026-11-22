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
