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
| F08 | PLANNER | F07 | Despliegue de release en Oracle ARM64 con auth, web, backups SQLite y Cloudflare Tunnel; smoke checks sin secretos | [x] |
| F09 | PLANNER | F02,F04 | Descarga de plantilla DOCX e importación local editable en Mentor; pruebas del flujo existente | [x] |
| F10 | PLANNER | F08,F09 | Trainer: Review→sorteo→reto→pistas→progreso→historial→repaso; separación Inspector, Ego Lite y paquete de evidencia local ≤20 archivos | [x] |
| F10.1 | PLANNER | F10 | Completar banco variado de retos desde Review verificado; reutilizarlo, admitir repaso, probar concurrencia y recorrer fixture pública sin ejecutar su código; evidencia local ≤20 archivos; commits `4133219a`/`3cda9a4` | [x] |
| F11 | PLANNER | F10 | Control docente Mentor: editar y publicar una configuración temática/rúbrica; evaluación estructurada con puntaje de servidor, deduplicación y consulta histórica versionada | [x] |
| F12 | PLANNER | F10.1,F11 | Integración local v0.3.0: migraciones unificadas, recorridos Mentor→Review→Trainer→Inspector, QA funcional y evidencia privada ≤20 archivos | [x] |
| F13 | PLANNER | F12 | Indicador de versión web con metadata del build validada contra tag anotada, SHA exacto y `origin/main`; build candidato manual sin despliegue | [x] |
| F14 | PLANNER | F13 | Release activado solo por push de nueva tag anotada `vMAJOR.MINOR.PATCH`; verificación de SHA/main, aprobación protegida, despliegue aislado, backup/rollback y ledger anti-repetición | [x] — PR #15 merge `d9d2fba`; agente offline atestiguado; `v0.4.1` desplegada con backup íntegro y SQLite v10. PR #16 añade bundle offline. Hotfix `codex/f14-fix-upload-artifact-pin` corrige referencia cruzada hallada en el intento `v0.4.2`; pruebas locales F14 pasan; PR/check pendientes. `v0.4.2` sigue fallida/inmutable; candidata `v0.4.3` sin tag. Evidencia en `task-list/F14/evidencie.md` |
| INC-MENTOR-503 | PLANNER | v0.3.0 | Desbloquear Mentor solo con presupuesto Vercel activo y aplicable; reconciliar holdback y registrar consumo | [x] — presupuesto Fragments USD 5/No Refresh verificado; backup íntegro; desplegado `50e2ace`; evaluación real liquidada USD 0.000112 y recuperada por GET sin duplicación; evidencia en `task-list/INC-MENTOR-503/evidencie.md` |
| F15 | PLANNER | F14 | GitHub OAuth estudiantil, propiedad académica de propuestas, galería automática versionada y panel docente protegido | [ ] — `v0.4.1` continúa en producción; PR #18 y F15.1 (#21) están integrados, pero no se ha verificado una sesión OAuth real. APIs galería/docentes requieren autenticación. F15.1 añadió el flujo explícito docente; falta release autorizado y prueba real. Evidencia en `task-list/F15/evidencie.md` y `task-list/F15.1/evidencie.md` |
| F15.1 | PLANNER | F15,F14 | Vinculación GitHub docente explícita con contraseña reciente, sin linking implícito ni elevación de roles; pruebas API/UI, QA visual y PR con `verify` | [ ] — integrada por PR #21, merge `38ff1bd`; check obligatorio `verify` exitoso en run `43447571009`. Tests NTFS 4/4 tareas, typecheck 4/4, lint disponible 1/1, build 3/3; QA Ego Lite escritorio/390 px. Producción no modificada, sigue en `v0.4.1`; OAuth real pendiente de release autorizado e intervención del propietario. Código de la candidata `v0.4.2` integrado; tag aún no creada. La tag futura debe apuntar al SHA exacto de `main` tras integrar esta evidencia. Ver `task-list/F15.1/evidencie.md` |

## Estado de cierre de integración — 2026-11-05

El commit Planner `ab3aa60` integra Better Auth, adaptadores corregidos y configuración local. F04–F06 quedan cerradas con pruebas Gateway, recibos, Promptfoo, sesión docente y defensa persistida. F07 se completó el 2026-11-05: Ego Lite verificó 390×844 y 1440×900; regresión sin caché, Promptfoo local y persistencia tras reiniciar API quedaron documentados en `task-list/F07/evidencie.md`. Un fixture de prueba Better Auth se aisló para eliminar un warning espurio; el registro público permanece bloqueado. No se desplegó. Commits F07: `c630d6f` (prueba Better Auth), `0d2c6d9` (cierre documental y capturas).

Dependencias F03/F05 son de integración, no bloquean trabajo paralelo con fake drivers y contratos congelados. Cada worker debe producir código compilable de su zona o informe de bloqueo claro. Cada tarea tiene `intent.md`, `spec.md`, `evidencie.md`.

## Validación F15 — 2026-11-12

API 109/109, web 57/57, contracts 19/19; typecheck/build y lint de contracts pasan. QA docente Ego Lite en escritorio y móvil y migración SQLite temporal registrados en `task-list/F15/evidencie.md`. El callback generado por fake provider coincide con `https://fragments.gavanti.org/api/auth/callback/github`; eso no verifica OAuth externo. El VPS mantiene `.env` en modo `0600`, pero aún carece de `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET`; OAuth real sigue bloqueado y F15 no se declara lista para producción. No hubo cambios a producción.

