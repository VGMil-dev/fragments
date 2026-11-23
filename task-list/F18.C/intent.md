# F18.C — Seguimiento de Review vinculado a misiones

## Intención

Cerrar un tramo funcional del ciclo académico: permitir que un estudiante comparta voluntariamente una revisión de su commit desde una propuesta propia ligada a una misión publicada, y que el docente dueño del aula consulte el estado y la puntuación orientativa de esa revisión.

La autorización se deriva en el servidor desde Better Auth, propiedad de la propuesta, versión publicada y matrícula activa. No se comparten Reviews sin opt-in ni se exponen correos o IDs internos. Las notas oficiales siguen en Moodle.

## Resultado esperado

- Formulario de Review con selector opcional de propuesta académica válida.
- Snapshot de propuesta, misión y contexto preservado dentro del job, sin migración de base.
- Ruta docente de solo lectura filtrada por aula activa y matrículas activas.
- Recuperación de reintentos conserva el vínculo académico original.
- Pruebas de aislamiento y UI locales; sin llamadas IA ni escrituras productivas.

## Corrección de continuidad — despacho de ruta docente

- Cerrar el defecto observado en producción donde el router de Classroom Studio interceptaba la ruta de Reviews del aula y devolvía 404 antes del handler funcional.
- Probar el despacho mediante el router HTTP compuesto para evitar que una prueba aislada del handler pase mientras la aplicación real oculta la ruta.
