# Evidencia F18.B.6

Estado: implementación local; integración PR y release F14 pendientes.

## Defecto comprobado

F18.B.5 recorría los intentos en orden inverso al de creación. Como `listMissionDeliveryHistory` conserva `createdAt` ascendente mientras los jobs pueden completar fuera de orden, podía abrir un Review completado que no fue el último en terminar.

## Prueba roja/verde

- Prueba nueva antes del arreglo: falló de forma esperada; seleccionó `review-created-last` aunque `review-finished-last` tenía el mayor `updatedAt`. Resultado observado: 1 fallo / 7 PASS en el test focal.
- Cambio: filtra los intentos completados y los ordena por `updatedAt` descendente, con `createdAt` descendente como desempate. Los retries fallidos se ignoran.
- Test focal tras la corrección: `pnpm --filter @fragments/web exec vitest run src/features/student/mission-continuation.test.ts` — 8/8 PASS.
- Suite web: `pnpm --filter @fragments/web test` — 57 archivos, 329/329 PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; permanecen avisos conocidos de chunk >500 kB y directivas `use client` de lucide-react.
- `git diff --check` — PASS.

Commit de código: `c6a62058376b71e202c4942ff28c044f02476900` (`fix(F18.B.6): elige la Review finalizada mas reciente`).

No se probó con usuario/sesión productiva ni se llamó IA. Ego Lite post-release sigue pendiente por ausencia de Spaces autorizados 44/80; release productiva pendiente.
