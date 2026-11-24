# Evidencia F16.17 — Habilidades requeridas en Mentor

## Hallazgo reproducido

- En Ego Lite con el perfil estudiantil existente, el Dashboard de producción mostró una misión con habilidad requerida `FRAG-QA · Navegación móvil`.
- Sin guardar ni evaluar, se siguió la acción de continuar un borrador vinculado a misión. La propuesta reabrió en Evaluación, mantuvo Contexto Mentor v1 y las etapas completadas; el resumen decía `No hay habilidades guardadas.` sin representar por separado la habilidad obligatoria que el flujo Mentor recibe en `requiredMissionSkills`.
- Producción observada: `v0.5.58`, SHA `004df54d9e485e59b294cbec263020eb034bbf46`. La revisión fue de solo lectura; no se pulsaron botones de guardar, evaluar, publicar o cerrar sesión.
- La especificación F18 vigente exige separar las habilidades requeridas por misión de las selecciones optativas del estudiante. No hacen falta cambios de contrato.

## Implementación en curso

- Cambio acotado a la presentación del resumen de Evaluación y su prueba de regresión; usa el snapshot de `requiredMissionSkills` que ya entrega la composición de `StudentWorkspace`.
- El TDD inicial falló como se esperaba: Evaluación no mostraba `Navegación con Expo` y decía `No hay habilidades guardadas.`. La cobertura también distingue misión sin habilidades requeridas de snapshot no disponible.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx`: 42/42 PASS.
- `pnpm --filter @fragments/web test`: 271/271 PASS.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS. Vite conserva avisos ya presentes sobre chunk >500 KB y directivas `use client` de lucide-react.
- Revisión reflexiva independiente: CLEAN; no detectó mezcla de datos propios/de misión, fuga de criterios privados ni cambios contractuales.
- Skill aplicada: `ego-browser` para la observación real; `vercel-react-best-practices` revisada selectivamente, sin optimizaciones innecesarias. Se mantuvo F16 Pixel Night y se dejaron fuera los assets candidatos.
- Captura pre-cambio, solo local por pertenecer a una sesión autenticada: `C:\Users\vgmil\ego\fragments-game-experience-20261124\mentor-evaluation-before.png`, 1920×956, SHA-256 `C8058446ABDF7B3984A392A9676BFBB0E81B2EA99B5E31CB6DDA537B62F09FE6`.
- Pendiente: PR/CI/merge, release legítima F14 y comprobación Ego Lite posterior al despliegue. No se guardó, evaluó ni publicó contenido durante QA.

## Registro Git

- Commit de implementación y evidencia inicial: `53f1701acd8649c913d4b84eb48ed5336d38b613`.
- Rama: `codex/f16.17-mentor-mission-skills-summary`; pendiente de PR/CI/merge.
