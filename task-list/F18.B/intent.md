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

## No objetivos

Review/Inspector, entregas oficiales, nota/F26, fechas, archivos adjuntos, co-docencia, importación DOCX, banco Trainer, cambios de rúbrica, ejecución de código estudiantil, escrituras productivas manuales, migración de producción fuera del F14 autorizado.

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

## Incremento UI estudiantil — reintentar recursos del aula

- Problema: si falla la carga de habilidades o misiones de un aula activa, el estudiante ve el error sin poder recuperarlo de forma local.
- Objetivo: añadir reintentos independientes por aula y recurso, sin refrescar el dashboard ni volver a solicitar el recurso hermano.
- No objetivos: cambiar contratos/APIs, la lista principal de aulas, autenticación, datos o sesiones reales.
- Owner de tarea: PLANNER. Implementación en `StudentClassroomsScreen` y prueba de componente.
- Criterio: errores accesibles, carga anunciada durante el reintento y deduplicación mientras el mismo recurso/aula tenga una solicitud pendiente.

## Incremento de continuidad — limpiar selección de misión al volver a Mentor

- Problema: al volver desde una propuesta iniciada con misión, la selección de la misión podía sobrevivir al cambio de ruta. Abrir Mentor desde la navegación podía asociar por error una propuesta nueva a la versión anterior.
- Objetivo: al abandonar la propuesta hacia el catálogo o abrir Mentor desde la navegación, limpiar el snapshot de misión seleccionado. Iniciar una propuesta desde una misión debe seguir conservando exactamente ese snapshot y su `assignmentVersionId`.
- Alcance: navegación y estado en `apps/web/src/App.tsx`, con regresión de composición en `apps/web/src/App.student-flow.test.tsx`; sin contratos, endpoints, persistencia o producción.
- Criterio: una prueba de ruta real de componentes confirma que el borrador iniciado desde la misión lleva su versión publicada, y que después de volver y abrir Mentor por navegación el borrador nuevo no lleva esa asociación y usa el contexto general vigente.
