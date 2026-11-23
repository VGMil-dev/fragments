# Evidencia F18.C — Enlace voluntario Review → misión → docente

## Corrección de ruta en producción — 2026-11-23

- Tras desplegar PR #150 en `v0.5.28`, Ego Lite docente observó que `/teacher/review` cargaba pero `GET /api/teacher/classrooms/:id/reviews` respondía 404 `NOT_FOUND`. No hubo filas; no se pulsó Reintentar ni se modificaron datos. Labels de API y web confirmaron SHA `17f810503ed3c56759a1b6ad2015eb52bc07e11c`, por lo que se descartó una mezcla de versiones.
- Causa: `classroomHandler` respondía su 404 catch-all antes de que el router compuesto invocara `reviewHandler`. Se añadió un test del router montado; antes del fix falló con 404 y confirmó que el store de Review no se llamaba.
- Corrección: despachar `reviewHandler` antes del catch-all. Verificación local: `pnpm --filter @fragments/api exec vitest run src/http/app-routing.test.ts --maxWorkers=1` — 2/2 PASS; `pnpm --filter @fragments/api test` — 45 archivos PASS/17 omitidos, 163 pruebas PASS/70 omitidas por PostgreSQL/fixtures; `pnpm --filter @fragments/api typecheck` — PASS; `git diff --check` — PASS. Revisión reflexiva independiente — PASS.
- Commit de código: `f59480bfe103c9ade022b17245d608f72e0b6952`. PR #151 integrada normalmente como `7123eca519aa2b02c4d79851595900de50a3690b`; CI `45108818652` SUCCESS. Tag anotada `v0.5.29` apunta al merge exacto; F14 run `45109104699` SUCCESS en build, ARM64, atestación y publicación.
- Aplicación normal observada: el timer poller y `fragments-release-apply.service` terminaron `success` (ExecMainStatus 0). La comprobación pública posterior dio `/health ok/ready` y bundle `/assets/index-WkZ1HQx5.js` con `v0.5.29` y el SHA exacto.
- Ego Lite docente, tras una sola recarga de la pestaña Review existente: el GET respondió 200 y la UI mostró «Aún no hay revisiones que estudiantes hayan compartido con esta aula», sin error, carga pendiente ni filas. No se pulsó Reintentar ni se creó una Review; la sesión estudiante y las demás pestañas permanecieron abiertas. No se capturó pantalla porque el marco muestra datos personales.

## Implementación local

- Añadidos contrato compartido para el vínculo académico y DTO docente seguro, resolución servidor desde Better Auth/propuesta/versiones/matrícula activa y propietario GitHub comprobado, con snapshot persistido en JSON existente del Job.
- Review estudiante ofrece vínculo opcional solo para propuestas propias recuperadas con contexto de misión coincidente. El backend exige que el `owner` del repositorio coincida con el `githubLogin` Better Auth del estudiante; no atribuye autoría en repositorios de organizaciones.
- El feed docente lista únicamente Reviews explícitamente vinculados dentro de aulas activas del docente y matrículas activas filtradas antes del límite de 100; vista de solo lectura, score formativo y estados de carga/vacío/error. Una consulta PostgreSQL con `INNER JOIN` excluye trabajos no elegibles antes de `LIMIT 100`.
- Retry preserva el vínculo, contexto y comprobación original del job incluso si cambia luego el `githubLogin` actual. Sin migración de Prisma.

## Verificación ejecutada

- `pnpm run test` — PASS: contracts 30/30; web 200/200; API 162 PASS, 70 omitidas por pruebas que requieren `DATABASE_URL` y fixtures específicos. Turbo: 5/5 tareas.
- `pnpm run typecheck` y `pnpm run build` — PASS, 5/5 y 4/4 tareas Turbo respectivamente.
- PostgreSQL efímero local `fragments_test` en `127.0.0.1:55478`: `prisma migrate deploy` y `academic-flow.integration.test.ts` — 3/3 PASS, incluidos propiedad de propuesta/repositorio, matrícula/aula, opt-in, exclusión de Review sin vínculo, aislamiento ante 101 jobs antiguos de estudiantes inactivos y retry ligado tras cambio de login. Contenedor retirado al terminar; no se modificó producción.
- `git diff --check` — PASS.
- Revisión reflexiva independiente de PR #150 PASS para autorizaciones, privacidad, orden de filtros y retry. La revisión reflexiva del hotfix también dio PASS.
- Commit de implementación: `c25de8e2922fdc76a258bad604bea0e8fbd747f2` en `codex/f18-review-linking`.
- Commit de evidencia/estado: `692ef08a473d6bb37c3972f296add776f29129ea`.

## Límites / estado

- PR #150 y hotfix PR #151 están integradas; el release F14 vigente para este incremento es `v0.5.29` y su SHA/health se verificaron. El GET docente ahora responde 200 y el estado vacío se valida en Ego Lite.
- **Límite:** no hay Reviews vinculadas reales compartidas con esta aula, por lo que el resultado no vacío, la persistencia real de un vínculo y su visualización con datos permanecen NO COMPROBADOS. No se hicieron escrituras productivas.
- Evaluaciones IA reales/calidad semántica NO COMPROBADAS; no se hicieron llamadas a proveedores.
- Ledger del host, hash del backup y labels Docker de `v0.5.29` NO COMPROBADOS. No se usó deploy manual ni se reiniciaron servicios.
