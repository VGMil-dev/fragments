# CU-23 — Evidencia

Estado: código integrado en commit local `75588c46f08cae84f2eac1f444659468df27fb56`; publicación PR/CI, integración normal y despliegue F14 pendientes.

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
- Pendiente: PR/CI (incluida ejecución PostgreSQL efímera), integración normal y F14.
- Pendiente: revisión Ego Lite autenticada del historial en producción; si los Spaces autorizados no están disponibles, registrar NO COMPROBADO sin crear otro.
