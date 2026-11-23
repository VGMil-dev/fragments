# F18.B — Misiones versionadas por aula

Owner: PLANNER

## Problema y objetivo

Después de crear aulas y habilitar habilidades, falta el núcleo pedagógico que conecte el trabajo del docente con el proyecto del estudiante. F18.B permite crear tareas por aula, reutilizar habilidades del catálogo privado, conservar versiones publicadas y mostrarlas solo a matrículas activas.

## Objetivos de este incremento

- Crear y editar borradores de tarea con título, consigna, objetivos y habilidades requeridas/optativas.
- Publicar una versión inmutable con snapshots de las habilidades seleccionadas y versión de contexto Mentor F11.
- Al editar una tarea publicada, crear un nuevo borrador/versionado sin cambiar la versión previa.
- Listar tareas del docente dueño y tareas publicadas de aulas activas del estudiante autenticado.
- Integrar UI docente en el detalle del aula y lectura estudiantil en Mis aulas, preservando shells/rutas existentes.
- Al recuperar una propuesta guardada, indicar su misión publicada/contexto vinculados sin exponer rúbrica ni perder la identidad de la propuesta.
- Verificar que el vínculo académico versionado sobreviva hasta una Review completada y aparezca en la lista Trainer del mismo estudiante, usando proveedores fake en `fragments_test`.
- En Mis aulas, conservar visibles los nombres de habilidades del snapshot y permitir consultar sus descripciones sin ocupar espacio con texto largo siempre expandido.

## No objetivos

Review/Inspector, entregas oficiales, nota/F26, fechas, archivos adjuntos, co-docencia, importación DOCX, generación/banco de retos Trainer, cambios de rúbrica, ejecución de código estudiantil, escrituras productivas manuales, migración de producción fuera del F14 autorizado.

## Seguridad y datos

- La autoridad docente deriva exclusivamente de Better Auth; jamás aceptar `teacherId` del cliente.
- Estudiante: consulta basada en sesión, matrícula `active` y aula `active`; IDs manipulados no filtran otras aulas.
- Usar PostgreSQL de prueba `fragments_test` con preflight `current_database()` para tests de integración; no tocar `fragments_prod` desde pruebas.
- Snapshot versionado debe conservar texto, orden, nombres/descripciones de habilidades y `mentorContextVersion`; nunca modificar versiones publicadas.
- No sumar notas ni crear motor de rúbrica: F11 sigue siendo la fuente versionada de Mentor.

## Criterio de cierre

Contrato, pruebas unitarias/integración con fakes, typecheck/lint/build, aislamiento docente/estudiante, recorrido Ego Lite de perfiles disponibles y evidencia actualizada. Distinguir bloqueos de sesión o recursos de QA; no declarar despliegue ni recorrido productivo sin evidencia real.

## Corrección derivada de QA v0.5.10

El contexto de Mentor debe conservar el snapshot académico completo de la versión publicada: objetivos, habilidades obligatorias y optativas, además de todos los requisitos de F11. Ningún criterio puede truncarse silenciosamente. La configuración editable F11 conserva su límite original; el límite ampliado se aplica únicamente al contexto efectivo de evaluación.

## Incremento — transportar habilidades obligatorias como contexto estructurado

- Problema: al recuperar una propuesta, el cliente identifica habilidades obligatorias buscando un prefijo de texto dentro de los requisitos de Mentor. Una etiqueta traducida o reformulada podría ocultar una obligación aunque el snapshot publicado siga íntegro.
- Objetivo: exponer en `assignmentContext` las identidades y nombres de habilidades requeridas que proceden del snapshot inmutable y usarlos al recuperar Mentor.
- No objetivos: cambiar la evaluación, rúbricas, asignaciones, persistencia o autorización; introducir migraciones; alterar el texto enviado a Mentor.
- Owner: PLANNER como arquitecto de contrato compartido y API; pruebas UI/API se mantienen en sus superficies respectivas.

## Incremento de continuidad — recorrido misión → Mentor

- Añadir una regresión PostgreSQL aislada que publique una misión v1, inicie y recupere una propuesta ligada a esa versión, publique v2 y compruebe que el borrador/evaluación fake conserva la misión y contexto originales.
- Ejecutar únicamente contra `fragments_test` con preflight de `current_database()`; fixtures con UUID, limpieza acotada y proveedor local fake.
- Mantener la calidad real de IA y el recorrido productivo como NO COMPROBADOS.

