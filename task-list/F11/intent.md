# F11 — Control docente de Mentor

**Problema:** Mentor deja que el modelo decida el puntaje y no conserva qué temática ni rúbrica motivaron cada evaluación. Repetir una solicitud idéntica puede producir otra nota.

**Objetivo:** dar al docente un borrador editable de una configuración temática y su rúbrica, publicar versiones inmutables, aplicarlas a todas las propuestas estudiantiles, calcular el puntaje en el servidor, reutilizar evaluaciones idénticas y consultar el historial con su versión de origen.

**No objetivos:** múltiples configuraciones activas, asignación individual, gestión de cursos, JEV, calibración comparativa, dashboard analítico, llamadas reales a IA durante pruebas o despliegue.

**Owner:** PLANNER. Implementación en rama aislada `codex/mentor-control`, separada del checkout F10.

**Superficies:** `packages/contracts`, `apps/api/src/{db,features/mentor,adapters/ai,http,main.ts}`, `apps/web/src/{App.tsx,features/mentor,features/mentor-control,lib/api}`, `evals/` si aporta fixtures reutilizables, `task-list/F11/` y `.gitignore` para el paquete privado de evidencia.

**Skills:** `ego-browser` v2.2.0 ejecutada antes del QA visual/E2E. Skills `test-driven-development` y `backend-architecture` no están instaladas en el entorno; se aplicó TDD con fixtures fake y los límites de arquitectura de `AGENTS.md`.

**Criterio:** flujo vertical docente edita→publica→estudiante evalúa→servidor calcula y guarda→docente consulta la versión y desglose. Solo una versión publicada está activa globalmente; resultados previos son inmutables.
