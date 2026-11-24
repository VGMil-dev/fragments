# F17.14 — Especificación

## UI
- Mantener seis controles accesibles en el stepper horizontal cuando el viewport supera 1100 CSS px.
- Hasta 1100 CSS px, ocultar la fila/retícula de seis controles y mostrar `Etapa N de 6 · {etapa}`, seis segmentos y el selector existente.
- Los segmentos son decorativos para lectores de pantalla; usan solo los estados actual, completado o pendiente que ya calcula Mentor.
- El selector conserva su etiqueta accesible y sigue actualizando la etapa mediante el estado existente.
- A 320–520 CSS px, apilar indicador, segmentos y selector sin scroll horizontal.

## Criterios de aceptación
- GIVEN una etapa activa, WHEN se renderiza el indicador compacto, THEN anuncia N/6 y el nombre de esa etapa.
- GIVEN seis etapas, WHEN se presenta el indicador, THEN renderiza seis segmentos decorativos con estados derivados de Mentor.
- GIVEN viewport ≤1100 CSS px, WHEN se aplica el layout, THEN no se renderiza una cuadrícula de las seis etapas.
- GIVEN viewport >1100 CSS px, WHEN se aplica el layout, THEN permanece el stepper horizontal actual con un único `aria-current="step"`.
- GIVEN cualquier cambio del selector, WHEN el usuario elige otra etapa, THEN se conserva el comportamiento actual de navegación y el contenido muestra una etapa a la vez.

## Verificación
Prueba focal Mentor, typecheck/build web y revisión de diff. QA visual de producción solo después de que F14 sirva el SHA objetivo; si no, documentar `NO COMPROBADO`.
