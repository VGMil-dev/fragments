# CU-23 — Specification

## Aceptación

- GIVEN dos resultados Review propios del mismo proyecto con commits y rúbricas distintas, WHEN se abre «Mis entregas», THEN cada fila conserva fecha, puntaje, rúbrica y SHA exactos, y el orden es del resultado más reciente al más antiguo.
- GIVEN una entrega Mentor, WHEN se lista, THEN muestra su rúbrica/fecha sin inventar un SHA de Review.
- GIVEN un job Review de otra identidad, WHEN se consulta el historial propio, THEN su SHA, rúbrica, puntuación y existencia no se filtran.
- GIVEN un snapshot Review histórico sin SHA válido, WHEN se lista, THEN no se entrega un SHA fabricado y el contrato sigue siendo compatible.
- GIVEN más de 200 Reviews de otras identidades más un Review propio más antiguo, WHEN se consulta el historial, THEN el límite de 200 se aplica después del filtro por propietario y conserva el resultado propio.
- GIVEN integración PostgreSQL, WHEN corre el test, THEN confirma `current_database() = fragments_test` antes de las fixtures.

## Fuera de alcance

- Comparación algorítmica de código/criterios, nueva vista docente, nueva tabla o migración.
- Evaluación IA real, operaciones productivas y navegador alternativo a Ego Lite.
