# F06 — Intent

**Problema:** un reto Inspector debe partir de evidencia verificada de un commit exacto y mantener la guía docente privada al estudiante.

**Objetivo:** implementar la lógica de dominio que crea retos de mutación inversa, controla asignación y registro de defensa, y conserva/obsoleta retos cuando cambia el commit. Añadir un panel docente aislado sin modificar el router general.

**No objetivos:** no ejecutar código de estudiantes, llamar a GitHub o IA real, editar contratos compartidos, añadir rutas no fijadas, persistencia SQLite, ni mostrar `teacherHint` en una vista de estudiante.

**Owner:** W6.

**Skills consultadas:**
- `ego-browser`: se leyó `C:\Users\vgmil\.agents\skills\ego-browser\SKILL.md`; no se inició navegador porque el panel todavía no está conectado a una ruta visible.
- `backend-architecture`, `test-driven-development`, `verification-before-completion`: no se encontraron archivos locales `SKILL.md` en las carpetas `.codex/skills` y `.agents/skills` consultadas. Se aplicó TDD con tests locales y adaptadores inyectables.
- Criterio de diseño: usar `InspectorChallengeSchema` y `InspectorChallengePublicSchema` existentes; mantener UI móvil, legible y con notas privadas delimitadas visualmente.
