# Evidencia F16.17 — Habilidades requeridas en Mentor

## Hallazgo reproducido

- En Ego Lite con el perfil estudiantil existente, el Dashboard de producción mostró una misión con habilidad requerida `FRAG-QA · Navegación móvil`.
- Sin guardar ni evaluar, se siguió la acción de continuar un borrador vinculado a misión. La propuesta reabrió en Evaluación, mantuvo Contexto Mentor v1 y las etapas completadas; el resumen decía `No hay habilidades guardadas.` sin representar por separado la habilidad obligatoria que el flujo Mentor recibe en `requiredMissionSkills`.
- Producción observada: `v0.5.58`, SHA `004df54d9e485e59b294cbec263020eb034bbf46`. La revisión fue de solo lectura; no se pulsaron botones de guardar, evaluar, publicar o cerrar sesión.
- La especificación F18 vigente exige separar las habilidades requeridas por misión de las selecciones optativas del estudiante. No hacen falta cambios de contrato.

## Implementación y release verificadas

- Cambio acotado a la presentación del resumen de Evaluación y su prueba de regresión; usa el snapshot de `requiredMissionSkills` que ya entrega la composición de `StudentWorkspace`.
- El TDD inicial falló como se esperaba: Evaluación no mostraba `Navegación con Expo` y decía `No hay habilidades guardadas.`. La cobertura también distingue misión sin habilidades requeridas de snapshot no disponible.
- `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx`: 42/42 PASS.
- `pnpm --filter @fragments/web test`: 271/271 PASS.
- `pnpm --filter @fragments/web typecheck`: PASS.
- `pnpm --filter @fragments/web build`: PASS. Vite conserva avisos ya presentes sobre chunk >500 KB y directivas `use client` de lucide-react.
- Revisión reflexiva independiente: CLEAN; no detectó mezcla de datos propios/de misión, fuga de criterios privados ni cambios contractuales.
- Skill aplicada: `ego-browser` para la observación real; `vercel-react-best-practices` revisada selectivamente, sin optimizaciones innecesarias. Se mantuvo F16 Pixel Night y se dejaron fuera los assets candidatos.
- Captura pre-cambio, solo local por pertenecer a una sesión autenticada: `C:\Users\vgmil\ego\fragments-game-experience-20261124\mentor-evaluation-before.png`, 1920×956, SHA-256 `C8058446ABDF7B3984A392A9676BFBB0E81B2EA99B5E31CB6DDA537B62F09FE6`.
- PR #240 se integró mediante merge normal en `main` como `518e3de06b66456b7a404cb3e2468c34b0bccecc`; CI `45330071847` SUCCESS. La tag anotada `v0.5.59` apunta a ese SHA; F14 run `45330419832` terminó SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`.
- Verificación productiva de solo lectura: `fragments-web-1` y `fragments-api-1` están `Up (healthy)` con imágenes del SHA `518e3de06b66456b7a404cb3e2468c34b0bccecc`. `/health` respondió HTTP 200, `status=ok`, `database=ready`. Ego Lite cargó `/assets/index-C27BWUUA.js`, que contiene `v0.5.59` y el SHA exacto.
- Ego Lite en el TaskSpace estudiantil existente `60`: se reabrió el borrador propio `FRAG-QA · Navegación de inventario escolar` y se verificó en Evaluación que `No has guardado habilidades propias en esta propuesta.` aparece separado de `Habilidades requeridas por la misión`, con `FRAG-QA · Navegación móvil` desde el snapshot vinculado.
- Reflow en Mentor probado con Ego Lite a 320/390/768/1024/1440 CSS px; `documentElement.scrollWidth` no superó el viewport. Dashboard y Trainer se observaron en la misma sesión y build, a 1920 CSS px, sin overflow; son capturas de línea base, no una validación completa de esos módulos.
- Evidencia visual auténtica, local y no publicada por contener una sesión autenticada: `C:\Users\vgmil\ego\fragments-game-experience-20261124\mentor-evaluation-v0.5.59.png` (SHA-256 `39EAD9F1145EEBA784D3371436865734FD67D898E5ED81FF3691E3289B5782B7`); líneas base: `dashboard-baseline-v0.5.59.png` (`F6FC02DEBD21CFD4E97DBD6039D41AA8C44DB4E94A56A8297FBE135C78B54FE0`) y `trainer-baseline-v0.5.59.png` (`2D0F7A5A7F039833DD65494007932081BEB01F0365D513F360F7DFBD92603BAB`).
- No se guardó ni evaluó la propuesta, no se publicó contenido, no se generaron datos académicos y no se llamaron proveedores IA. La puntuación histórica visible pertenece a la evaluación persistida anterior; su calidad no se volvió a probar. Capturas desktop completas, zoom 200 %, contraste formal, lector de pantalla y aprobación visual propietaria siguen NO COMPROBADOS.

## Registro Git

- Commit de implementación y evidencia inicial: `53f1701acd8649c913d4b84eb48ed5336d38b613`.
- Rama: `codex/f16.17-mentor-mission-skills-summary`.
- Implementación: `53f1701acd8649c913d4b84eb48ed5336d38b613`; evidencia previa: `d96db06aa746b5192f2ad5b60e3b6669d5c4358a`; seguimiento de release y producción se incorpora en este PR documental.
