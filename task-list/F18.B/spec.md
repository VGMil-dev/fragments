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
10. Mentor evalúa con el snapshot de la misión (incluido el asunto de aula vigente al publicar) y la versión F11 (`mentorContextVersion`) referenciados, nunca con valores actuales que hayan cambiado después de publicar ni con la versión activa más reciente si la misión está vinculada.
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

## Incremento — Dashboard como centro de la misión publicada

- Si no hay borrador prioritario, ni error ni carga pendiente y existe una misión publicada, el Dashboard presenta la versión de misión y la versión de contexto Mentor del `StudentAssignment` que activa el CTA.
- Presenta los nombres de `requiredSkills` de ese mismo snapshot; si la lista es válida y vacía, indica “Sin habilidades obligatorias”. No consulta el catálogo actual para reconstruir versiones ni requisitos.
- Mientras se continúa un borrador, se cargan o fallan las propuestas/misiones, se oculta el resumen de misión igual que su CTA.
- El CTA conserva y entrega el mismo objeto `StudentAssignment` sin copiarlo ni mutarlo.
- Pruebas UI cubren versiones/habilidades reales del DTO fixture y la prioridad del borrador. Sin cambios de API, contratos, rutas, backend, migraciones o datos.

## Incremento — aula de habilidades desde misión

- Al iniciar una propuesta nueva desde una misión, si `missionClassroomId` coincide con un aula activa cargada de la sesión, Mentor preselecciona esa aula para el catálogo optativo cuando haya más de una.
- El catálogo sigue solicitándose solo al abrir Habilidades; el ID procede del `StudentAssignment` seleccionado y el servidor conserva su autorización existente.
- Propuestas recuperadas conservan el `classroomId` guardado y sus selecciones; el aula de misión no los sobrescribe.
- Si el aula de misión no está disponible en la lista autenticada, no se elige otra aula por inferencia; se conserva el selector actual.
- Pruebas UI cubren aula de misión entre varias aulas y aula guardada de propuesta recuperada. Sin cambios de contrato, API, persistencia o evaluación.

## Incremento F18.B — recuperar la carga de misiones docentes

- Si falla `GET /api/teacher/classrooms/:classroomId/assignments`, el detalle no debe presentar el estado vacío como si no existieran misiones.
- Mostrar un error accesible y un control “Reintentar carga de misiones”; al activarlo, volver a consultar únicamente las misiones de esa aula.
- Tras una respuesta vacía válida, se muestra el estado vacío; tras error, se oculta. Durante la solicitud se anuncia carga y el control de reintento desaparece hasta que termina.
- Este incremento no cambia APIs, contratos, persistencia ni datos.

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

## Incremento UI — habilidades requeridas de misión en Mentor

- Al iniciar una propuesta desde una versión de misión, la etapa Habilidades muestra los nombres de `requiredSkills` del snapshot como lista no editable.
- Al recuperar propuesta, mostrar solo las habilidades requeridas que estén codificadas en su `assignmentContext` vinculado al mismo `assignmentVersionId`; no interpretar requisitos optativos o generales como habilidades requeridas.
- La lista de habilidades seleccionadas del catálogo activo conserva exclusivamente la selección optativa de Mentor y su payload de guardado.
- Una habilidad fijada como requerida en el snapshot se excluye del selector optativo por nombre normalizado; el catálogo sigue ofreciendo cualquier otra habilidad autorizada del aula.
- Sin misión o contexto vinculado, conservar el estado “Sin asignación” de Mentor general.
- Pruebas de composición cubren inicio y recuperación; la prueba de pantalla usa un catálogo que contiene la habilidad requerida y otra opcional, comprobando que solo esta última sigue seleccionable.

## Incremento F18.B — habilidades requeridas estructuradas en propuestas recuperadas

- `assignmentContext` de una propuesta vinculada incluye `requiredSkills: { id, name }[]` desde `ClassroomAssignmentVersion.snapshotJson.requiredSkills`; la lista conserva las identidades/nombres del snapshot de esa versión y puede estar vacía.
- La respuesta expone la propiedad mediante el contrato compartido. No cambia la solicitud de evaluación, su texto, el modelo, la rúbrica ni la persistencia.
- Mentor muestra `requiredSkills` solo cuando `assignmentContext.assignmentVersionId` coincide con `proposal.assignmentVersionId`; excluye del selector optativo por ID, aunque el docente haya renombrado esa habilidad desde la publicación.
- Las pruebas de contrato rechazan contexto vinculado sin la propiedad estructurada; integración PostgreSQL verifica IDs/nombres en creación y recuperación después de publicar v2; UI verifica recuperación desde el arreglo tipado, rechazo de contexto de otra versión y exclusión por ID después de un cambio de nombre.
- Sin migración ni llamadas a proveedores. Snapshots sin arreglo válido se proyectan como lista vacía, sin inferir identidades del texto de la rúbrica.

## Incremento UI estudiantil — misión vinculada en Mis proyectos

