# Evidencia CU-12 — validación del peso de rúbrica

Estado: corrección integrada y desplegada en producción; la verificación visual autenticada de Ego Lite permanece NO COMPROBADA.

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

- PR #312 se integró mediante merge normal el 2026-11-25; merge SHA `cd05bd238750bc1da8aa7b8de5ea29bfbdd153c9`; CI `45679461617` SUCCESS; revisor independiente CLEAN (solo lectura/diff).
- Release anotada `v0.5.88` apunta a ese SHA. F14 run `45680454124`: `verify-build`, `attest-package`, `publish-approved-release` SUCCESS. Ledger release `458529022` = `deployed` por poller/aplicador normales.
- Backup productivo `fragments-prod-2026-11-25T19-04-39-502Z.dump`, 98,409 bytes, SHA-256 `ac38e49638cf117caab68a906c037d95079ebd74c39c4fefa57ca6bd0259e3e3`, integridad `restored_to_temporary_database`.
- Verificación posterior: API/web healthy sobre `sha-cd05bd238750bc1da8aa7b8de5ea29bfbdd153c9`; `/health` HTTP 200 con `ok/database=ready`; bundle `/assets/index-G1iFj5_B.js` contiene `v0.5.88` y SHA exacto. Timer F14, apply path y cloudflared activos; `systemctl --failed` vacío; servicios vecinos healthy; raíz 92 GB libres (53% usado), inodos 12%; imagen previa conservada para rollback, no ejercido.
- La regla F14/controles técnicos no se alteraron; no hubo despliegue/reinicio manual ni escrituras SQL productivas.
- Prueba local sigue limitada por falta de `DATABASE_URL`: 78 pruebas API omitidas; el CI de F14 probó PostgreSQL desechable y backup/restore. No hubo llamada a proveedor de IA.
- UI autenticada Ego Lite tras el release NO COMPROBADA. El usuario autorizó reclamar Space 44; el runtime no lo ofreció y la reclamación falló. Space 80 también sigue ausente. No se creó ni cerró ninguna sesión sustitutiva.

## Cierre de implementación

- Comportamiento desplegado: total de peso explícito cuando la rúbrica no suma 100, publicación bloqueada en cliente y servidor, sin crear versión inválida.
- Estado de la incidencia CU-12 en la matriz académica: PARCIAL hasta probar la experiencia autenticada completa y los casos de comparación/inmutabilidad de rúbricas que siguen pendientes.
