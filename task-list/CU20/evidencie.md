# Evidencia CU-20 — CTA de continuidad

Estado: ajuste implementado localmente; integración/F14 y observación autenticada post-release pendientes.

## TDD y límites

- Commit de implementación y regresiones: `3732d83c220cb1fe4980a0b331afe87386f1f453` (`feat(CU-20): aclara la continuidad de mision`).
- Rojo: `AssignmentsPanel.test.tsx` esperaba el CTA nuevo «Continuar misión» pero la UI mostraba «Abrir propuesta vinculada»; dos pruebas focales fallaron antes de actualizar el componente.
- Verde: `AssignmentsPanel.test.tsx`, `App.student-flow.test.tsx` y `StudentClassroomsScreen.test.tsx`: 3 archivos/42 pruebas PASS; typecheck web y `git diff --check` PASS.
- No cambia algoritmo: `continueProposal` sigue consultando envíos e historial guardado y decide el destino Mentor/Review/Trainer. No se realizaron escrituras productivas ni llamadas IA.
- Revisión independiente estática: CLEAN; no ejecutó pruebas ni visual QA.
- Estado previo a integración: producción `v0.5.88`; cambio no desplegado. UI Ego Lite autenticada NO COMPROBADA porque los Spaces autorizados 44/80 no aparecen en runtime.

## Despliegue por F14 · v0.5.89 · 2026-11-25

- PR #316 merge normal `fd91e02ba7d877d7f492ee64a6bd12d9d1024974`; CI `45685906693` SUCCESS. F14 run `45686422248` completó verify-build, attest-package y publish-approved-release SUCCESS.
- La cola y el aplicador normales registraron `release_deployed`; ledger `v0.5.89`/SHA exactos en `deployed`. API/web healthy sobre el SHA. `/health` HTTP 200 `ok/database=ready` después de un 502 transitorio durante apply que se recuperó sin intervención.
- Backup de release 98,409 bytes, SHA-256 `d916f87dc800741ac44e888c42bfa26e8b76ac2bf59d484d3891acac2cd2fec5`, `restored_to_temporary_database`. Partición raíz 89 GB libres (55 % usado), inodos 12 %; timer/path/cloudflared activos, cero units fallidos, servicios vecinos sanos; imágenes `v0.5.88` y `v0.5.87` preservadas para rollback. No hubo migraciones, cambios de infraestructura ni escrituras académicas.
- La aplicación quedó desplegada, pero CU-20 sigue parcial: UI autenticada post-release y selección de Mentor/Review/Trainer por estado persistido NO COMPROBADAS, porque Ego Lite no expone los Spaces autorizados 44/80. Review IA real/calidad tampoco se comprobaron. No se declara el recorrido completo PASS.
