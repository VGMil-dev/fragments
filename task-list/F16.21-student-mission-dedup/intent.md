# F16.21 — Quitar misión duplicada del Dashboard

## Problema

Cuando la acción prioritaria muestra una propuesta vinculada a una versión exacta de misión, esa misma misión vuelve a aparecer como una tarjeta secundaria. La duplicación repite el contexto y hace parecer que hay otra acción disponible para el mismo trabajo.

## Objetivo

Excluir de la lista secundaria solo la versión `assignmentVersionId` ya representada en la propuesta prioritaria. Mantener objetivos y habilidades de esa versión en el contexto principal y conservar las demás misiones con sus CTAs reales.

## No objetivos

- No cambiar contratos, rutas, permisos, APIs, migraciones ni navegación.
- No inferir relaciones a partir de contextos con ID distinto o de otra versión.
- No crear objetivos, habilidades o progreso.
- No usar producción ni Ego Lite.

## Owner y criterio

- Owner: UI del Dashboard estudiantil.
- Skill aplicada: `vercel-react-best-practices`; estado visual derivado en el render y listas de React con keys estables.
- La deduplicación solo usa el `assignmentVersionId` superior que coincide exactamente con `StudentAssignment.id`.
