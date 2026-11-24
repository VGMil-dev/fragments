# Especificación F18.B.3 — Rúbrica de misión y entregas

## Modelo congelado por Planner

- `AssignmentDraft` añade `missionRubric` y `deliverables`.
- Una misión contiene entre 1 y 10 criterios propios. Cada criterio tiene ID estable, título, descriptor y peso entero; los pesos suman 100. Esto fija la rúbrica de Mentor de la misión, sin convertirla en nota oficial.
- Una misión puede definir entre 2 y 12 entregas ordenadas. Cada entrega tiene ID estable, título, tipo (`proposal`, `progress`, `final`), requisitos, fecha/hora opcional y uno o más IDs de criterios de la rúbrica de la misión. No se exige una cantidad fija de tres.
- Los IDs de criterios usados por entregas deben existir en `missionRubric`; los IDs de entregas son únicos y su orden debe ser continuo desde 1.
- `AssignmentVersion` contiene snapshots inmutables de rúbrica y entregas. `StudentAssignment` devuelve la misma configuración publicada.
- El estudiante conserva un solo proyecto/propuesta por versión de misión; las entregas no crean copias ni repositorios nuevos.
- Versiones históricas sin los campos nuevos se leen sin mutación ni migración. La creación/edición nueva debe incluir la configuración explícita.

## Persistencia y permisos

- Usar `draftJson` y `snapshotJson` existentes; no agregar columnas ni migraciones.
- Autoría, aula, matrícula y versión siguen derivadas en backend. Ningún dato de propiedad entra desde el cliente.
- Publicar copia campos de rúbrica/entregas a una versión nueva. Editar no modifica versiones publicadas anteriores.
- No calcular ni combinar notas, no aplicar bloqueos por vencimiento y no cambiar estado de propuestas o Reviews.
- La ampliación de DTO es opt-in con `x-fragments-mission-plan: 1`. El API devuelve `missionPlanVersion: 1` y los campos extendidos solo a clientes nuevos; sin ese header se eliminan los campos nuevos para que bundles antiguos mantengan sus contratos estrictos. El cliente nuevo exige el marcador y falla cerrado si habla con una API anterior. El cliente antiguo puede conservar la publicación legacy con F11 mientras no envíe el header.

## Aceptación

1. Los contratos rechazan pesos distintos de 100, IDs repetidos, orden discontinuo, criterio inexistente y menos de dos entregas.
2. Crear/actualizar borradores conserva rúbrica/entregas en PostgreSQL aislado.
3. Publicar v2 deja idéntico el snapshot de v1 y el estudiante recibe la configuración de v2 por su DTO autorizado.
4. Evaluación Mentor usa el snapshot de rúbrica de la versión de misión vinculada, no la rúbrica global activa más reciente.
5. La UI docente permite editar la rúbrica y la lista de entregas; la vista previa y Mis aulas muestran los mismos criterios e instrucciones publicadas.
6. Los resultados se verifican con pruebas deterministas, integración PostgreSQL cuya `current_database()` sea `fragments_test` y revisión Ego Lite. No se llama IA real.
