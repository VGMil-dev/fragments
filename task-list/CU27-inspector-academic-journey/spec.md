# CU-27 — Especificación de la prueba integrada

## Dado

- Aula y matrícula activa de fixtures propios en PostgreSQL aislado.
- Misión publicada con entregas, proyecto y Review final procesada mediante provider fake.
- Evidencia verificada que coincide con el snapshot cuyo SHA es el commit final.

## Cuando

- El docente de fixture crea el reto Inspector desde el ID de la Review final.
- Lo asigna y registra observación de mutación/restauración.
- Consulta la lista de retos de esa Review.

## Entonces

- El reto y la defensa se persisten en PostgreSQL, asociados al ID de Review y al SHA final exacto.
- El registro queda `completed` y conserva evidencia citada del snapshot.
- `teacherHint` aparece en la respuesta docente.
- La prueba no afirma evaluación semántica real ni acceso estudiantil a la UI.
