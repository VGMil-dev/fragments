# Especificación — aislamiento de rúbricas por misión

## Criterios de aceptación

- En PostgreSQL aislado, crear y publicar dos misiones de una misma aula con rúbricas propias distintas.
- El listado estudiantil muestra la rúbrica vigente de cada misión con su versión y criterios correctos.
- Publicar la versión 2 de la misión A muestra su nueva rúbrica en A sin cambiar la rúbrica vigente de B.
- Los snapshots de misión A v1 y misión B v1 conservan su rúbrica original.
- Ejecutar la prueba bajo la guarda existente que exige `current_database() = fragments_test`; fixtures aislados con identidad docente/estudiante sintética y limpieza posterior.
- No se requiere release F14 porque la prueba no cambia runtime. No elevar CU-12 a PASS integral mientras falte aceptación autenticada en Ego Lite.
