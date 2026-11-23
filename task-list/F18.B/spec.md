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
9. Al iniciar propuesta desde una misión, el backend fija la `assignmentVersionId` publicada e inmutable; editar la propuesta no puede cambiarla.
10. Mentor evalúa con el snapshot de la misión y la versión F11 (`mentorContextVersion`) referenciados, nunca con la versión activa más reciente si la misión está vinculada.
11. El contexto efectivo combina sin omisiones los hasta 12 objetivos, 20 habilidades obligatorias, 20 optativas y 20 requisitos F11; las optativas se identifican como optativas. La edición/publicación base F11 mantiene el límite original de 20 requisitos.
12. La prueba PostgreSQL publica v1, liga una propuesta estudiantil a su `assignmentVersionId`, publica v2 y verifica que recuperar/evaluar el borrador conserva el snapshot y contexto de v1; usa únicamente el proveedor Mentor fake y confirma `current_database() = fragments_test`.

## UX

Español y tokens F16. Dentro del aula docente: listado, crear/editar, distinguir visualmente “Obligatorias” y “Optativas”, vista previa estudiantil y publicación versionada. En Mis aulas: lista de tareas publicadas por aula, no mezclar aulas. Estados carga/vacío/error, teclado y mobile. Ego Lite es el único navegador permitido.

## Incremento UI estudiantil — contexto académico vinculado

- Cada misión publicada en Mis aulas expone un `<details>` accesible y cerrado por defecto antes del CTA de propuesta.
- Al abrirlo, muestra el tema, la consigna contextual, el nivel esperado, los requisitos conservados y el número de versión `mentorContext.version` de esa misión.
- La UI no presenta pesos ni criterios de rúbrica en este incremento. El CTA sigue pasando el snapshot completo de la misma `StudentAssignment`; no se reconstruye contexto desde el borrador F11 actual.
- Verificación conductual: renderizar una misión con fixture de contexto, comprobar etiqueta de versión y valores fijados, abrir/cerrar el disclosure y confirmar que no se presenta contenido de criterios/pesos.

## Incremento F18.B — acceso al catálogo desde el aula docente

- GIVEN un aula sin habilidades disponibles, WHEN el docente ve el estado vacío de “Habilidades disponibles”, THEN conserva el aviso “Crea habilidades en el catálogo para habilitarlas aquí.” y dispone de un enlace visible a `/teacher/skills`.
- WHEN activa el enlace con ratón o teclado, THEN usa la navegación existente hacia el catálogo; no se cambia ninguna API ni contrato.
- El enlace aparece cuando no hay habilidades activas, tanto si la lista está vacía como si todas sus entradas están archivadas; si hay una activa, se omite.
- GIVEN el aula conserva únicamente habilidades archivadas, WHEN el docente revisa disponibilidad, THEN conserva sus nombres y la nota de referencias archivadas, y también dispone del enlace al catálogo.

## Incremento F18.B — inspección de snapshots publicados

- GIVEN una misión docente con versiones publicadas, WHEN el docente expande “Revisar versiones publicadas”, THEN cada versión disponible presenta su consigna y objetivos inmutables, las habilidades snapshot distinguidas como requeridas u optativas y el número de versión Mentor fijado.
- El historial es un `<details>` accesible cerrado por defecto. La vista solo lee los objetos `versions` ya cargados y no ofrece controles de escritura sobre versiones publicadas.

## Incremento UI estudiantil — reintentar recursos del aula

- GIVEN falla la carga de misiones de un aula activa, WHEN el estudiante activa “Reintentar misiones”, THEN se vuelve a solicitar solo esa lista y desaparece el error tras una respuesta exitosa.
- GIVEN falla la carga de habilidades de un aula activa, WHEN el estudiante activa “Reintentar habilidades”, THEN se vuelve a solicitar solo ese catálogo autorizado y desaparece el error tras una respuesta exitosa.
- Los errores se anuncian con `role="alert"`; cada reintento anuncia `role="status"` mientras carga. Solicitudes simultáneas duplicadas de la misma combinación aula/recurso se coalescen; el recurso independiente puede reintentarse por separado.

## Incremento UI estudiantil — identificar snapshot de misión

- GIVEN una misión publicada en Mis aulas, WHEN el estudiante ve su tarjeta antes de abrir el contexto, THEN ve `Misión publicada vN · Contexto Mentor vM` con los números del mismo `StudentAssignment` que se pasa al CTA de propuesta.
- La etiqueta está fuera del disclosure de contexto para facilitar distinguir versión de misión y versión Mentor. El CTA conserva el objeto snapshot completo sin reconstruirlo ni mutarlo.

## Incremento de continuidad — limpiar selección de misión al volver a Mentor

- GIVEN el estudiante inicia una propuesta desde una versión publicada, WHEN guarda el borrador, THEN se envía el `assignmentVersionId` exacto y Mentor recibe el `mentorContext` del snapshot seleccionado.
- GIVEN el estudiante vuelve al catálogo desde Mentor y luego abre Mentor desde la navegación, WHEN crea y guarda una propuesta nueva, THEN no se adjunta el `assignmentVersionId` anterior y se consulta el contexto Mentor general.
- Ambos accesos de navegación a Mentor limpian la misión seleccionada; el botón de volver desde Mentor también limpia esa selección.
- Verificación mediante prueba de composición UI con APIs y proveedor controlados por fakes. No demuestra guardado remoto, datos de producción ni calidad del proveedor IA.

## Propuestas guardadas — contexto vinculado

- Cuando una propuesta recuperada conserva una misión publicada, el listado identifica la misión y el número de versión del contexto Mentor asociado.
- La interacción de «Abrir propuesta» debe recuperar la evaluación persistida de la misma propuesta; no recalcula ni expone rúbrica en esta superficie.
- Prueba UI usa el objeto completo capturado por la acción de apertura y valida que recuperación recibe su identificador.