## Incremento de continuidad — contexto académico en Mis aulas

- Antes de iniciar propuesta, el estudiante puede abrir un panel plegable que explica el tema, la consigna, el nivel esperado y los requisitos del contexto Mentor fijado en la versión publicada de la misión.
- La interfaz identifica la versión del contexto para que el alumno sepa qué snapshot acompaña a su misión. No modifica ni expone pesos/rúbrica, y conserva el CTA existente para iniciar propuesta con el mismo objeto de versión.

## Incremento F18.B — acceso al catálogo desde el aula docente

- Problema: si el aula no tiene habilidades disponibles (ninguna asociada o todas archivadas), el detalle explica que deben crearse en el catálogo pero no ofrece una acción junto al bloqueo.
- Objetivo: añadir un enlace contextual accesible a `/teacher/skills` junto al estado vacío, conservando el mensaje existente.
- No objetivos: cambiar contratos, rutas compartidas, datos, catálogo ni el flujo de habilitación.
- Owner de tarea: PLANNER. Implementación acotada al detalle de `ClassroomStudio` y su prueba UI.
- Skill aplicada: `vercel-react-best-practices`; se usa un enlace semántico con navegación existente; se descartan optimizaciones ajenas a este cambio pequeño.

## Incremento F18.B — inspección de snapshots publicados

- Problema: el listado docente expone el número publicado, pero no permite inspeccionar el contenido inmutable, habilidades fijadas y contexto Mentor de cada versión.
- Objetivo: hacer revisable el historial publicado desde el detalle del aula usando los snapshots que ya entrega la API.
- No objetivos: editar versiones publicadas, cambiar APIs/contratos, contexto activo, rutas, esquema o migraciones.
- Owner de tarea: PLANNER. Implementación local a la vista docente de misiones y su prueba UI.
- Criterio: resumen plegable por misión; al abrir, cada versión publicada muestra texto, objetivos, categorías de habilidades y `mentorContextVersion`.

## Incremento F18.B — recuperación del listado de misiones docentes

- Problema: si falla la consulta de misiones del aula docente, la vista acababa mostrando “Aún no hay misiones en esta aula”, confundiendo una caída de carga con una respuesta vacía válida.
- Objetivo: distinguir error, carga y vacío; ofrecer un reintento que consulte solo el listado de misiones del aula.
- Alcance: estado local y vista de `ClassroomStudio` / `AssignmentsPanel`; sin cambios de API, contrato, persistencia o datos.
- Criterio: una prueba de UI falla primero la lectura y comprueba el error accesible, ausencia del vacío falso, reintento y estado vacío tras la respuesta vacía válida.

## Incremento UI estudiantil — reintentar recursos del aula

- Problema: si falla la carga de habilidades o misiones de un aula activa, el estudiante ve el error sin poder recuperarlo de forma local.
- Objetivo: añadir reintentos independientes por aula y recurso, sin refrescar el dashboard ni volver a solicitar el recurso hermano.
- No objetivos: cambiar contratos/APIs, la lista principal de aulas, autenticación, datos o sesiones reales.
- Owner de tarea: PLANNER. Implementación en `StudentClassroomsScreen` y prueba de componente.
- Criterio: errores accesibles, carga anunciada durante el reintento y deduplicación mientras el mismo recurso/aula tenga una solicitud pendiente.

## Incremento — continuar la misión en Trainer

- Problema: el vínculo académico opcional se conserva en Review y aparece en el seguimiento docente, pero Trainer solo identifica el repositorio y commit; el estudiante pierde de vista la misión, su versión de Mentor y las habilidades obligatorias al pasar a practicar.
- Objetivo: transportar al listado de Reviews propios un resumen de misión validado desde el snapshot vinculado y mostrarlo junto al análisis seleccionado en Trainer.
- Contenido: título/aula de misión, versión publicada, versión de contexto Mentor y nombres de habilidades obligatorias. Para trabajos históricos sin snapshot de habilidades, indicarlo como no disponible; una lista explícitamente vacía significa que no hay habilidades obligatorias.
- Seguridad: derivar el resumen de `academicLink` persistido solo cuando `context.studentId` coincide con el dueño de la consulta y `linkedProposalId` coincide con `academicLink.proposalId`. No devolver IDs internos, rúbrica, score ni contenido de propuesta.
- No objetivos: cambiar prompts, modelo, rúbrica, evaluación, retos o banco Trainer; agregar rutas, tablas, migraciones o datos productivos.
- Owner: PLANNER/arquitecto integra contrato y persistencia del payload existente; la UI web solo presenta el DTO.
- Skill aplicada: `vercel-react-best-practices`; se prefieren datos ya cargados en el listado y renderizado condicional simple, sin una petición extra desde React.

