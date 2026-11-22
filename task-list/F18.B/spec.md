# Especificación F18.B — MVP de misiones

## Contrato congelado por Planner

`AssignmentDraftSchema`: `title`, `instructions`, `objectives[]`, `requiredSkillIds[]`, `optionalSkillIds[]`; listas de habilidades disjuntas. `ClassroomAssignmentSchema` representa identidad/estado, `draftVersion`, `publishedVersion`, borrador y versiones publicadas. `AssignmentVersionSchema` contiene snapshots de habilidades y `mentorContextVersion`. No acepta propietario, matrícula ni estado desde el cliente.

## Rutas objetivo

- `GET /api/teacher/classrooms/:classroomId/assignments` — aula del docente autenticado.
- `POST /api/teacher/classrooms/:classroomId/assignments` — crea borrador.
- `PATCH /api/teacher/classrooms/:classroomId/assignments/:assignmentId/draft` — actualiza borrador con `expectedVersion`.
- `POST /api/teacher/classrooms/:classroomId/assignments/:assignmentId/publish` — publica snapshot usando `expectedVersion`.
- `GET /api/me/classrooms/:classroomId/assignments` — solo versiones publicadas de aula/matrícula activas de la sesión.

## Modelo de dominio

Una asignación pertenece a un aula transversal y tiene borrador versionado. Publicar copia datos normalizados y snapshots de habilidades obligatorias/optativas más la versión activa del contexto/rúbrica F11. Si ya existe versión publicada, la publicación siguiente incrementa versión y conserva la anterior. Las actualizaciones concurrentes fallan si `expectedVersion` no coincide. Las habilidades deben pertenecer al catálogo del docente y estar habilitadas en el aula. No aceptar habilidades archivadas.

## Criterios de aceptación

1. GIVEN docente propietario, WHEN crea/edita un borrador válido, THEN queda persistido y recuperable tras recarga.
2. GIVEN habilidad requerida y optativa, WHEN publica, THEN la versión es inmutable e incluye ambas categorías como snapshots coherentes.
3. GIVEN una versión ya publicada, WHEN edita y publica cambios, THEN se crea v2 sin alterar v1.
4. GIVEN docente no propietario, WHEN consulta o modifica la asignación, THEN recibe respuesta de acceso denegado sin datos.
5. GIVEN estudiante con matrícula `active` en aula `active`, WHEN consulta misiones, THEN ve solo versiones publicadas y el contenido necesario para iniciar Mentor.
6. GIVEN matrícula pending/rejected/removed, aula archived, o ID de aula manipulado, WHEN consulta, THEN no recibe contenido de esa aula.
7. GIVEN cliente envía `teacherId`, `studentId`, versiones publicadas editables o IDs de habilidad no habilitadas, WHEN guarda/publica, THEN se rechaza sin persistencia parcial.
8. Las pruebas de integración confirman la base efectiva `fragments_test`; ninguna prueba F18.B conecta a `fragments_prod`.

## UX

Español y tokens F16. Dentro del aula docente: listado, crear/editar, distinguir visualmente “Obligatorias” y “Optativas”, vista previa estudiantil y publicación versionada. En Mis aulas: lista de tareas publicadas por aula, no mezclar aulas. Estados carga/vacío/error, teclado y mobile. Ego Lite es el único navegador permitido.
