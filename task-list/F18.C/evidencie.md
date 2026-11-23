# Evidencia F18.C — Enlace voluntario Review → misión → docente

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
- Revisión reflexiva independiente PASS: autorizaciones, privacidad, orden de filtros y retry revisados sin defectos remanentes.
- Commit de implementación: `c25de8e2922fdc76a258bad604bea0e8fbd747f2` en `codex/f18-review-linking`.
- Commit de evidencia/estado: `692ef08a473d6bb37c3972f296add776f29129ea`.

## Límites / estado

- PR #150 abierta contra `main`, branch publicada y mergeable. CI Fragments CI run `45105932136` está `in_progress`; sin merge, tag F14 ni despliegue.
- QA Ego Lite de esta nueva vista NO COMPROBADO: el aula productiva observada no tiene habilidad/misión activa y no se navegó ni cerró ninguna sesión docente/estudiantil.
- Evaluaciones IA reales/calidad semántica NO COMPROBADAS; no se hicieron llamadas a proveedores.
- QA y release: Ego Lite de vista nueva sigue pendiente; el aula observada no cuenta con misión activa. Merge y release requieren CI satisfactorio y proceso normal F14.
