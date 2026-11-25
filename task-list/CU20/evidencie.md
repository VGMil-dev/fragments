# Evidencia CU-20 — CTA de continuidad

Estado: ajuste implementado localmente; integración/F14 y observación autenticada post-release pendientes.

## TDD y límites

- Commit de implementación y regresiones: `3732d83c220cb1fe4980a0b331afe87386f1f453` (`feat(CU-20): aclara la continuidad de mision`).
- Rojo: `AssignmentsPanel.test.tsx` esperaba el CTA nuevo «Continuar misión» pero la UI mostraba «Abrir propuesta vinculada»; dos pruebas focales fallaron antes de actualizar el componente.
- Verde: `AssignmentsPanel.test.tsx`, `App.student-flow.test.tsx` y `StudentClassroomsScreen.test.tsx`: 3 archivos/42 pruebas PASS; typecheck web y `git diff --check` PASS.
- No cambia algoritmo: `continueProposal` sigue consultando envíos e historial guardado y decide el destino Mentor/Review/Trainer. No se realizaron escrituras productivas ni llamadas IA.
- Revisión independiente estática: CLEAN; no ejecutó pruebas ni visual QA.
- Estado previo a integración: producción `v0.5.88`; cambio no desplegado. UI Ego Lite autenticada NO COMPROBADA porque los Spaces autorizados 44/80 no aparecen en runtime.
