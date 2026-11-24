# Evidencia F16.15 — Review Pixel Night

## Estado

Implementación probada, integrada por PR #235 y aplicada automáticamente en producción por F14 `v0.5.58`. QA visual autenticada del estudiante sigue pendiente.

## Cambios

- Review ahora muestra, en los estados devueltos por API `queued`, `running`, `failed` y `completed`, el dueño/repositorio, el SHA exacto y la etiqueta del estado actual.
- El resultado completado organiza los hallazgos devueltos, indica su cantidad derivada de `analysis.findings`, presenta las ubicaciones/evidencias con tipografía de código y explica el estado vacío cuando el arreglo llega sin hallazgos.
- Se añadieron estilos Pixel Night con reflow de origen/SHA en móvil; se conservaron CTAs, acciones, validación y DTO recibidos. Sin cambios de API, contratos, rutas, datos, proveedor, rúbricas o prompts.

## Verificación fresca

- TDD rojo: con el build local de contratos disponible, los cuatro casos nuevos fallaron porque el panel no exponía fuente/SHA/estado para todos los resultados ni indicaba el arreglo vacío de hallazgos.
- `pnpm --filter @fragments/web exec vitest run src/features/review/review-screen.test.tsx` — PASS, 1 archivo, 12/12.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS. Conserva advertencias existentes: chunk principal mayor de 500 kB y directivas `use client` de Lucide.
- `git diff --check` — PASS.

## No comprobado

- QA visual autenticada con Ego Lite, medidas 320/390/768/1024/1440 en navegador, zoom, contraste integral y lector de pantalla: **NO COMPROBADOS**. No había sesión Ego Lite Fragments-Estudiante disponible; no se creó ni cerró ninguna sesión.
- Review con evaluación real y calidad semántica de puntuaciones/citas: **NO COMPROBADAS**. Solo se usó el fixture de componente etiquetado `fake-provider:review-fixture`; no hubo llamadas a proveedores ni datos productivos.
- Aplicación productiva verificada con Ego Lite: `/health` 200, `status=ok`, DB `ready`; el HTML sirve `/assets/index-M0AC9oiW.js`, cuyo bundle contiene `v0.5.58`, SHA `004df54d9e485e59b294cbec263020eb034bbf46` y el marcador de hallazgos. La primera observación tras la publicación aún entregaba v0.5.57; la observación posterior confirmó la aplicación automática. No se ejecutó deploy manual ni reinicio.

## Integración

- Rama `codex/f16.15-review-pixel-night`; worktree aislado.
- Commit local de implementación `68eb92f4968cfd697f592a0ce652bdbdcb849a28` (`feat(F16.15): ordena evidencia en Review`).
- PR [#235](https://github.com/VGMil-dev/fragments/pull/235) se integró mediante merge normal como `004df54d9e485e59b294cbec263020eb034bbf46`; CI PR `45320215869` SUCCESS.
- Tag anotada `v0.5.58` apunta al merge exacto. F14 run `45320565441` completó `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; imágenes ARM64, manifiesto y atestación quedaron publicados.
- PR [#236](https://github.com/VGMil-dev/fragments/pull/236) registró la publicación y primera observación pendiente; se integró normalmente como `f0bd614b147495a32aeb85c9e66c54dc04ea3d7c` con CI `45322199990` SUCCESS. La observación posterior del bundle confirmó que el agente pull aplicó `v0.5.58`.
- Ego Lite `Fragments-Docente` se mantuvo abierta en Control de Mentor. No había sesión `Fragments-Estudiante`; no se crearon/cerraron sesiones. Calidad semántica de evaluación y QA visual autenticada NO COMPROBADAS.
