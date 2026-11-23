# Evidencia F18.C — Enlace voluntario Review → misión → docente

## Implementación local

- Añadidos contrato compartido para el vínculo académico y DTO docente seguro, resolución servidor desde Better Auth/propuesta/versiones/matrícula activa y propietario GitHub comprobado, con snapshot persistido en JSON existente del Job.
- Review estudiante ofrece vínculo opcional solo para propuestas propias recuperadas con contexto de misión coincidente. El backend exige que el `owner` del repositorio coincida con el `githubLogin` Better Auth del estudiante; no atribuye autoría en repositorios de organizaciones.
- El feed docente lista únicamente Reviews explícitamente vinculados dentro de aulas activas del docente y matrículas activas filtradas antes del límite de 100; vista de solo lectura, score formativo y estados de carga/vacío/error. Una consulta PostgreSQL con `INNER JOIN` excluye trabajos no elegibles antes de `LIMIT 100`.
- Retry preserva el vínculo, contexto y comprobación original del job incluso si cambia luego el `githubLogin` actual. Sin migración de Prisma.

## Verificación ejecutada

- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/contracts test` — PASS, 30/30.
- `pnpm --filter @fragments/api typecheck` y `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/api exec vitest run src/features/review/academic-link.test.ts src/features/review/worker-http.test.ts --maxWorkers=1` — 2 PASS; 9 omitidas porque la suite worker no usa la base en esta ejecución.
- Web: `TeacherReviewWorkspace.test.tsx`, `review-screen.test.tsx`, `TeacherWorkspaceShell.test.tsx`, `App.student-flow.test.tsx` — 14/14 PASS.
- PostgreSQL efímero local `fragments_test` en `127.0.0.1:55478`: `prisma migrate deploy` y `academic-flow.integration.test.ts` — 3/3 PASS, incluidos propiedad de propuesta/repositorio, matrícula/aula, opt-in, exclusión de Review sin vínculo, aislamiento ante 101 jobs antiguos de estudiantes inactivos y retry ligado. Contenedor retirado al terminar; no se modificó producción.
- `git diff --check` — PASS.
- Revisión reflexiva encontró dos brechas iniciales (atribución de repositorio y orden del filtro de matrícula respecto del límite) y un borde de retry tras cambio de nombre GitHub; los tres se corrigieron y cubrieron antes de esta ejecución final.

## Límites / estado

- Desarrollo local en curso. Aún sin commit, PR, confirmación de revisión final, CI de GitHub, merge, tag F14 ni despliegue.
- QA Ego Lite de esta nueva vista NO COMPROBADO: el aula productiva observada no tiene habilidad/misión activa y no se navegó ni cerró ninguna sesión docente/estudiantil.
- Evaluaciones IA reales/calidad semántica NO COMPROBADAS; no se hicieron llamadas a proveedores.
- SHA de commit: pendiente.
