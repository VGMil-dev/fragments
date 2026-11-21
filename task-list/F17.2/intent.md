# F17.2 — Mentor · Contexto (UX-06)

## Problema

La etapa Contexto de Mentor solo muestra un texto personal y no presenta la configuración académica docente publicada que F18 expone. La composición aprobada de UX-06 requiere un contexto legible, solo lectura y mutuamente excluyente con el modo personal.

## Objetivo

Implementar la etapa Contexto de Mentor con la composición Pixel Night aprobada, usando únicamente la configuración publicada real de F18. Mostrar «Modo personal» solo cuando el endpoint indique que no hay configuración publicada; los fallos de consulta se muestran como error recuperable.

## No objetivos

- Modificar F21, PostgreSQL, Prisma, API, contratos o permisos.
- Modificar otras etapas de Mentor salvo estilos compartidos indispensables.
- Copiar textos, progreso, identidad, logo o íconos ilustrativos de la maqueta como datos de producto.
- Desplegar por fuera del procedimiento F14.

## Owner

Planner, con Agente A (implementación) y Agente B (revisión visual independiente).

## Referencias y skills

- Notion UX-06 aprobada: https://app.notion.com/p/41ecd5fa7ed7814e8be2fe2bbc3d3c59
- Referencia PNG: `Fragments_Mentor_Contexto_Referencia_Visual.png`, 1672 × 941 px, SHA-256 `8db5e9cdc02abb67952b83dc537cc130e155c09ef7dec02c4b405861efb972d8`.
- Skill `vercel-react-best-practices` v1.0.0: aplicar recomendaciones pertinentes de estado derivado, render condicional y componentes estables; omitir reglas exclusivas de Next.js.
- Skill `ego-browser` v2.2.1: Ego Lite como único navegador de QA.
