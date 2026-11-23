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
