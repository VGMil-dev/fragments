# Especificación F16.13

- Aplicar tokens y jerarquía Pixel Night al encabezado del Inspector docente, selección/carga de revisión, reto activo y formulario de defensa existentes.
- Enfatizar evidencia verificada, SHA/contexto disponibles y criterios de modificación/restauración solo desde campos ya presentes en el DTO.
- Mantener estados de autenticación, carga, revisión vacía, error y reto asignado basados en respuestas/estado existentes.
- Preservar la visibilidad actual de `teacherHint` exclusivamente para docente autorizado; no mostrarlo al estudiante ni en vistas públicas. No exponer una solución privada ni modificar autorización o perfil de sesión.
- No cambiar `App.tsx`, routing, API, contratos, handlers, persistencia, migraciones ni F06.
- Sin arte nuevo ni nuevas dependencias. Evitar notas, puntajes o porcentajes inventados.
- Usar pruebas focales/TDD, typecheck/build y `git diff --check`; revisar 320/390/768/1024/1440 px, teclado/foco y reduced-motion si Ego Lite lo permite.
- QA visual post-release debe reutilizar la sesión docente existente; conservar todas sus páginas y registrar NO COMPROBADO si el TaskSpace no admite una página nueva de forma segura.
