# F04.1 — Evidencia: PDF Mentor sin pérdida de texto

Estado: implementado y desplegado; verificación funcional del PDF en producción pendiente.

## Hallazgo inicial

- 2026-11-25, producción `v0.5.78`, SHA `4e61e03868984546f8ab572a61d8ef93b838dd66`, Ego Lite estudiante Space 80/Profile 5. Se descargó una entrega Mentor propia desde Mis entregas sin generar evaluación nueva.
- El visor PDF Ego Lite mostró repetidos los prefijos de problema, solución, objetivo, resultado y alcance, omitiendo los sufijos. GET autenticado a propuestas confirmó valores fuente de una sola línea, sin repetición.
- Causa en `apps/api/src/features/mentor/local-fakes.ts`: `wrapPdfLine` partía el texto en bloques de 88, pero volvía a añadir el prefijo en vez del resto.
- Captura Ego Lite auténtica, recortada para excluir el código de verificación: `FRAGMENTS_EVIDENCIAS_FINAL/CU29-pdf-layout-defect-crop.png`, SHA-256 `6353CC7E6C0E5621B4C1E257000802521737E6122CA374C485B1B990282BBC6B`. El PDF original no se conserva en el paquete porque contiene dicho código.
- No se modificaron datos productivos ni se hizo llamada IA.

## Implementación y pruebas locales

- Regresión primero en rojo: un campo de 113 caracteres debe preservar una sola vez el bloque inicial de 88 y el sufijo de 25. Resultado inicial: 1 fail / 8 pass, reprodujo el prefijo repetido.
- `wrapPdfLine` recorre offsets de 88 caracteres y conserva cada fragmento restante, incluido campo vacío.
- Regresiones de 113, 89, 176 y 177 caracteres: `pnpm exec vitest run apps/api/src/features/mentor/service.test.ts` — 12/12 PASS.
- Preparación limpia del checkout: `pnpm --filter @fragments/contracts build` PASS y `pnpm --filter @fragments/api prisma:generate` PASS; solo generación local desde esquemas existentes.
- `pnpm --filter @fragments/api typecheck` PASS.
- `pnpm --filter @fragments/api test` — 52 archivos PASS, 20 omitidos; 202 tests PASS, 75 omitidos (277 total). No se usaron credenciales, PostgreSQL productivo ni proveedores de IA; pruebas con evaluator fake.
- `git diff --check` PASS.

## Regresión adicional: codificación del español · 2026-11-25

- Se inspeccionó el renderer de producción `apps/api/src/adapters/ai/pdf-renderer.ts`: reemplazaba todos los caracteres no ASCII por `?` y declaraba Helvetica sin codificación explícita. Esto podía degradar tildes y eñes del contenido PDF aunque el arreglo de líneas largas estuviera desplegado.
- TDD: se añadió primero `apps/api/src/adapters/ai/pdf-renderer.test.ts`; la prueba falló mostrando `Soluci?n: programaci?n, ni?ez y acci?n.` y ausencia de `/Encoding /WinAnsiEncoding`.
- La corrección codifica los caracteres Latin-1 y el conjunto especial Windows-1252 como escapes octales PDF y declara `/WinAnsiEncoding` para Helvetica. Caracteres fuera del repertorio de la fuente siguen degradándose a `?`.
- `pnpm exec vitest run apps/api/src/adapters/ai/pdf-renderer.test.ts apps/api/src/features/mentor/service.test.ts` — 2 archivos, 13/13 PASS. `pnpm --filter @fragments/api typecheck` PASS. `git diff --check` PASS.
- Un intento adicional de inspección con `pdfinfo` no pudo generar el archivo temporal de prueba porque `tsx` no resolvió desde la raíz; el segundo intento de script temporal fue rechazado por la política del host. No se declara esa verificación de parser como PASS; el test automatizado verifica los objetos y el texto escapado.
- Sin acceso autenticado de Ego Lite en Space 80, la descarga post-fix en producción sigue **NO COMPROBADA**. Sin despliegue posterior de este cambio, los acentos de producción también siguen **NO COMPROBADOS**. No hubo llamadas IA ni escrituras productivas.

## PR y release F14

- PR #287 merge normal. PR head `63cacfe1fbe45db142cc956e00ef3c921f179eb2`; merge `0894f9b63ab24d2bc4a1e117dd496de75bf1f6fe`.
- CI PR `verify` run `45616928943` PASS.
- Tag anotada `v0.5.79` apunta exactamente al merge SHA. F14 `45617644487`: verify-build, attest-package y publish-approved-release SUCCESS.
- Preflight de solo lectura, 12:54 UTC: producción `v0.5.78`, API/web healthy, `/health ok/ready`, raíz 118 GB libres (39 %), inodos 9 %, timer activo; imagen activa preservada como rollback. No se limpiaron imágenes/cache.
- Poller normal recogió release ID `458113599` a las 12:59:31 UTC. El aplicador F14 finalizó `release_deployed` a las 13:01:26 UTC, `Result=success`, `ExecMainStatus=0`.
- Ledger read-only: tag `v0.5.79`, commit exacto, estado `deployed`; backup 98,065 bytes, SHA-256 `c2ee6b5b01ac3996424522c2f0b6a0637c03848c0d0ba29cf1793f88b79f6bcd`, integridad `restored_to_temporary_database`.
- SSH read-only confirma API/web `Up (healthy)` en SHA exacto; `/health` HTTP 200 `ok/database=ready`; `/assets/index-pCsfTCJQ.js` incluye versión y SHA exactos; imágenes de v0.5.78 disponibles para rollback; raíz 116 GB libres (41 %), inodos 9 %; servicios vecinos healthy; `systemctl --failed` vacío.
- No se solicitó aprobación humana, deploy/reinicio manual, migración, limpieza o evaluación IA.

## Límite pendiente

- Ego Lite `listTaskSpaces()` no encontró el Space 80/Profile 5 previamente autorizado. La skill indica detenerse y recuperar ese mismo espacio; no se abrió otro perfil/space.
- Por lo anterior, el PDF propio posterior al fix no se descargó ni abrió. Defecto histórico de v0.5.78: confirmado FAIL, corregido y desplegado. PDF post-fix en producción/CU-29: NO COMPROBADO. F04.1 permanece abierta hasta la revalidación E2E con la sesión autorizada.
- `ego-browser` v2.2.1 y skill PDF fueron consultadas/aplicadas para la inspección inicial; no se pudo iniciar la ronda post-deploy por falta del Space autorizado.


- Commit de actualización de evidencia y TASKS.md: `0c0c457b0036e03e7473569dad1e3da3ceafadb1` (rama `codex/cu29-pdf-release-evidence`).
