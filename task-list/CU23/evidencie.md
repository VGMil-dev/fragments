# CU-23 — Evidencia

Estado: código integrado por PR #323 en merge `509000c6cfa032d663cd969dd63075ab46063c20`; desplegado como `v0.5.91`. El CU completo sigue PARCIAL: la UI autenticada de producción no se pudo validar en Ego Lite.

## Hallazgo

- La matriz Notion mantiene CU-23 P0 parcial: el historial observado contiene varias entregas Mentor de un mismo `sourceId`; no se afirmó que fueran commits distintos. La prueba de API listaba etiquetas, puntajes y rúbrica pero omitía el SHA que ya persiste en el snapshot Review; la UI tampoco mostraba `rubricVersion`.
- Se añadió primero una regresión UI; en rojo, «Mis entregas» omitía el SHA y la versión de rúbrica. Salida focal: 1 fail/22 pass, ambos campos ausentes en la fila.
- Regresión UI después del cambio: `pnpm --filter @fragments/web exec vitest run src/App.student-flow.test.tsx` — 1 archivo, 23/23 PASS.
- Suite web: `pnpm --filter @fragments/web test` — 57 archivos, 338/338 PASS.
- Suite API: `pnpm --filter @fragments/api test` — 53 archivos PASS, 20 omitidos; 206 PASS, 79 omitidas. Las pruebas PostgreSQL están omitidas porque no hay `DATABASE_URL` en este entorno.
- Integración focal: `pnpm --filter @fragments/api exec vitest run src/features/mentor/repository.test.ts` — omitida (4 tests) por ausencia de `DATABASE_URL`. La prueba ahora exige `current_database() = fragments_test` antes de crear fixtures y evita cleanup si esa guarda falla.
- Contratos: `pnpm --filter @fragments/contracts build` PASS. Typecheck API y web PASS.

## Cambios

- Implementado localmente: SHA opcional validado (40 hex), extracción desde snapshot Review ligado a job del estudiante titular, exposición de rúbrica/fecha/SHA completo en UI, y prueba PostgreSQL para commits/rúbricas distintos, orden, aislamiento y SHA histórico inválido.

## Verificación y despliegue

- Build `pnpm build` PASS (web Vite, API tsc y Prisma client); se mantienen advertencias existentes del bundle >500 kB y directivas `use client` de lucide.
- Lint `pnpm lint` PASS (solo contracts expone script de lint). Typecheck `pnpm typecheck` PASS. Diff check PASS.
- PR #323 integrado normalmente; CI run `45700376763` PASS (aplica Prisma a PostgreSQL desechable y ejecuta pruebas/typecheck/lint/build). F14 run `45701424827` PASS en verify-build, attest-package y publish-approved-release; paquete ARM64 firmado y validado.
- Tag anotada `v0.5.91` apunta al merge exacto. Aplicación normal F14: release ID `458655140`, ledger `deployed`, API/web sobre SHA exacto; bundle `/assets/index-xHykWBFP.js` y `/health` HTTP 200, `ok/database=ready`.
- Backup `fragments-prod-2026-11-25T21-16-21-115Z.dump`, 98,409 bytes, SHA-256 `c3da288bf53d54803f764f76d6beb6003f807fddfbda12ebb2a2cea24d37f6d5`, `restored_to_temporary_database`. Imagen previa v0.5.90 conservada. VPS tras despliegue: 80 GB libres, 59 % usado, inodos 13 %; timer/path activos, apply inactivo, `systemctl --failed` vacío, Tymeslot/ImagenEC/Pits saludables.
- Producción funcional autenticada: NO COMPROBADA. Los Spaces autorizados Ego Lite 44/80 no aparecen en el runtime actual; no se abrió un perfil/Space sustituto ni se generaron entregas. El despliegue de bundle no demuestra el flujo autenticado, ni que existan dos entregas reales con commits distintos. No se evaluó IA real ni se modificó una cuenta/entrega productiva.

## Filtro de propietario antes del límite del historial — en verificación · 2026-11-26

- Se identificó una truncación por actividad global: `listStudentSubmissions` leía los 200 jobs Review más recientes de todas las identidades y filtraba al estudiante después; otros 200 jobs podían ocultar Reviews propios antiguos.
- Cambio en curso: el filtro por `payloadJson.context.studentId` se aplica en la consulta PostgreSQL antes de `take: 200`. Se añadió regresión aislada con 205 jobs ajenos más un Review propio anterior, y limpieza de fixtures limitada a `fragments_test` con prefijo aleatorio de esta prueba.
- Verificación local: typecheck API PASS. La prueba focal `repository.test.ts` se omitió por falta de DATABASE_URL local; el archivo comprueba `current_database() === fragments_test` antes de crear fixtures. CI PostgreSQL queda pendiente; aún no se afirma que la regresión esté aprobada.
