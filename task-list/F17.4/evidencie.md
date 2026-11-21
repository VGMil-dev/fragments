# Evidencia — F17.4 / UX-08

## Estado

Implementación y QA local completados. UX-07 fue integrado desde `origin/main`; conflictos resueltos y validados. Rama publicada, PR #77 abierta; CI validado en `40dcf25fce800c7a5bfe5e9058bffce2625a98af`: SUCCESS. No hay despliegue productivo declarado.

## Base y aislamiento

- Rama: `codex/f17-ux08`.
- Worktree: `C:\Users\vgmil\.codex\worktrees\f17-ux08\Fragments`.
- Base inicial: `3f4e39b87f9979fe69fac799af1c837e16725c3a`. Integración de UX-07 desde `origin/main` (`1cdeae04b0e0930663c79cde7ef72efe6f8c6054`) mediante merge `40dcf25fce800c7a5bfe5e9058bffce2625a98af`; no se reescribió historia.
- UX-07 permaneció intacto en su worktree separado. Tras integrarlo en `main`, UX-08 se actualizó y volvió a probarse con la habilidad y tecnología guardadas en conjunto.
- Antes de cada suite con escrituras, se confirmó `current_database() = fragments_test`; la base `fragments_prod` no existía en el PostgreSQL aislado. No hubo conexión o escritura productiva.
- Migración aplicada únicamente en el contenedor local de `fragments_test`: `20261121160000_mentor_technology_catalog`.
- Se preservaron fixtures sintéticos UX-08 para revisión/reapertura en `fragments_test`; no incluyen datos productivos.

## Referencia y evidencia visual

- Referencia aprobada: `F17_UX08_EVIDENCIAS/Referencia_aprobada.png`.
- SHA-256 comprobado: `c632b2ad72bf78b99d22137ad9eb7071ea08581f7603ced548ca5fa5d5a61fbe`.
- Ego Lite independiente: PASS bajo el alcance comprobado en 320, 390, 768, 1024, 1440 y 1672 CSS px. Sin desbordamiento horizontal; tarjetas MVP/resultado apiladas en 1024 y alineadas en 1672.
- Interacciones: agregar/editar/reordenar/quitar objetivos; búsqueda con foco conservado; selección y eliminación de chips con teclado; navegar con «Anterior»; guardar y reabrir objetivo/tecnología; guardar eliminación y reabrir sin la tecnología.
- La revisión no establece equivalencia visual pixel a pixel. No se comprobó visualmente la paginación con más de 50 resultados.
- Capturas y dictamen: `F17_UX08_EVIDENCIAS/` (11 archivos; menos del máximo de 20).

## Pruebas

- `pnpm exec turbo run test typecheck lint build --force`: 11/11 tareas exitosas.
- Suite integrada final: contratos 26 tests; Web 127; API 148; total 301 tests aprobados.
- Tras ampliar el fixture de segunda aula activa, integración PostgreSQL catálogo aislada: 1/1 test aprobado; contempla estados de matrícula/aula, solicitud anónima, parámetro `classroomId` manipulado y deduplicación entre aulas activas.
- DOCX: suite automatizada de 6 tests aprobada. Prueba web de actualización confirma conservación de `constraints` históricos; el campo no se muestra en UX-08.
- El build emite una advertencia de chunk web mayor a 500 kB y advertencias del paquete `lucide-react`; build y typecheck terminan correctamente.
- Detalle: `F17_UX08_EVIDENCIAS/PRUEBAS.md`.

## Cambios principales

- Objetivos individuales editables, reordenables, agregables y eliminables.
- Tarjetas adaptables para alcance MVP y resultado esperado.
- Catálogo persistente de tecnologías con identidad estable, búsqueda paginada y sugerencias derivadas en servidor de matrículas activas en aulas activas.
- Selecciones del catálogo se resuelven a nombres canónicos; las etiquetas históricas se conservan hasta quitarlas explícitamente.
- Se quitó visualmente «Condiciones propias» sin eliminar `constraints` de propuestas o importación/exportación DOCX.

## Integración y despliegue

- Commit de implementación: `2152598904d4fac21b804f27a27fcd14b24fca37`.
- PR #77: https://github.com/VGMil-dev/fragments/pull/77 (abierta; no fusionada).
- HEAD publicado: `40dcf25fce800c7a5bfe5e9058bffce2625a98af`; integración UX-07: `40dcf25fce800c7a5bfe5e9058bffce2625a98af`.
- CI GitHub Actions `verify`, run `44948601060`: SUCCESS; conclusión confirmada en GitHub Actions.
- CI remoto: SUCCESS (run 44948601060; SHA `40dcf25fce800c7a5bfe5e9058bffce2625a98af`).
- Despliegue: pendiente. La migración nueva requiere el gate F14/F21 y provisión del catálogo en producción; no se aplicó ni se tocaron datos productivos.
- No se afirma uso en producción; el comportamiento con datos fue validado sólo en `fragments_test`.
