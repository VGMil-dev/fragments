# Evidencia F18.B.6

Estado: implementado e integrado; F14 no pudo publicar la release por un error HTTP 500 de GitHub. Producción aún no actualizada.

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

## Integración y F14

- PR [#297](https://github.com/VGMil-dev/fragments/pull/297) integrado mediante merge normal `7e376186a6c7d0171efd001bf0f6a2cc4442972a`; CI [#45648476663](https://github.com/VGMil-dev/fragments/actions/runs/45648476663) SUCCESS.
- Tag anotada `v0.5.85`, tag object `6a14a2a107276e158680ce3ba6411bb347123c49`, apunta al merge SHA exacto.
- F14 run [#45649110294](https://github.com/VGMil-dev/fragments/actions/runs/45649110294): `verify-build` y `attest-package` SUCCESS; `publish-approved-release` FAILED cuando GitHub respondió HTTP 500 al endpoint de creación de release. No hay release existente para la tag (consulta por tag respondió 404).
- Dos intentos de reejecutar solo el job fallido también devolvieron HTTP 500 en la API de GitHub. No se creó otra tag ni se modificó el workflow.
- Producción continúa en `v0.5.84`; la corrección F18.B.6 no se ha desplegado. F14 normal, Ego Lite y validación productiva quedan pendientes. No se usó un mecanismo manual para crear la release.

No se probó con usuario/sesión productiva ni se llamó IA. Ego Lite post-release sigue pendiente por ausencia de Spaces autorizados 44/80.
