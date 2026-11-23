# Especificación F18.C — Compartir Review con contexto académico

## Reglas

1. La vinculación es opcional y requiere selección explícita del estudiante al enviar Review.
2. El cliente solo envía `linkedProposalId`; el servidor resuelve el resto. La propuesta debe pertenecer a la sesión estudiantil, apuntar a una versión de misión publicada en un aula activa y la matrícula del estudiante debe seguir activa.
   El propietario del repositorio de Review debe coincidir con el `githubLogin` de la identidad Better Auth vinculada; no se asume autoría en repositorios de terceros u organizaciones.
3. El servidor congela en el payload JSON del job la propuesta/versión, misión/versión, contexto Mentor, aula, estudiante y commit. No se agrega ni ejecuta migración.
4. `GET /api/teacher/classrooms/:classroomId/reviews` requiere sesión docente y devuelve únicamente resultados explícitamente vinculados, de un aula activa propiedad del docente y con estudiante aún matriculado. Aula ajena o inactiva responde como no encontrada; sesión no docente recibe 403.
5. El DTO no incluye correo, ID de usuario, contenido de código ni datos de sesión. Incluye etiqueta docente disponible, propuesta/misión, repo, SHA, estado y score solo al completar. La consulta SQL filtra matrículas activas antes del límite de 100 resultados.
6. Un reintento usa la asociación y verificación de propietario original, inmutables, y mantiene su clave de idempotencia; no re-resuelve una propuesta ni depende de que el estudiante conserve el mismo `githubLogin` después.
7. La UI docente es informativa y de solo lectura; las puntuaciones se presentan como orientación formativa, no nota oficial.
8. Sin migraciones, llamadas de proveedor, ejecución de código de alumnos ni escrituras en producción.

## Pruebas de aceptación

- Solo el estudiante propietario puede adjuntar una propuesta válida; otro estudiante obtiene respuesta indistinguible de recurso ausente.
- La consulta docente queda limitada a propiedad de aula y matrícula activa; no lista Jobs no vinculados.
- El almacenamiento preserva el snapshot académico y el reintento preserva el mismo vínculo.
- El formulario omite vínculo por defecto y solo envía `linkedProposalId` al seleccionar la opción.
- La vista docente distingue estado/score, aula vacía y errores sin exponer campos internos.
- En el router HTTP compuesto, `GET /api/teacher/classrooms/:classroomId/reviews` se despacha al handler de Review antes del catch-all de Classroom Studio; el test usa el handler montado y no solo la ruta aislada.