## Incremento UI estudiantil — identificar snapshot de misión

- Problema: la tarjeta muestra el contexto Mentor versionado, pero omite la versión publicada de la misión que se enlaza a la propuesta.
- Objetivo: identificar juntas en la tarjeta la versión de misión y la versión de contexto fijadas al snapshot que recibe el CTA.
- No objetivos: cambiar creación/edición de propuestas, contratos, rutas, datos, versionado o API.
- Owner de tarea: PLANNER. Implementación local a `StudentAssignmentsList` y su prueba existente.

## Incremento de continuidad — limpiar selección de misión al volver a Mentor

- Problema: al volver desde una propuesta iniciada con misión, la selección de la misión podía sobrevivir al cambio de ruta. Abrir Mentor desde la navegación podía asociar por error una propuesta nueva a la versión anterior.
- Objetivo: al abandonar la propuesta hacia el catálogo o abrir Mentor desde la navegación, limpiar el snapshot de misión seleccionado. Iniciar una propuesta desde una misión debe seguir conservando exactamente ese snapshot y su `assignmentVersionId`.
- Alcance: navegación y estado en `apps/web/src/App.tsx`, con regresión de composición en `apps/web/src/App.student-flow.test.tsx`; sin contratos, endpoints, persistencia o producción.
- Criterio: una prueba de ruta real de componentes confirma que el borrador iniciado desde la misión lleva su versión publicada, y que después de volver y abrir Mentor por navegación el borrador nuevo no lleva esa asociación y usa el contexto general vigente.

## Incremento UI — habilidades requeridas de misión en Mentor

- Problema: Mentor mostraba siempre que no había habilidades requeridas aunque se abriese desde una misión publicada con habilidades obligatorias.
- Objetivo: mostrar las habilidades requeridas del snapshot de misión como referencia de solo lectura, tanto al iniciar una propuesta desde la misión como al recuperar una propuesta con contexto fijado.
- Las habilidades optativas del catálogo activo siguen siendo una selección independiente y editable; Mentor general conserva su estado vacío.
- No objetivos: alterar evaluación, API, contratos, rutas, backend, migraciones o selección optativa.

## Incremento UI estudiantil — misión vinculada en Mis proyectos

- Problema: el backend ya devuelve el vínculo a la versión de misión (`assignmentVersionId`), su contexto Mentor y habilidades requeridas, pero la tarjeta de “Mis proyectos” solo identifica el borrador.
- Objetivo: permitir que el estudiante inspeccione el contexto fijado antes de continuar y que Mentor recupere la misma propuesta/version/contexto sin reconstruirlo.
- Solo mostrar contexto cuya `assignmentContext.assignmentVersionId` coincida con `assignmentVersionId`; si no coincide o falta, indicar que el contexto no está disponible y no revelar sus skills.
- No objetivos: añadir versión/DTO nuevos, cambiar endpoints, contratos, evaluación, rúbrica ni persistencia.

## Cierre fail-closed del contexto al continuar propuestas vinculadas

- Al continuar una propuesta enlazada, Mentor solo puede recibir el `assignmentContext` cuyo `assignmentVersionId` coincide exactamente con el vínculo de la propuesta.
- Si el contexto falta o apunta a otra versión, Mentor presenta el estado de error y no recibe contexto, rúbrica ni habilidades de esa versión obsoleta, ni desde la propuesta activa ni desde la lista de propuestas guardadas.
- No objetivos: cambiar la persistencia, contratos, API o el comportamiento de propuestas válidas y no vinculadas.

- Dar a cada botón de recuperación de propuesta un nombre accesible que identifique su acción y título, con fallback para borradores sin título.
