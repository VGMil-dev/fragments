# UX-09 — Evidencia

## Estado
Implementación integrada mediante PR #78 y desplegada como `v0.5.8` por F14. Merge commit de UX-09: `527b8f66440819e72f73366014f78e0a3aa5a991`. Tag anotada: objeto `46e3e80a3ef7fae8d929b7dc593a9cce7806ee9b`, apuntando al merge exacto.

## Referencia aprobada
SHA-256 `76a1b15c63ba87ce655f2e63f193beb1dd7d8242e62adb7599e73c0c3c11330c` (1672 × 941), verificada contra `referencia-aprobada.png`. La primera imagen `image-1.png` no coincidió y fue descartada.

## Implementado
- Evaluación con stepper horizontal desktop, selector compacto accesible y CTA; resumen Idea → Contexto solo lectura → Habilidades/Tecnologías → Objetivos/Alcance.
- Rueda desde validaciones reales, guardado y control de versión existentes; mantiene flujo de resultados/recovery y generación de entrega.
- Panel apilado entre 761–1100 px; diseño lateral se mantiene desde 1101 px.
- Coexiste con UX-08: objetivos, MVP, resultado esperado y selector de catálogo preservados; no se cambiaron contratos o API en UX-09.

## Verificación técnica
- PostgreSQL desechable con `current_database() = fragments_test`, `current_user = fragments_test`; migraciones aplicadas y contenedor eliminado al terminar.
- `pnpm exec turbo run test typecheck lint build --force`: 11/11 tareas; Contracts 26, Web 132, API 148 (306 tests). Incluye tests de API Mentor con borrador parcial persistido, aislamiento por usuario, versión obsoleta y evaluación incompleta.
- Tras ajuste responsive: `pnpm --filter @fragments/web test` 27 archivos/132 tests; web typecheck, lint, build y `git diff --check` PASS.
- Build avisa por bundle de 522.29 kB y directivas `use client` de lucide; termina con éxito. Detalle en `VERIFICACION_CI_LOCAL_POST_UX08.txt`.

## Revisión Ego Lite independiente
Agente B: **PASS visual e interacción local con fixtures**. Sin overflow a 320/390/768/1024/1440/1672; panel legible a 1024; CTA presente, aviso de Galería único; ArrowUp y botones cambian etapas. 13 GET sintéticos; PUT guardar y POST evaluar interceptados con 405; cero escrituras persistidas/enviadas al servidor; consola/runtime sin errores. `:focus-visible` no quedó confirmado. Guardado UI persistido, evaluación real, aislamiento y permisos de PostgreSQL no se probaron en browser; la suite API sí cubre persistencia/ACL/versiones contra la DB de test. Reporte/capturas: `REVISION_AGENT_B_POST_UX08.md`, `ego-post-ux08-*.png`.

## Integración, release y producción
- PR #78 `feat(mentor): rediseña etapa evaluación UX-09`: merge normal a `main`; check obligatorio `verify`, run `44956236067`, SUCCESS; merge `527b8f66440819e72f73366014f78e0a3aa5a991`.
- F14 `v0.5.8`, run `44956744577`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Paquete ARM64 publicado con manifiesto y bundle Sigstore; no se modificó configuración de infraestructura.
- Verificación pública posterior: `GET /health` HTTP 200, `status=ok`, `database=ready`; `/` y bundle JS `/assets/index-DmKyggnV.js` HTTP 200, 522334 bytes. El bundle contiene `v0.5.8` y el SHA completo `527b8f66440819e72f73366014f78e0a3aa5a991`.
- Ego Lite abrió `/student/mentor` en producción en modo no destructivo. La app devolvió la pantalla pública «Continúa con GitHub» y el indicador de build muestra `v0.5.8 · 527b8f6`; el flujo de evaluación no fue visible porque esta sesión no tenía autenticación. Captura `ego-produccion-v058.png`. No se inició OAuth ni se hicieron escrituras en producción.

## Verificación visual autenticada en producción
- Con Ego Lite, una vez autenticada la sesión existente, se abrió `/student/mentor` en el viewport de 1672 px y se seleccionó la etapa 5 «Evaluación». La producción muestra el stepper horizontal con Evaluación activa y el build `v0.5.8` con SHA completo `527b8f66440819e72f73366014f78e0a3aa5a991`.
- La cuenta no tenía una propuesta guardada: la rueda mostró 0 %, «Evaluar propuesta» estuvo deshabilitado y «Guardar borrador» disponible. Es el estado vacío real; no se introdujo contenido ni se guardó, evaluó o publicó nada en producción.
- Captura auténtica `ego-produccion-v058.png`, recortada para retirar identidad y pie de página, conservando navegación y pantalla. Evidencia total del directorio: 20 archivos incluido el informe.
- Esto verifica renderizado autenticado, navegación y gating en producción. No verifica una evaluación productiva con datos ni una escritura de punta a punta. Persistencia, aislamiento por usuario y versión están cubiertos por pruebas API/UI locales y la base PostgreSQL aislada `fragments_test`, con proveedor de evaluación controlado.
- Se instaló y leyó la skill disponible `vercel-react-best-practices` (nombre del registro), y se revisaron las reglas aplicables de estado derivado, actualizaciones funcionales, componentes y cargas. El diseño existente ya las cumple; no hizo falta refactor.
- La revisión visual local independiente registró que el foco `:focus-visible` no quedó confirmado en su captura. La regla CSS está definida en `apps/web/src/features/mentor/mentor-screen.css`; no se afirma aquí una comprobación visual de teclado/foco en producción.

## Commits
- Cierre de verificación autenticada: `7b77a824650d79a971a8074d42189e03f81e33cc`.
- UI inicial: `8f88ab8fc654275f00cf0dc478b321703c64b5bc`.
- Merge base UX-08: `8617dbb23325e257d44e886b340f012dbe3c8bc5`.
- CSS responsive: `6288011d11ac6679d5cbd84abd4bfe9818ba1221`.
- Cierre de evidencia y PASS de revisión: `7ac89f14d9d38a3cada4d73f1bf511a084d3bb41`.
