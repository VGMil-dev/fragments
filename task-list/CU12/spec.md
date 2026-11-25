# Especificación CU-12 — peso inválido de rúbrica

## Aceptación

- GIVEN un borrador de misión cuya rúbrica suma 99, WHEN el docente lo consulta, THEN «Publicar» permanece deshabilitado y se muestra el total 99/100 con una instrucción clara para corregirlo.
- GIVEN una petición de publicación que intenta omitir la validación de UI con una rúbrica de 99 puntos, WHEN la procesa el servidor, THEN no crea una versión publicada ni cambia el estado publicado.
- GIVEN una rúbrica válida de 100 puntos, WHEN se consulta una misión completa, THEN la publicación sigue disponible.

## Límites

- Probar la UI con fixtures y la guarda de servidor con repositorio fake; no modificar PostgreSQL productivo ni invocar IA.
- Verificar el despliegue mediante F14; Ego Lite productivo solo confirma comportamiento visual si vuelve a estar disponible un Space docente autorizado.
