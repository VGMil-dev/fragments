# Evidencia CU-15 · inicio desde Mis aulas

## Resultado

Se añadió a `apps/web/src/App.student-flow.test.tsx` un caso que integra la pantalla Mis aulas con la ruta de Mentor para una misión publicada sin propuesta propia. Comprueba el aula, tema, versión de contexto y habilidad requerida; también confirma que no se llama a `saveProposalDraft` automáticamente.

Commit verificado: `b7eae279de7b5f66a13e9184eb13965df8354074`.

## Verificación local

- `pnpm --filter @fragments/web test -- src/App.student-flow.test.tsx` → Vitest reportó suite web completa: **57 archivos, 337 pruebas PASS**. La suite confirma el recorrido con fixtures; el proveedor y las APIs son fake.
- `pnpm --filter @fragments/web typecheck` → PASS.
- `git diff --check` → PASS.
- No se ejecutó IA, no se accedió a DB ni se escribieron datos de producción.

## Límites del caso

- La observación autenticada post-release no se pudo repetir: `listTaskSpaces()` mostró únicamente Spaces 0 y 3; los Spaces autorizados 44/80 no estaban disponibles. No se creó ni reclamó otro Space y no se cerraron pestañas.
- La matriz mantiene producción PASS histórico con Ego Lite en v0.5.75–v0.5.78; esta sesión no acredita una nueva observación autenticada sobre v0.5.89.
- CU-15 integral sigue parcial: la prueba nueva verifica navegación y contexto en UI fake, no guarda/recupera contra backend ni prueba duplicados en PostgreSQL.

## Skills

Se leyó `skills/SKILLS_MATRIX.md`. Se siguió un caso de aceptación focal y verificación fresca. La skill instalada `test-driven-development`/`verification-before-completion` no estaba disponible en las carpetas locales consultadas; no se instaló ninguna dependencia.
