# Evidencia F18.B

## Estado

Implementación local parcial, sin migrar bases de datos. El CRUD docente, publicación versionada y lectura estudiantil están implementados en feature; el panel docente está integrado en `ClassroomStudio`, la lectura en Mis aulas y el handler HTTP en el shell general.

## Cambios implementados

- Prisma: `ClassroomAssignment` guarda borrador y contador optimista; `ClassroomAssignmentVersion` conserva snapshot append-only de misión, skills requeridas/optativas y `mentorContextVersion`.
- API encapsulada en `apps/api/src/features/assignments/http.ts`: listar/crear/editar/publicar misiones con propiedad del aula; lectura estudiante requiere matrícula activa y aula activa. Respuesta de estudiante fija `assignmentId` y usa `id` de versión como identificador inmutable.
- Migración aditiva `apps/api/prisma/migrations/20261122100000_classroom_assignments/migration.sql`; agrega dos tablas, FK e índices; no altera UX-08 ni otros modelos.
- UI docente en el detalle de `ClassroomStudio`, con borrador y distinción requerida/optativa; componente estudiantil `StudentAssignmentsList` para montaje en Mis aulas.
- Borradores rechazan habilidades no habilitadas o archivadas al crear y editar; error de red en las consultas de Mis aulas termina en estado visible de error por recurso.
- Tests usan identidades `fixture-*`, mock Prisma y fake auth; no evalúan código estudiantil ni llaman proveedores externos.

## Verificación local fresca

- `pnpm --filter @fragments/contracts build` — PASS (`tsc -p tsconfig.json`).
- `pnpm --filter @fragments/api exec prisma validate` — PASS (`The schema at prisma\\schema.prisma is valid`).
- `pnpm --filter @fragments/api exec prisma generate` — PASS (Prisma Client 7.10.1 generado).
- `pnpm --filter @fragments/api exec vitest run src/features/assignments` — PASS (2 archivos, 5 tests). Cobertura: autenticación docente, habilidades duplicadas, snapshot inmutable v1/v2, `assignmentId` + id de versión, matrícula pendiente, dueño docente ajeno y conflicto de versión obsoleta.
- `pnpm --filter @fragments/api typecheck` — PASS (`tsc --noEmit -p tsconfig.json`).
- `pnpm --filter @fragments/web exec vitest run src/features/assignments/AssignmentsPanel.test.tsx src/features/classroom/ClassroomStudio.test.tsx src/features/student/StudentClassroomsScreen.test.tsx` — PASS (3 archivos, 7 tests; incluye el montaje de Mis aulas).
- `pnpm --filter @fragments/web typecheck` — PASS (`tsc -p tsconfig.json`).
- `git diff --check` — PASS.
- Revisión estática independiente encontró dos P2 (persistir IDs de habilidad no autorizados y carga eterna tras rechazo de red); ambos corregidos. Regresiones API cubren create/update inválido sin escritura parcial; UI monta llamadas rechazadas y valida estados de error.
- Verificación integrada posterior a esas correcciones: `pnpm exec turbo run test typecheck lint build --force` — 11/11 tareas PASS; contratos 29/29; API 91 aprobadas y 66 omitidas por falta de configuración de DB/servicios; web 140/140. El build mantiene advertencias conocidas de chunk >500 kB y directivas Lucide.
- Verificación integrada fresca en este checkout: `pnpm exec turbo run test typecheck lint build --force` — exit 0, 11/11 tareas Turbo; contratos 29/29, API 91 aprobadas y 66 omitidas por configuración ausente de DB/servicios, web 140/140. Warnings de build conocidos: chunk >500 kB y directivas `use client` de Lucide.
- Commits del slice: `631cd6550e3569d16aa79ec5f62da369dd960c6e` (`feat(f18b): agregar misiones de aula versionadas`), `b6eeac14daedc9ac996020504d92db882bedaf1a`, `fd0e2e12aefed46cba882ffca6924d4a4529b056` y `0309ca17f2ede2e7f365998ac6b492b0bfa67885` (`feat(f18b): integrar misiones con aula docente y estudiante`).

## Límites y bloqueos

- Preflight seguro: `DATABASE_URL` ausente en el proceso; no se abrió conexión. No se aplicó migración ni se ejecutó persistencia PostgreSQL. La verificación solicitada de `current_database() = fragments_test` queda pendiente; no se contactó `fragments_prod`.
- No se usó Ego Lite ni se tomaron capturas. Falta QA visual/teclado en viewport disponible.
- No se ejecutó código de estudiantes, servicios AI, GitHub, Moodle ni destino de despliegue.
- El código está commit local en `0309ca17f2ede2e7f365998ac6b492b0bfa67885`; todavía no hay push, PR, CI remoto ni release.
- Los cambios F25 mergeados recientemente en `origin/main` (`c25f97a`) todavía no se han integrado en esta rama local.
- El cierre de F18.B sigue parcial hasta ejecutar preflight sobre `fragments_test`, validar navegación/teclado con Ego Lite y probar con sesiones docente/estudiante después del release.
