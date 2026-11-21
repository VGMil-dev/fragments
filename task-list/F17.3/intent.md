# F17.3 — Intent: Mentor · Habilidades

Owner: PLANNER + Agentes A/B

## Problema y objetivo

La etapa 3 de Mentor muestra un aviso temporal: aún no consulta las habilidades autorizadas de las aulas ni permite seleccionar y persistirlas. UX-07 busca reproducir la composición aprobada de Pixel Night con datos reales de F18.A y guardar la selección dentro del borrador versionado de Mentor, sin tratar las habilidades disponibles en el aula como obligatorias.

## Objetivos

- Consultar las aulas propias del estudiante y el catálogo habilitado de un aula desde `GET /api/me/classrooms` y `GET /api/me/classrooms/:classroomId/skills`.
- Mostrar búsqueda, conteos derivados del catálogo, selección múltiple, lista inicial acotada, expansión incremental y selecciones visibles aunque no coincidan con la búsqueda.
- Conservar la elección al navegar las seis etapas, buscar, cambiar el aula seleccionada y recargar el borrador.
- Guardar selecciones con el borrador existente y su control de versión.
- Validar en servidor identidad, matrícula activa, aula propia y pertenencia/estado de cada ID elegido; no confiar en nombres o IDs arbitrarios del cliente.
- Mostrar una sección de habilidades obligatorias solo cuando una fuente académica autorizada las marque explícitamente; la disponibilidad de aula no equivale a obligatoriedad.
- Documentar claramente cualquier parte que dependa de F18.B.

## No objetivos

- Crear misiones, rúbricas ni asignaciones de habilidades por misión de F18.B.
- Añadir migraciones si el JSON versionado de propuesta resuelve la persistencia.
- Crear catálogos fijos en frontend, inventar registros requeridos o mostrar acciones de guardado simuladas.
- Usar o modificar `fragments_prod` para fixtures o QA.

## Criterio de trabajo

Seguir `AGENTS.md`, contratos congelados y F18.A. Skills obligatorias: Ego Lite para QA visual/E2E y Vercel React Best Practices para estado, acceso a datos y renderizado. El coordinador autoriza cualquier extensión de contrato antes de su implementación.
