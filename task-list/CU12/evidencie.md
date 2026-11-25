# Evidencia CU-12 — validación del peso de rúbrica

Estado: corrección de feedback implementada localmente; integración y despliegue F14 pendientes.

## Cambio y TDD

- La aplicación ya deshabilitaba «Publicar» mediante `AssignmentPublicationSchema`, y el repositorio rechazaba drafts incompletos sin crear snapshot. La interfaz solo mostraba una indicación genérica.
- Rojo UI: nueva prueba con total 99 confirma que el botón está deshabilitado; falla porque no se explica el peso actual.
- Regresión de servidor: `repository.test.ts` con peso 99 comprueba `incomplete_assignment`, cero versiones creadas y `publishedVersion=null`.
- Verde focal: `AssignmentsPanel.test.tsx` 13/13, `repository.test.ts` 7/7, contratos `index.test.ts` 33/33.
- Suites completas: web 57 archivos/336 pruebas PASS; API 52 archivos PASS, 20 omitidos; 204 pruebas PASS, 78 omitidas. Las integraciones PostgreSQL fueron omitidas porque no hay `DATABASE_URL`; Docker Desktop tampoco está activo. No hubo conexión ni escritura a base de datos.
- Typecheck web y API PASS. Build web PASS con avisos existentes por chunk >500 kB y directivas `use client` en lucide-react. `git diff --check` PASS.
- Commit de implementación y regresiones: `1d1c3ca` (`fix(assignments): explica el peso invalido de rubrica`). Rama `codex/cu12-rubric-feedback`, basada en `origin/main` (`8708c8894654c8ce05e6d9880978b490cc3e55c4`).
- Verificación final después del cambio de pruebas: `pnpm --filter @fragments/web test` — 57 archivos/336 PASS; prueba focal 13/13 PASS. API focal 7/7 PASS, contratos 33/33 PASS; suite API 52 archivos/204 PASS/78 omitidas; typecheck web/API y build web PASS.

## Límites actuales

- Producción continúa en `v0.5.87`; este cambio no está integrado ni desplegado.
- No se verificó la tarjeta de misión con Ego Lite, porque Spaces 44/80 no están disponibles para reclamar. No se afectaron datos productivos.
- Pendiente: publicar rama y PR, CI/revisión independiente, merge normal, release etiquetada autorizada por F14 y comprobación del bundle/health; después, UI autenticada si regresa el Space docente.
