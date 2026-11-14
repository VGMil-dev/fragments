# F16 — Registro de decisiones

| ID | Decisión | Base | Estado |
|---|---|---|---|
| D-01 | Rama F16 independiente nacida de HEAD `origin/main` verificado | Instrucción del usuario; fast-forward en worktree `main` | Cerrada |
| D-02 | Solo frontend/UX/identidad visual; no CI/CD, backend, permisos, producción o despliegue | Usuario y `GOAL.md` | Cerrada |
| D-03 | Mantener once rutas; no derivar páginas de tres ilustraciones conceptuales sin ruta | `App.tsx`, spreadsheet y límites de F16 | Cerrada |
| D-04 | F16 sustituye el sistema visual anterior en todas las vistas frontend: Night/Cobalt/Lime reemplazan la paleta crema y azul histórica como directriz. `docs/DESIGN_TOKENS.md` y `docs/SYSTEM_DESIGN.md` se actualizan para dejar una sola fuente de verdad visual | Decisión explícita del propietario del 2026-11-14 | Cerrada |
| D-05 | Los WebP aprobados se conservan byte a byte; el WebP niña/gato contiene un frame y es estático | Manifiesto y auditoría del kit | Cerrada |
| D-06 | Se evaluó Astryx 0.7.16 y su API oficial. F16 no lo adopta: el sistema local en React/CSS permite migrar todas las vistas sin añadir tema/reset, StyleX ni peso de runtime; se retiran sus paquetes de la app. Controles nativos y componentes de presentación propios conservan semántica existente | CLI/paquetes oficiales 0.7.16 consultados; `design_draft.md` §7 | Cerrada; adopción descartada con fundamento |
| D-07 | Los PNG de iconos siguen siendo candidatos hasta inspección visual/procedencia | Manifest CSV del kit | Cerrada |
| D-08 | No cambiar auth, roles, rutas, validación, datos ni semántica para lograr el look | Usuario y contratos Fragments | Cerrada |
| D-09 | Revisión EGM con contexto independiente y GPT-6 Luna Medio; tope ordinario de dos rondas por hito | Usuario | Rondas previas conservadas. Revalidación QA/readiness R1 y R2 completadas con hallazgos; correcciones posteriores a R2 no tienen nuevo re-chequeo por el límite de dos rondas. No convergente ni aprobada |
| D-10 | El usuario configuró el agente principal manualmente en GPT-6 Luna Medio; la API de esta sesión no permite comprobarlo. Registrar exactamente `MODEL_SELECTION_USER_CONFIGURED_UNVERIFIABLE`, no atribuir una verificación y no bloquear QA por esta limitación | Usuario y capacidad observable de API | `MODEL_SELECTION_USER_CONFIGURED_UNVERIFIABLE`; Goldfish seleccionados explícitamente como GPT-6 Luna Medio y `fork_turns: "none"` |
