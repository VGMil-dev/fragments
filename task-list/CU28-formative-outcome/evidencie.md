# Evidencia CU-28 — integrado en main

- Implementación en commit `7a319ad943a3139e9d490417891269cfa8ee20c7`: contrato Zod compatible con registros anteriores, selector docente obligatorio para nuevas valoraciones y resumen persistido de valoración/notas.
- Pruebas rojas iniciales: el contrato descartó la nueva valoración; la UI no mostraba la valoración ni enviaba el campo. Salidas registradas en esta sesión.
- Pruebas verdes locales: `pnpm --filter @fragments/contracts build`; contracts + Inspector teacher panel + cliente UI + servicios Inspector + HTTP: 46 passed, 8 skipped; lo omitido requiere DATABASE_URL. Typecheck API/web y diff-check PASS.
- PR #341: https://github.com/VGMil-dev/fragments/pull/341; CI #45725692114 SUCCESS: PostgreSQL efímero, `academic-flow` 6/6; API 73/287, web 58/342, contratos 33/33, typecheck/lint/build PASS.
- Merge normal en `main`: `8a17b80887dda71b600a635eb488eb8325e97e26` (2026-11-26 00:03 UTC).
- El campo `competencyOutcome` y las notas se guardaron y recuperaron por HTTP; el resumen asocia la defensa con Review final y SHA exacto. Providers fake etiquetados; no hubo llamadas pagadas, migración ni escrituras productivas.
- F26 sigue en Idea: sin fórmula, puntos o nota oficial implementados.
- Ego Lite/producción y validación pedagógica con docente: NO COMPROBADOS. CU-28 integral permanece parcial.
- Release productiva v0.5.94 aplicada por F14, run #45726817051 y ledger release #458790752 `deployed` al SHA `381e04c95a3eebf7a8a5c5639b946c70547f966f`. Backup de 98,409 bytes con integridad `restored_to_temporary_database`; API/web healthy, `/health` ok/database=ready, bundle público contiene versión y SHA. No se escribió información académica en producción; esta comprobación no valida UI autenticada ni evaluación del docente.
- Documentación de despliegue integrada por PR #343, commit fuente `3be5a3cf0d8cd339a1003c429aa7bc122ad9fe43`, CI #45728654637 SUCCESS, merge normal `5d25be0ac8023f32620dde5f660197f23efeec30`.
