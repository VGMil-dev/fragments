# F17.9 — Mentor Pixel Night: idea primero

## Intento

Hacer que Mentor inicie por Idea, conserve el orden aprobado de seis etapas y evite un encabezado secundario que duplique la navegación global.

## Criterio técnico aplicado

Se revisó `vercel-react-best-practices`; al cambiar el orden de la vista se conservaron estados derivados existentes y el guardado explícito, sin agregar efectos ni trabajo adicional por render.

## Alcance

- Reordenar coherentemente el indicador, encabezados, contenido y acciones de contexto/idea.
- Mantener los estados y datos reales, progreso basado en campos válidos y guardado antes de avanzar.
- No tocar contratos, API, persistencia, rutas o reglas de evaluación.
- La pantalla continúa como candidata visual hasta revisión del propietario.
