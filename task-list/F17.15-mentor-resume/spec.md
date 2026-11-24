# Especificación F17.15

## Alcance

- La navegación a una propuesta propia representa su ID en un parámetro de ruta de Mentor/Review.
- En acceso directo o recarga, la aplicación consulta `GET /api/me/proposals` (ya existente) y resuelve el ID solo entre propuestas devueltas para la sesión estudiantil autenticada.
- El snapshot de misión, contexto y habilidades proviene de la propuesta devuelta por el servidor; no se acepta contexto académico proporcionado por URL.
- Mientras se resuelve la propuesta se muestra carga. Si falla la consulta o el ID no pertenece a las propuestas propias disponibles, se muestra un error recuperable y no un editor vacío.
- La navegación habitual sin ID conserva la acción explícita de crear una propuesta nueva.

## Criterios de aceptación

1. GIVEN una propuesta propia `p1`, WHEN se abre Mentor con `proposalId=p1`, THEN la UI espera la consulta propia y muestra la propuesta/version/contexto/skills exactos.
2. GIVEN la URL de una propuesta propia, WHEN la página se recarga, THEN el mismo ID se resuelve de nuevo sin escribir, duplicar ni evaluar.
3. GIVEN un ID ausente de `GET /api/me/proposals`, WHEN se abre la ruta, THEN no muestra una propuesta vacía ni divulga datos de otra cuenta y ofrece volver a Mis proyectos.
4. GIVEN la consulta de propuestas falla, WHEN la ruta conserva `proposalId`, THEN presenta error y reintento, no un formulario nuevo.
5. GIVEN una navegación sin `proposalId`, WHEN el estudiante elige crear propuesta, THEN se conserva el flujo actual de nueva propuesta.

## Verificación

Prueba focal `App.student-flow`, suite web, typecheck, build y `git diff --check`. Ego Lite producción posterior al release y acción explícita de reabrir son validaciones separadas; esta tarea no crea ni evalúa propuestas en producción.
