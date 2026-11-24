# Evidencia F16.9

Estado: ajuste funcional integrado y paquete v0.5.52 aplicado; revisión visual de Ego Lite y aprobación de candidata pendientes.

- La base `main` ya tenía el stepper superior de seis etapas, etapas con estado real y una sola etapa activa. Este incremento cambia el rótulo redundante “Tu propuesta” por “Ruta de proyecto”; no atribuye la implementación previa a este PR.
- Código: PR #216, merge `239d91c11d926eb5615952871c68a0d6d956ef5b`; commit propio `36ae07f`.
- Prueba de Mentor: `pnpm --filter @fragments/web test -- src/features/mentor/mentor-screen.test.tsx` — 50 archivos, 250 pruebas PASS en el workspace; la nueva prueba confirma el rótulo y una sola etapa `aria-current="step"`.
- Typecheck: `pnpm --filter @fragments/web typecheck` PASS. `git diff --check` PASS.
- CI requerido del PR: run `45279955496`, job `verify` SUCCESS.
- Aplicación F14 confirmada por lectura SSH: contenedores web/API saludables con imagen SHA `7da17eca74f1c5df7efb1e909e3a73abcd14794b`; el asset web `index-GzHAFdj-.js` contiene versión `v0.5.52` y el SHA. Inspección read-only; no se accedió a sesiones.
- Revisión reflexiva independiente: CLEAN; no detectó cambios de lógica de etapas ni accesibilidad.
- No se cambiaron contratos, APIs, rutas, prompts, persistencia ni backend. La verificación visual Ego Lite no se pudo realizar porque el TaskSpace 44 terminó y exige autorización explícita para reclamarlo; candidata/piloto siguen sin aprobación visual.

## QA Ego Lite post-release · 2026-11-23

- Tras la autorización explícita de continuidad se verificó una página nueva dentro del TaskSpace estudiantil preservado. `/student/mentor` sirvió `v0.5.52 · 7da17ec`; mostraba las seis etapas, Idea activa, Contexto disponible y borrador 0 %. El formulario de Idea estuvo visible como etapa única. No se leyeron valores de campos ni se guardó/evaluó.
- En 320/390/768/1024/1440 px: `scrollWidth <= innerWidth`. Teclado: el primer control enfocable mostró foco visible sólido lima de 3 px; no se afirma una prueba exhaustiva de tab-order del stepper.
- Captura Ego Lite auténtica: `C:\Users\vgmil\ego\fragments-continuation-20261123\mentor-desktop.png` (fuera de Git, contiene estado autenticado).
- La pestaña previa del estudiante se conservó sin recargar; mostraba `v0.5.48`. La página nueva muestra v0.5.52. Zoom 200 %, contraste formal, lector de pantalla y aprobación visual propietaria siguen **NO COMPROBADOS**. La tarea permanece pendiente de revisión visual propietaria; no se declara estable para piloto.

## Incremento F16.9 · orden de teclado en Idea · 2026-11-24

- Revisión de la ficha Notion “Mentor · Idea” y de F16.9/F16.14: se conserva la candidata Pixel Night, sus etapas y sus estados reales. F16.14 ya prioriza visualmente el formulario en Idea; las acciones Word y propuestas guardadas tienen `order: 2` y `order: 3` en CSS, después del formulario (`order: 1`).
- Brecha reproducible: los mismos controles seguían antes del formulario en el DOM. Por ello, el orden de tabulación llevaba primero a Descargar/Importar Word y propuestas guardadas aunque el formulario se veía primero. Moví únicamente esos dos bloques JSX después del formulario, alineando foco de teclado y jerarquía visual sin cambiar lógica, estado, contratos, persistencia ni rutas.
- Añadí una prueba que comprueba el orden DOM form → acciones Word → propuestas guardadas. TDD: primero falló con `wordActionsStart` antes de `formStart`; después pasó.
- Prueba focal: `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` — PASS, 43/43.
- Typecheck: `pnpm --filter @fragments/web typecheck` — PASS.
- Build: `pnpm --filter @fragments/web build` — PASS. Permanecen los avisos ya existentes de chunk de 636 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.
- QA autenticada/visual Ego Lite en navegador y validación real de tabulación a 320/390/768/1024/1440 — NO COMPROBADOS en este incremento. No se afirma aprobación visual propietaria ni aptitud para piloto.
- El estado final de commit, CI, PR y release se registra en “Integración y QA post-release v0.5.61” abajo.

### Registro posterior al push · 2026-11-24

- Commit de implementación: `574ca0a8f8167a858114caddf640d9c9483ff358`.
- PR [#244](https://github.com/VGMil-dev/fragments/pull/244) abierto normalmente contra `main`.
- `gh pr checks 244`: GitHub no reportó checks en la rama al momento de esta consulta. CI queda pendiente; no se afirma integración ni despliegue.

## Integración y QA post-release v0.5.61 · 2026-11-24

- PR [#244](https://github.com/VGMil-dev/fragments/pull/244) se integró mediante merge normal. Commit de implementación `574ca0a8f8167a858114caddf640d9c9483ff358`; merge de PR `f0d87506f252ebe05b11e89852b2d6428d4b1bf0`; CI actualizado `45340414428` SUCCESS.
- La release conjunta F14 `v0.5.61` apunta al SHA `900b5bd075e601ade487dadd49336b713f7c0334`; run `45341081720` terminó SUCCESS en verify-build, atestación Sigstore y publish-approved-release. El aplicador normal terminó `Result=success`, `ExecMainStatus=0`; API/web healthy sobre el mismo SHA. `/health` devolvió `ok/ready` y `/assets/index-D5BowZnw.js` contiene tag y SHA exactos.
- Ego Lite, TaskSpace 60 existente, navegó desde la acción prioritaria del Dashboard a `/student/mentor`. Se observó la propuesta QA persistida en su etapa real de Evaluación, seis etapas con una activa, contexto y habilidad requerida de misión. Tabulación dejó foco visible de 3 px. No se leyó ni modificó el valor de campos, no se guardó ni reevaluó. Esto no valida la calidad de la evaluación histórica.
- En 320/390/768/1024/1440 CSS px, el documento no presentó desbordamiento horizontal. Captura auténtica local, fuera de Git y Notion: `C:\Users\vgmil\ego\fragments-pixel-night-current-20261124\mentor-v0.5.61.png`, SHA-256 `6082B3936C38389FEDF36CB9EDE1B71711A8AE9D6871253EF84FB49BDEF9E77A`. Contiene estado autenticado y no se comparte.
- Aún NO COMPROBADOS: zoom 200 %, contraste formal, lector de pantalla y aceptación visual propietaria. F16 sigue en validación; no se declara aptitud para piloto. La pestaña y sesión Ego Lite se dejaron abiertas.
