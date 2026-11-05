# F06 — Intent

**Problema:** un reto Inspector debe partir de evidencia verificada de un commit exacto y mantener la guía docente privada al estudiante.

**Objetivo:** implementar un slice Inspector conectado que crea retos de mutación inversa desde evidencia verificada, mantiene la guía docente privada, permite asignar y registrar defensa, conserva/obsoleta retos al cambiar el commit y presenta un panel docente accesible.

**No objetivos:** no ejecutar código de estudiantes ni mostrar `teacherHint` en una vista de estudiante. Las llamadas autorizadas a GitHub/AI Gateway solo pueden usar repositorios públicos, evidencia verificada y el ledger F05.

**Nota de integración:** después de la entrega aislada W6 se integraron contratos, rutas, SQLite, la composición normal del API y login docente por cookie firmada. La generación real solo se permite a partir del fragmento literal de evidencia verificada y con el ledger de F05.

**Owner:** W6.

**Skills consultadas:**
- `ego-browser`: se leyó y ejecutó el skill v2.2.0; QA visual con Ego Lite realizado para `/teacher/inspector` a 390px y 1440px.
- `backend-architecture`, `test-driven-development`, `verification-before-completion`: no se encontraron archivos locales `SKILL.md` en las carpetas `.codex/skills` y `.agents/skills` consultadas. Se aplicó TDD con tests locales y adaptadores inyectables.
- Criterio de diseño: reutilizar contratos compartidos de reto privado/público y registro; mantener UI móvil, legible, con nota privada delimitada y rutas teacher-only.