- Para una propuesta con `assignmentVersionId`, “Mis proyectos” ofrece un `<details>` accesible cerrado por defecto. Su resumen identifica la misión con el tema snapshot y `Contexto Mentor vN`; al abrir, muestra solo nombres de habilidades requeridas del `assignmentContext` coincidente.
- La UI no convierte el `assignmentVersionId` opaco en un número de versión de misión: la respuesta de propuesta no entrega ese número; el vínculo exacto se conserva, y se presenta el número de versión de contexto Mentor que sí entrega.
- Un `assignmentContext` ausente o con versión distinta no se presenta como contexto de esa propuesta ni muestra sus habilidades; se anuncia “contexto no disponible”. Una propuesta sin `assignmentVersionId` no muestra marcador de misión.
- “Continuar” conserva el objeto de propuesta recibido del backend: ID y versión de misión, contexto Mentor y habilidades fijadas. El tema, versión Mentor y nombres/IDs de skills se validan al entrar a Mentor.
- Al entrar a Mentor, el mismo helper valida que `assignmentContext.assignmentVersionId === assignmentVersionId`. El mismatch o contexto ausente bloquea el contexto fijado con estado de error; el contexto discrepante se elimina de `initialProposal` y de `savedProposals` que consume Mentor. Las habilidades requeridas quedan vacías y no se exponen rúbrica/tema/habilidades obsoletos.
- La UI no muestra criterios, pesos ni rúbrica. No se agregan contratos, campos de versión numérica de misión ni llamadas de evaluación.

## Incremento — contexto de misión en Trainer desde Review

- `ReviewAcademicLinkSchema` conserva opcionalmente hasta 20 nombres de habilidades requeridas del snapshot publicado; la propiedad ausente sigue válida para trabajos históricos.
- Al resolver `linkedProposalId`, la API toma solo las habilidades requeridas del snapshot de la versión publicada y las incluye en el payload académico inmutable del job Review.
- `GET /api/trainer/reviews` incluye `academicContext` solo para Reviews completados pertenecientes al estudiante autenticado y con `linkedProposalId === academicLink.proposalId`.
- El DTO público de Trainer contiene únicamente `missionTitle`, `missionVersion`, `mentorContextVersion`, `classroomTitle` y, cuando fue preservado, `requiredSkills[]`; no incluye IDs internos, score, rúbrica, título del proyecto ni contenido privado.
- Trainer muestra el resumen para la Review seleccionada. Una lista presente y vacía comunica que no hay habilidades obligatorias; la propiedad ausente comunica que el snapshot antiguo no las conserva.
- GIVEN Review sin vínculo académico, WHEN aparece en Trainer, THEN conserva la tarjeta y controles actuales y no muestra contexto inventado.
- GIVEN vínculo válido del estudiante actual, WHEN selecciona la Review, THEN observa misión, versiones y habilidades obligatorias del snapshot asociado.
- GIVEN vínculo cuyo propietario o propuesta no coincide, WHEN se construye el DTO, THEN se omite `academicContext` sin filtrar IDs.
- Sin rutas nuevas, migraciones, cambios de prompt/modelo/rúbrica, generación de retos o escrituras productivas.

## Propuestas guardadas — contexto vinculado

- Cuando una propuesta recuperada conserva una misión publicada, el listado identifica la misión y el número de versión del contexto Mentor asociado.
- La interacción de «Abrir propuesta» debe recuperar la evaluación persistida de la misma propuesta; no recalcula ni expone rúbrica en esta superficie.
- Prueba UI usa el objeto completo capturado por la acción de apertura y valida que recuperación recibe su identificador.

## Accesibilidad de propuestas recuperables

- Cada acción de apertura anuncia el estado de la acción y el título de la propuesta. Si no hay título, anuncia Borrador sin título. El texto visible y el callback existente se conservan.

## Integración PostgreSQL — misión, Review fake y Trainer

- GIVEN una matrícula activa y una propuesta propia ligada a una versión publicada de misión, WHEN la Review se crea por HTTP y se procesa con repositorio, packer y evaluador fake etiquetados, THEN Trainer lista esa Review con título de misión/aula, versiones y habilidades del snapshot publicado.
- La prueba limita el worker al ID del job que creó y omite reconciliar leases globales; no puede reclamar ni cambiar jobs de otros tests.
- El DTO continúa ocultando IDs internos, rúbrica, puntuación y hallazgos privados. No se ejecuta código del repositorio ni se invoca un proveedor real.
- La prueba corre únicamente en localhost con `current_database() = fragments_test`; no constituye prueba de Review productiva ni valida calidad semántica IA.

## Incremento UI estudiantil — descripciones de habilidades de misión

- En Mis aulas, mantener visibles los nombres de habilidades requeridas y optativas del snapshot publicado.
- Si una habilidad trae descripción, mostrar un disclosure `<details>` independiente, accesible y cerrado por defecto; si la descripción falta, no añadir un control vacío. La categoría optativa no aparece cuando no contiene habilidades.
- Las descripciones largas deben envolver dentro del layout; no cambiar snapshots, contexto de Mentor, rutas, API ni persistencia.
- La prueba UI verifica nombres, texto largo, descripción ausente, categoría optativa vacía, foco del resumen, disclosure cerrado y apertura.
