# EGM — revisión de borrador de diseño y readiness

**Estado del hito:** no aprobado por Goldfish. Dos rondas ordinarias completadas con tres revisores independientes por ronda, todos configurados GPT-6 Luna Medio y `fork_turns: "none"`. No se declara aprobación global ni readiness del borrador final.

**Artefactos revisados:** `design_draft.md`, `DESIGN_SYSTEM_CONTRACT.md`, `SCREEN_INVENTORY.md`, `QA-INTERACTION-MATRIX.md`, `GOAL.md` y `spec.md`, según el enfoque de cada persona.

## Ronda 1 — primer borrador

### Design Critic

- **Major:** no comparaba alternativas para Astryx/estilos propios ni shells compartidos/layout por ruta. Resolución posterior: `design_draft.md` §7 documenta trade-offs, elige header compartido y descarta Astryx.
- **Minor:** StudentShell podía sugerir que Review/Trainer exigían sesión. Resolución confirmada en Ronda 2 y mantenida en la especificación: Review/Trainer continúan sin `getMe()` compartido.
- **Minor:** criterio de reflow 320 px no estaba en la matriz de verificación. Resolución confirmada en Ronda 2 y añadida a criterios/comprobación.

### Structural

- **Major:** faltaba comparación de alternativas. Resolución propia posterior en `design_draft.md` §7; no Goldfish re-validada tras el último cambio.
- **Major:** riesgos enumerados sin mitigaciones para tema/reset, pérdida de estado, navegación docente y layout de tablas. La Ronda 2 confirmó las mitigaciones añadidas.
- **Major:** conflicto entre Night/Cobalt/Lime del kit y colores crema/azules de `docs/DESIGN_TOKENS.md`. El propietario resolvió la autoridad el 2026-11-14 y autorizó actualizar documentación visual; este documento y `docs/SYSTEM_DESIGN.md` reflejan la precedencia nueva.
- **Minor:** faltaba definir quién aprueba una excepción de routing y dónde registrarla. `design_draft.md` §18 indica que lo aprueba el planner y se registra antes de editar en `decisions.md`; esa resolución vino después de la revisión de Ronda 2 y no fue re-chequeada por Goldfish.

### Implementation Readiness

- **Major:** no había allowlist exacto por archivo ni acciones por archivo. La Ronda 2 aún lo encontró abierto; luego `spec.md` añadió allowlist cerrado y fases por archivo. No Goldfish re-validado.
- **Major:** choices visuales/dependencia quedaban para implementer. La Ronda 2 parcialmente lo encontró resuelto pero aún no había fijado sidebar/Astryx. Luego el Elephant eligió header superior sin sidebar y descartó Astryx. No Goldfish re-validado.
- **Major:** rollback genérico sin gates de fase y pasos concretos. La Ronda 2 lo encontró abierto; luego `spec.md` definió comandos, commits checkpoint y `git revert`. No Goldfish re-validado.
- **Minor:** las verificaciones no asignaban pruebas y assertions reproducibles por acción. La Ronda 2 lo encontró abierto; luego `QA-INTERACTION-MATRIX.md` citó tests existentes y estados visuales. Varias acciones autenticadas siguen sin ejecución visual porque API no se inició. No Goldfish re-validado.

## Ronda 2 — delta sobre borrador revisado y código

- **Design Critic:** confirmó resueltas comparación, sesión Review/Trainer y 320px; paleta consistente con la autorización explícita del propietario. No encontró Major nuevo.
- **Structural:** confirmó alternativas y mitigaciones. Confirmó autoridad de paleta según registro de decisiones disponible entonces. Mantuvo un **Minor abierto**: precisar al planner como aprobador de excepción de navegación y `decisions.md` como registro.
- **Readiness:** mantuvo **Major abiertos**: allowlist exacto, gates/rollback por fase, evidencia reproducible; choices de layout/Astryx parcialmente resueltos pero no fijos aún. No encontró un problema de conservación de comportamiento.

## Resolución posterior del Elephant

Después de Ronda 2, el propietario emitió una autorización arquitectónica explícita. El Elephant incorporó: reemplazo global de la guía visual por F16; paleta Night/Cobalt/Lime; navegación superior sin sidebar; selección local React/CSS y retiro de dependencias Astryx temporales; allowlist por archivo; fases con comandos, checkpoints y reversión; IDs de tests/estados en la matriz; y aprobación de routing por el planner registrada en `decisions.md`.

Estas ediciones no fueron revisadas por una tercera ronda porque el tope de dos rondas ordinarias se alcanzó. **Readiness queda sin verificación independiente del delta final**; no se infiere aprobación de las ediciones propias. La matriz de QA conserva `NOT_RUN`/limitaciones reales en interacciones no observadas. La auditoría EGM final del código implementado es un hito distinto y sigue pendiente.
