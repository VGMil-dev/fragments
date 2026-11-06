# Task list verificable — Fragments

Regla: marcar `[x]` únicamente cuando `task-list/<ID>/evidencie.md` contiene comandos ejecutados, salidas y rutas reales. Marcadores iniciales son `[ ]`, no afirmar implementación previa.

| ID | Owner | Dependencias | Criterio verificable | Estado |
|---|---|---|---|---|
| F00 | PLANNER | — | Auditoría no destructiva, skills, `.env.example`/`.env` local, pausa humana y preflight; después contratos y Turbo/pnpm inicial | [x] |
| F01 | W1 | F00 | UI identidad, home, icon.svg/favicon/metadata y assets en navegador 390/1440 | [x] |
| F02 | W2 | F00 | Flujo alumno galería→Mentor→Review→descarga mock→estados de error con cliente tipado | [x] |
| F03 | W3 | F00 | API/SQLite WAL/job lease/auth docente/Docker dev-prod; integración test+health | [x] |
| F04 | W4 | F00,F03 contratos | Mentor propuesta→evaluación→snapshot→README/PDF efímeros y verificación | [x] |
| F05 | W5 | F00,F03 contratos | Review GitHub commit→Repomix→AI gateway→evaluación→PDF, Promptfoo fixtures | [x] |
| F06 | W6 | F00,F05 contrato | Inspector retos privados inversos→sesión→estado; pruebas seguridad y UI | [x] |
| F07 | PLANNER | F01..F06 | Integración real, ego(lite), Promptfoo, QA, documentación final, despliegue local | [x] |
| F08 | PLANNER | F07 | Despliegue de release en Oracle ARM64 con auth, web, backups SQLite y Cloudflare Tunnel; smoke checks sin secretos | [ ] |

## Estado de cierre de integración — 2026-11-05

El commit Planner `ab3aa60` integra Better Auth, adaptadores corregidos y configuración local. F04–F06 quedan cerradas con pruebas Gateway, recibos, Promptfoo, sesión docente y defensa persistida. F07 se completó el 2026-11-05: Ego Lite verificó 390×844 y 1440×900; regresión sin caché, Promptfoo local y persistencia tras reiniciar API quedaron documentados en `task-list/F07/evidencie.md`. Un fixture de prueba Better Auth se aisló para eliminar un warning espurio; el registro público permanece bloqueado. No se desplegó. Commits F07: `c630d6f` (prueba Better Auth), `0d2c6d9` (cierre documental y capturas).

Dependencias F03/F05 son de integración, no bloquean trabajo paralelo con fake drivers y contratos congelados. Cada worker debe producir código compilable de su zona o informe de bloqueo claro. Cada tarea tiene `intent.md`, `spec.md`, `evidencie.md`.
