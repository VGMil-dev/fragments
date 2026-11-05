# Task list verificable — Fragments

Regla: marcar `[x]` únicamente cuando `task-list/<ID>/evidencie.md` contiene comandos ejecutados, salidas y rutas reales. Marcadores iniciales son `[ ]`, no afirmar implementación previa.

| ID | Owner | Dependencias | Criterio verificable | Estado |
|---|---|---|---|---|
| F00 | PLANNER | — | Auditoría no destructiva, skills, `.env.example`/`.env` local, pausa humana y preflight; después contratos y Turbo/pnpm inicial | [x] |
| F01 | W1 | F00 | UI identidad, home, icon.svg/favicon/metadata y assets en navegador 390/1440 | [x] |
| F02 | W2 | F00 | Flujo alumno galería→Mentor→Review→descarga mock→estados de error con cliente tipado | [x] |
| F03 | W3 | F00 | API/SQLite WAL/job lease/auth docente/Docker dev-prod; integración test+health | [x] |
| F04 | W4 | F00,F03 contratos | Mentor propuesta→evaluación→snapshot→README/PDF efímeros y verificación | [ ] |
| F05 | W5 | F00,F03 contratos | Review GitHub commit→Repomix→AI gateway→evaluación→PDF, Promptfoo fixtures | [ ] |
| F06 | W6 | F00,F05 contrato | Inspector retos privados inversos→sesión→estado; pruebas seguridad y UI | [ ] |
| F07 | PLANNER | F01..F06 | Integración real, ego(lite), Promptfoo, QA, documentación final, despliegue local | [ ] |

## Estado de cierre de integración — 2026-11-04

F04–F07 siguen abiertas (`[ ]`) porque faltan criterios externos verificables: las tarifas máximas del AI Gateway no están configuradas, Promptfoo no pudo arrancar por un paquete transitivo ausente y Ego Lite informó un viewport 0×0 para interacción/capturas visuales. El código y verificaciones locales quedan documentados en las evidencias de cada tarea. No se contabilizan integraciones de IA como exitosas ni se inventan puntuaciones.

Dependencias F03/F05 son de integración, no bloquean trabajo paralelo con fake drivers y contratos congelados. Cada worker debe producir código compilable de su zona o informe de bloqueo claro. Cada tarea tiene `intent.md`, `spec.md`, `evidencie.md`.
