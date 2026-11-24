# Especificación F16.20 — Contexto académico de propuesta prioritaria

## Entrada y salida

- Entrada: perfil, propuestas propias, misiones autorizadas y estados de carga/error ya entregados por `StudentDashboard`.
- Salida: una sección semántica etiquetada dentro de la acción prioritaria, con los datos académicos reales disponibles para la propuesta más reciente.
- No hay cambios en rutas, API, contratos ni escritura de datos.

## Comportamiento

- Si la propuesta prioritaria tiene `assignmentVersionId` y una misión cargada con ese ID, mostrar aula, título/versión de misión y habilidades obligatorias del snapshot de misión.
- Si `assignmentContext.assignmentVersionId` coincide exactamente con `assignmentVersionId`, mostrar versión de contexto Mentor y habilidades del snapshot guardado. Si el listado de misiones aún no ofrece la misión, no inferir aula ni título.
- Si no hay contexto guardado coincidente ni misión consultable, comunicar carga, error o falta de contexto con el estado existente. La acción de abrir la propuesta permanece disponible.
- Si los IDs no coinciden, no combinar snapshots.
- Una única acción primaria real y la prioridad existente del Dashboard se conservan.

## Criterios de aceptación

- GIVEN una propuesta vinculada a una misión y contexto coincidentes, WHEN se muestra como siguiente paso, THEN el Dashboard presenta aula, misión/versión, contexto Mentor y habilidades disponibles.
- GIVEN un snapshot guardado coincidente y sin misión en la consulta actual, WHEN se muestra la propuesta, THEN se muestran únicamente contexto y habilidades del snapshot, sin inventar aula o título.
- GIVEN un `assignmentContext` con ID distinto al vínculo superior, WHEN se muestra la propuesta, THEN esos datos no aparecen asociados a ella.
- GIVEN una consulta de misiones pendiente o fallida y sin snapshot guardado, WHEN se muestra una propuesta vinculada, THEN se anuncia el estado y se conserva la acción existente.
- GIVEN una propuesta no vinculada, WHEN se muestra el Dashboard, THEN no aparece contexto académico de misión.
