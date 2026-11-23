# Evidencia F18.C — Enlace voluntario Review → misión → docente

## Corrección de ruta en producción — 2026-11-23

- Tras desplegar PR #150 en `v0.5.28`, Ego Lite docente observó que `/teacher/review` cargaba pero `GET /api/teacher/classrooms/:id/reviews` respondía 404 `NOT_FOUND`. No hubo filas; no se pulsó Reintentar ni se modificaron datos.
- Verificación read-only de host: contenedores API y web ambos llevan el label `org.opencontainers.image.revision=17f810503ed3c56759a1b6ad2015eb52bc07e11c`, el SHA exacto de PR #150. Por tanto, se descartó una mezcla de versiones de imagen.
- Causa reproducida localmente: `classroomHandler` respondía su 404 catch-all antes de que el router compuesto invocara `reviewHandler`.
- Se añadió una regresión en `apps/api/src/http/app-routing.test.ts`; antes del fix falló con HTTP 404. El fix despacha Review antes del catch-all de Classroom Studio. Luego `pnpm --filter @fragments/api exec vitest run src/http/app-routing.test.ts --maxWorkers=1` — 2/2 PASS; `pnpm --filter @fragments/api typecheck` — PASS; `git diff --check` — PASS.
- Verificación fresca adicional tras el fix: `pnpm --filter @fragments/api test` — 45 archivos PASS/17 omitidos, 163 pruebas PASS/70 omitidas por requerir PostgreSQL o fixtures específicos. La prueba de orden de rutas forma parte de esta suite.
- Commit de corrección: `f59480bfe103c9ade022b17245d608f72e0b6952` en `codex/f18c-review-route-dispatch`; rama aún no publicada al registrar este commit de evidencia.
- La corrección aún no está integrada ni desplegada; requiere PR/CI y un tag F14 normal. No usar Retry ni enviar Reviews en producción hasta que llegue la corrección y se vuelva a verificar.

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
- Revisión reflexiva independiente de PR #150 PASS para autorizaciones, privacidad, orden de filtros y retry. El chequeo post-release Ego Lite descubrió por separado el defecto de despacho documentado arriba; la revisión reflexiva del hotfix también dio PASS.
- Commit de implementación: `c25de8e2922fdc76a258bad604bea0e8fbd747f2` en `codex/f18-review-linking`.
- Commit de evidencia/estado: `692ef08a473d6bb37c3972f296add776f29129ea`.

## Límites / estado

- PR #150 integrada en `17f810503ed3c56759a1b6ad2015eb52bc07e11c`; CI final `45106362852` SUCCESS. F14 `v0.5.28`, run `45106690945`, se aplicó y el bundle público y `/health` confirman versión/SHA y DB ready. SSH read-only confirmó ambos labels de imagen en el mismo SHA.
- Ego Lite abrió la vista docente `/teacher/review`, pero el endpoint devolvió HTTP 404 `NOT_FOUND`; esa observación invalida la disponibilidad funcional del feed hasta integrar el hotfix. La sesión docente quedó abierta en Review y la sesión estudiante intacta.
- Evaluaciones IA reales/calidad semántica NO COMPROBADAS; no se hicieron llamadas a proveedores.
- Hotfix F18.C `f59480bfe103c9ade022b17245d608f72e0b6952` está local y probado; PR, CI remoto, tag F14 y revalidación Ego Lite siguen pendientes. No se pulsó Reintentar ni se escribieron datos productivos.
