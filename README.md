# Fragments — Codex planning kit

Este ZIP **NO** contiene la aplicación construida ni ha modificado GitHub. Incluye investigación seleccionada de skills, un **system prompt listo para Codex**, system design, contratos, tasks verificables y assets para empezar el MVP con seis workers aislados.

## Orden de trabajo
1. Revisar `skills/SKILLS_MATRIX.md` y leer las skills originales (primer paso exigido).
2. Revisar `docs/SYSTEM_DESIGN.md`, `docs/DESIGN_TOKENS.md` y `docs/CONTRACTS.md`.
3. Colocar el contenido de este kit dentro del repo limpio de Fragments en una rama de trabajo, sin borrar nada automáticamente.
4. Pegar `SYSTEM_PROMPT_CODEX.md` como instrucción maestra al agente Codex planner.
5. **Primera ejecución:** Planner crea `.env.example`, `.env` no versionado y `docs/ENV_SETUP.md`, luego **se detiene** hasta que completes tus credenciales y autorices continuar.
6. Tras confirmación y preflight, Planner crea contratos y scaffold, lanza hasta 6 workers si están disponibles y gestiona integración y QA.
7. Seguir `task-list/TASKS.md` y mantener `intent.md`, `spec.md`, `evidencie.md` por tarea.

## Precauciones
- El nombre 'Luna' no está confirmado como modelo/subagente disponible en Codex: el prompt exige comprobarlo y usar fallback honesto.
- ego(lite) está instalado por el usuario en Windows y será el único navegador de pruebas E2E/visuales. No introducir Playwright ni otro fallback. Si la integración con ego(lite) no está accesible, registrar bloqueo y no fingir pruebas.
- Para modelos IA, Promptfoo/Gateway requieren claves reales sólo en server; usar fakes locales mientras no existan.
- Assets originales inspirados por estética pixel-garden azul; imagen de referencia no replicada literalmente.
- La versión académica es independiente de insumos/entregas; docente decide qué pedir en Moodle.
