# F06 — Intent

**Problema:** un reto Inspector debe partir de evidencia verificada de un commit exacto y mantener la guía docente privada al estudiante.

**Objetivo:** implementar un slice Inspector conectado que crea retos de mutación inversa desde evidencia verificada, mantiene la guía docente privada, permite asignar y registrar defensa, conserva/obsoleta retos al cambiar el commit y presenta un panel docente accesible.

**No objetivos:** no ejecutar código de estudiantes, llamar a GitHub o IA real, ni mostrar `teacherHint` en una vista de estudiante.

**Nota de integración del planner:** después de la entrega aislada W6, se autorizó ampliar `packages/contracts` para los DTOs Inspector y fijar rutas, persistencia SQLite e integración del panel en App. Los endpoints se protegen con sesión docente. Este slice añade adaptadores propios de Inspector para reconstruir Review desde el owner/repo/SHA guardado y verificar scrypt contra la tabla docente; la composición de API/login sigue a cargo del planner y requiere persistencia Review integrada.

**Owner:** W6.

**Skills consultadas:**
- `ego-browser`: se leyó y ejecutó el skill v2.2.0; QA visual con Ego Lite realizado para `/teacher/inspector` a 390px y 1440px.
- `backend-architecture`, `test-driven-development`, `verification-before-completion`: no se encontraron archivos locales `SKILL.md` en las carpetas `.codex/skills` y `.agents/skills` consultadas. Se aplicó TDD con tests locales y adaptadores inyectables.
- Criterio de diseño: reutilizar contratos compartidos de reto privado/público y registro; mantener UI móvil, legible, con nota privada delimitada y rutas teacher-only.
