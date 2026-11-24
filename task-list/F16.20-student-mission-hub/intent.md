# F16.20 — Contexto académico de la acción prioritaria

## Problema

El Dashboard ya prioriza la propuesta guardada más reciente, pero oculta el aula, la misión y las habilidades obligatorias que pertenecen a esa propuesta cuando sus respuestas actuales sí incluyen el snapshot académico.

## Objetivo

Mostrar junto a la propuesta prioritaria el contexto académico que coincide exactamente con `assignmentVersionId`: aula y misión desde la lista de misiones autorizadas, y versión de contexto Mentor y habilidades desde el snapshot guardado. Si falta la fuente correspondiente, dejar claro el estado sin inventar nombres, progreso o vínculos.

## No objetivos

- No cambiar prioridades de borrador/misiones, CTA, navegación, contratos, API, permisos ni persistencia.
- No añadir XP, recompensas, KPIs, puntuaciones ni porcentajes.
- No integrar ilustraciones o recursos visuales nuevos.
- No guardar datos ni desplegar.

## Owner y criterio

- Owner: UI de Dashboard estudiantil.
- Skill aplicada: `vercel-react-best-practices`; se conserva el estado derivado en render, sin efectos ni trabajo asíncrono nuevo.
- El vínculo se valida con el `assignmentVersionId` superior exacto. Una `assignmentContext` con otro ID no se mezcla con el contenido de la propuesta.
