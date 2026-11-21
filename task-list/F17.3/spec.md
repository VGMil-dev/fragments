# F17.3 — Especificación: Mentor · Habilidades

## Contrato aprobado

El planner fijó el DTO en `packages/contracts` (commit `962ef80`): `mentorSkills` opcional con `classroomId: string | null` y `selectedSkillIds: string[]` únicos, hasta 20; `classroomId: null` solo se admite cuando el arreglo está vacío. Las propuestas completas y parciales lo admiten. Las respuestas estudiantiles lo conservan; `TeacherProject` excluye `mentorSkills`.

## Contrato actual observado

- `ProposalDraftFieldsSchema` en `packages/contracts/src/index.ts` es `.strict()`; `skills` acepta hasta 20 nombres de texto y no tiene vínculo a aula ni IDs.
- `UpdateProposalDraftRequestSchema` es `.strict()` con `expectedVersion` y `proposal` parcial.
- `ProposalDraftSchema` es `.strict()` y se usa para evaluación.
- `Proposal.proposalJson` y `ProposalRevision.proposalJson` ya almacenan el borrador y sus revisiones. `updateProposalDraftByUser` combina el parcial en transacción y comprueba `expectedVersion`, sin requerir migración.
- `GET /api/me/classrooms/:classroomId/skills` autentica la identidad estudiantil y retorna únicamente habilidades habilitadas y no archivadas cuando hay matrícula activa en aula activa.

## Persistencia y validación server-side

El esquema aprobado por el planner añade `mentorSkills` opcional a los schemas de propuesta completa y parcial:

```ts
mentorSkills: z.object({
  classroomId: identifier.nullable(),
  selectedSkillIds: z.array(identifier).max(20),
}).strict().optional()
```

El cliente envía selección de IDs, no nombres como autoridad. Al crear/actualizar, el servidor resuelve el estudiante desde Better Auth, consulta el catálogo permitido para ese `classroomId`, rechaza aula/matrícula no autorizada y rechaza cualquier ID ausente, archivado o deshabilitado. Si el vínculo es nulo, la lista debe estar vacía. El servidor deriva `proposal.skills` de los nombres resueltos y persiste `mentorSkills` junto con el borrador y `ProposalRevision`, manteniendo `expectedVersion`. En escrituras nuevas, una lista `skills` no vacía sin selección validada se rechaza. Parches ajenos a habilidades pueden omitir ambos campos para preservar compatibilidad con borradores históricos. Toda respuesta pública o publicación académica debe redactar aula e IDs internos; las etiquetas de habilidad autorizadas pueden conservarse según el contrato público existente.

La alternativa de resolver nombres contra la unión de catálogos se descartó: no conserva aula/IDs, no desambigua catálogos homónimos y no ofrece restauración estable si el nombre cambia.

## Entradas

- Identidad del estudiante autenticado (solo del servidor).
- `GET /api/me/classrooms` para elegir aula de origen.
- `GET /api/me/classrooms/:classroomId/skills` para listado autorizado.
- Borrador de Mentor y `expectedVersion` para persistir selección.
- Búsqueda local por nombre.

## Interfaz

- Conservar el shell existente del Portal, menú de seis etapas y progreso calculado del borrador.
- Etapa Habilidades en estilo Pixel Night de la imagen aprobada, adaptada a tokens/componentes existentes.
- Selector cuando hay aula y aún no existe una elección. Una sola aula se preselecciona solo si el borrador nunca tuvo `mentorSkills`; una elección guardada explícitamente `{ classroomId: null, selectedSkillIds: [] }` se respeta.
- Sección de requeridas solo si la fuente académica aporta la distinción autoritativa; disponibilidad de aula nunca significa requerida. F18.B queda fuera.
- Catálogo consultado por API; búsqueda, conteos, resultados iniciales acotados y botón Mostrar más incremental.
- Tira de seleccionadas siempre visible, con retirar accesible por teclado; selección no se pierde al filtrar.
- Estados de carga, catálogo vacío, sin aulas activas, error recuperable y aula no autorizada. El texto de procedencia del catálogo refleja carga/error/aula seleccionada y no lo llama autorizado sin una selección cargada.
- Botón Guardar borrador persiste en la ruta existente; no indicar éxito antes de respuesta positiva.
- Responsive: 320, 390, 768, 1024, 1440 y 1672 px; foco visible y controles con nombre accesible.

## Salidas y seguridad

- `mentorSkills` y `skills` se persisten en JSON del borrador y revisión, dentro de la transacción/versionado existente.
- La API deriva `skills` de IDs autorizados en el servidor. Nunca toma dueño o nombre del aula desde el cliente.
- No alterar esquema Prisma si no hace falta. Cualquier necesidad de migración se eleva al planner y no se despliega experimentalmente.
- Fixtures, escrituras y verificaciones de DB exclusivamente en `fragments_test`; ninguna lectura/escritura de `fragments_prod`.

## Aceptación GIVEN / WHEN / THEN

- GIVEN una matrícula activa y catálogo disponible, WHEN el estudiante abre Habilidades, THEN la API muestra solo habilidades habilitadas de su aula.
- GIVEN un usuario sin matrícula activa, WHEN consulta aula ajena, THEN recibe denegación/no encontrado y no obtiene catálogo.
- GIVEN una habilidad disponible, WHEN la busca, selecciona, filtra y cambia de etapa, THEN permanece seleccionada.
- GIVEN catálogo de 0, 3, 12, 30, 50 o 100 entradas, WHEN se muestra, THEN conteos/búsqueda y expansión reflejan el total real sin cargar todo visualmente de inicio.
- GIVEN selección guardada, WHEN recarga y vuelve a la etapa, THEN se restaura desde el borrador versionado.
- GIVEN IDs arbitrarios, deshabilitados o archivados en el cuerpo, WHEN el cliente guarda, THEN el servidor rechaza la solicitud sin persistir cambios.
- GIVEN ausencia de fuente autoritativa de requeridas, WHEN se representa la sección, THEN ninguna habilidad del aula aparece marcada como obligatoria.

## Verificación prevista

Pruebas unitarias API y UI con respuestas controladas; suite HTTP/Prisma/PostgreSQL con fixtures rotuladas y solo si se valida `fragments_test`; typecheck, lint y build. QA visual y E2E únicamente con Ego Lite, capturas en los seis anchos requeridos. Revisor B independiente entrega PASS/REVISAR y hallazgos concretos.

## Decisiones y resultado local comprobado

- `mentorSkills` quedó como vínculo interno opcional en el JSON versionado de propuestas (`classroomId` y hasta 20 `selectedSkillIds`), con `expectedVersion` ya existente. Se deriva la lista pública de nombres en API; no se necesita migración.
- La etapa Habilidades carga aulas y catálogo por el API del estudiante, conserva selecciones por aula, persiste tras guardar/reabrir y omite el vínculo interno en la vista docente y snapshots.
- Como F18.B no define habilidades obligatorias, la sección queda en estado explícito «Sin asignación».
- La suite HTTP contra `fragments_test` verifica seis tamaños de catálogo y persistencia. La revisión visual independiente B es PASS tras revisar capturas Ego Lite reales de seis viewports y casos 3/30/100.
- Ver comandos/resultados y límites de integración en `evidencie.md` e `F17_UX07_EVIDENCIAS/INFORME_FINAL.md`.
