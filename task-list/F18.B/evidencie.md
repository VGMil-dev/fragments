# Evidencia F18.B

## Estado

Implementación local parcial, sin migrar bases de datos. El CRUD docente, publicación versionada y lectura estudiantil están implementados en feature; el panel docente está integrado en `ClassroomStudio`. El planner integra el montaje estudiantil y el handler HTTP en el shell general.

## Cambios implementados

- Prisma: `ClassroomAssignment` guarda borrador y contador optimista; `ClassroomAssignmentVersion` conserva snapshot append-only de misión, skills requeridas/optativas y `mentorContextVersion`.
- API encapsulada en `apps/api/src/features/assignments/http.ts`: listar/crear/editar/publicar misiones con propiedad del aula; lectura estudiante requiere matrícula activa y aula activa. Respuesta de estudiante fija `assignmentId` y usa `id` de versión como identificador inmutable.
- Migración aditiva `apps/api/prisma/migrations/20261122100000_classroom_assignments/migration.sql`; agrega dos tablas, FK e índices; no altera UX-08 ni otros modelos.
- UI docente en el detalle de `ClassroomStudio`, con borrador y distinción requerida/optativa; componente estudiantil `StudentAssignmentsList` para montaje en Mis aulas.
- Tests usan identidades `fixture-*`, mock Prisma y fake auth; no evalúan código estudiantil ni llaman proveedores externos.

## Verificación local fresca

- `pnpm --filter @fragments/contracts build` — PASS (`tsc -p tsconfig.json`).
- `pnpm --filter @fragments/api exec prisma validate` — PASS (`The schema at prisma\\schema.prisma is valid`).
- `pnpm --filter @fragments/api exec prisma generate` — PASS (Prisma Client 7.10.1 generado).
- `pnpm --filter @fragments/api exec vitest run src/features/assignments` — PASS (2 archivos, 5 tests). Cobertura: autenticación docente, habilidades duplicadas, snapshot inmutable v1/v2, `assignmentId` + id de versión, matrícula pendiente, dueño docente ajeno y conflicto de versión obsoleta.
- `pnpm --filter @fragments/api typecheck` — PASS (`tsc --noEmit -p tsconfig.json`).
- `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx src/features/assignments/AssignmentsPanel.test.tsx` — PASS (2 archivos, 5 tests).
- `pnpm --filter @fragments/web typecheck` — PASS (`tsc -p tsconfig.json`).
- `git diff --check` — PASS.
- Commit del slice: `631cd6550e3569d16aa79ec5f62da369dd960c6e` (`feat(f18b): agregar misiones de aula versionadas`).

## Límites y bloqueos

- Preflight seguro: `DATABASE_URL` ausente en el proceso; no se abrió conexión. No se aplicó migración ni se ejecutó persistencia PostgreSQL. La verificación solicitada de `current_database() = fragments_test` queda pendiente; no se contactó `fragments_prod`.
- No se usó Ego Lite ni se tomaron capturas. Falta QA visual/teclado en viewport disponible.
- No se ejecutó código de estudiantes, servicios AI, GitHub, Moodle ni destino de despliegue.
- Planner integró `createAssignmentHttp` en el shell de API y montó `StudentAssignmentsList` en Mis aulas. La prueba cruzada de Mis aulas quedó con una expectativa antigua que excluye texto de misiones; debe ajustarse para validar su estado de carga/vacío.
- Sin push, PR ni release. El cierre de F18.B sigue parcial hasta que el planner integre rutas/cambios concurrentes, corrija la aserción estudiantil antigua, ejecute preflight sobre `fragments_test` y complete Ego Lite si el viewport está disponible.
