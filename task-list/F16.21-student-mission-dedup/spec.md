# Especificación F16.21 — Deduplicar misión prioritaria

## Entrada y salida

- Entrada: propuestas propias y misiones autorizadas que `StudentDashboard` ya recibe.
- Salida: contexto único en la acción prioritaria para una propuesta vinculada y tarjetas secundarias para las otras misiones.
- No se agregan lecturas, escrituras, rutas ni contratos.

## Comportamiento

- Si la propuesta prioritaria tiene un `assignmentVersionId` que coincide exactamente con una misión cargada, mostrar en su contexto aula, misión/versiones, todos sus objetivos y habilidades obligatorias reales.
- No volver a renderizar esa misma versión como tarjeta secundaria.
- Mantener las otras misiones y sus acciones existentes: abrir su propuesta vinculada o iniciar la misión en Mentor.
- Sin una coincidencia exacta, no deduplicar ni asociar metadatos de otra versión.

## Criterios de aceptación

- GIVEN una propuesta prioritaria vinculada a misión M, WHEN M aparece en el arreglo de misiones, THEN sus datos se muestran en el contexto principal y M no aparece como tarjeta secundaria.
- GIVEN además una misión distinta N, WHEN se presenta el Dashboard, THEN N conserva su tarjeta y CTA real.
- GIVEN una propuesta sin vínculo exacto, WHEN se presenta el Dashboard, THEN no se deduplican otras misiones ni se muestra contexto de M como si perteneciera a la propuesta.
- GIVEN objetivos/habilidades de la versión exacta, WHEN se construye el contexto, THEN se presentan sin truncar ni inventar contenido.
