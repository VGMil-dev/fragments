# Evidencia F16.11

Estado: implementación integrada y paquete v0.5.52 aplicado; revisión visual con Ego Lite pendiente.

- PR #218 merge normal `7da17eca74f1c5df7efb1e909e3a73abcd14794b`; head de implementación `f95a248`.
- El Dashboard da nombre accesible al centro de misiones y reduce la prominencia visual de acciones secundarias, manteniendo el mismo origen de datos y rutas. No inventa métricas ni progreso.
- Límite observado: la misión destacada se ordena por `createdAt`; el contrato no ofrece fecha límite o prioridad docente, por lo que la prioridad pedagógica no queda demostrada.
- Pruebas Dashboard: 12/12 PASS; web typecheck, web build y `git diff --check` PASS tras sincronizar con main.
- CI del head actualizado: run `45282207950`, job `verify` SUCCESS. El build conserva avisos preexistentes de chunk grande y directivas `use client` de Lucide.
- Aplicación F14 confirmada por lectura SSH: contenedores web/API saludables con imagen SHA `7da17eca74f1c5df7efb1e909e3a73abcd14794b`; el asset web `index-GzHAFdj-.js` contiene `v0.5.52` y el SHA. No se leyeron matrículas ni borradores.
- QA con sesión estudiante: NO COMPROBADO. No se modificaron matrículas, borradores ni misiones de producción. El TaskSpace Ego Lite terminó; QA visual y revisión propietaria siguen pendientes y no se declara candidata aprobada para piloto.

## QA Ego Lite post-release · 2026-11-23

- Página nueva de la sesión estudiantil preservada: `/student/dashboard` sirvió `v0.5.52 · 7da17ec`. Se observó el borrador propio prioritario y una misión publicada con objetivo y habilidad requerida visibles. No se sustituyó/editó el borrador ni se inició la misión; la CTA no se pulsó.
- En 320/390/768/1024/1440 px: `scrollWidth <= innerWidth`; la vista volvió a 1908×944 tras las mediciones. No se inspeccionaron ni copiaron valores privados de campos.
- Captura Ego Lite auténtica: `C:\Users\vgmil\ego\fragments-continuation-20261123\dashboard-desktop.png` (fuera de Git, contiene estado autenticado).
- La CTA específica queda **NO COMPROBADA**; zoom 200 %, contraste formal, lector de pantalla y aprobación propietaria siguen pendientes. La sesión/pestaña previa se conservó.

## F16.11.1 — Evitar duplicar la CTA de una misión vinculada · 2026-11-24

- En producción `v0.5.60`, la propuesta propia prioritaria y su misión exacta mostraban dos botones que abrían la misma propuesta. Captura Ego Lite auténtica a 1920 px: `C:\Users\vgmil\ego\fragments-pixel-night-current-20261124\dashboard-v0.5.60.png`, SHA-256 `881465192B2C9A930EAAA939631A7E8BE4E7D3B41D9630517A2D54A28A12A485`. Contiene identidad/estado autenticado; se conserva fuera de Git y Notion.
- La tarjeta de misión conserva objetivo y habilidades; cuando `assignmentVersionId` apunta a la propuesta prioritaria, muestra que ya está en el siguiente paso destacado y evita la segunda CTA. Propuestas enlazadas distintas mantienen su CTA. Carga/error no ocultan acciones ni notas de forma falsa.
- TDD: test nuevo reprodujo la CTA duplicada antes del cambio; después comprueba una sola acción para el vínculo exacto y conserva navegación para una propuesta vinculada no prioritaria.
- Verificación local fresca: Dashboard focal 17/17 PASS; web 52 archivos/275 pruebas PASS; typecheck, build y `git diff --check` PASS. Revisión reflexiva independiente CLEAN. Build mantiene advertencias previas de bundle grande y directivas `use client` de Lucide.
- El estado final de PR, CI, release F14 y QA se registra en “Integración y QA post-release v0.5.61” abajo. No se escribieron propuestas/matrículas, no se llamó IA y no se cambió API, contratos ni rutas.

## Integración y QA post-release v0.5.61 · 2026-11-24

- PR [#246](https://github.com/VGMil-dev/fragments/pull/246) se integró mediante merge normal como `900b5bd075e601ade487dadd49336b713f7c0334`; commit de implementación `4f68dfb73e951655b64a6cd5f974a1a64b7fb64d`. CI del head sincronizado `45340730153` SUCCESS; el estado exacto pasó la suite web `52 archivos/277 pruebas`, typecheck y CI completo de release.
- F14 `v0.5.61`, run `45341081720`, terminó SUCCESS en build/verificaciones, atestación y publicación aprobada. El aplicador normal registró `release_deployed` para el SHA exacto y acabó `Result=success`, `ExecMainStatus=0`. Contenedores API/web healthy sobre `900b5bd`; `/health` es `ok/ready`; `/assets/index-D5BowZnw.js` contiene tag y SHA completos.
- Ego Lite TaskSpace 60 observó Dashboard con una acción primaria para la propuesta, una sola nota para la misión que apunta a esa misma propuesta y objetivo/habilidad conservados. El click de la acción primaria abrió la propuesta vinculada en `/student/mentor`. En 320/390/768/1024/1440 CSS px no hubo desbordamiento horizontal. Captura auténtica local, fuera de Git/Notion: `C:\Users\vgmil\ego\fragments-pixel-night-current-20261124\dashboard-v0.5.61.png`, SHA-256 `350C166C93B613BFD048C1CF0BB9D402565A71A02884F314A10B96C06623B8E3`; contiene estado autenticado y no se comparte.
- No se guardó ni evaluó una propuesta, no se alteraron matrículas y no se llamó IA. La sesión estudiantil y la sesión docente se conservaron abiertas.
- F16 continúa en validación: prioridad pedagógica que no está presente en el contrato, zoom 200 %, contraste formal, lector de pantalla y aceptación visual propietaria permanecen NO COMPROBADOS. No se declara aptitud para piloto.
