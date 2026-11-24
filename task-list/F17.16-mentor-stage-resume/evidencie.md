# Evidencia F17.16

Estado: integrado y desplegado en producción como `v0.5.73`; comportamiento de reanudación verificado con Ego Lite en Space 80.

## Pruebas

- Antes del fix: `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx` falló la nueva prueba. Resultado observado: una propuesta sin objetivos ni alcance abría «Evaluación» después de un `NOT_FOUND` de recuperación.
- Después del fix: mismo comando — PASS, 46/46.
- `pnpm --filter @fragments/web test` — PASS, 54 archivos, 309/309.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS. Advertencias: chunk principal >500 kB y directivas `use client` de Lucide, preexistentes/no abordadas.
- `git diff --check` — PASS.

## Límites

Los tests locales usan callbacks fake. La comprobación productiva fue autenticada, solo lectura y con una propuesta de QA propia: no se guardó ni editó contenido, no se evaluó y no hubo llamada a proveedor IA. La verificación visual se limitó al estado funcional y snapshot Ego Lite; no es una evaluación completa de accesibilidad ni de calidad semántica IA.

- Commit de implementación: `16af14a3a2acaaa0c85c05d4f74015b727562063` (`fix(F17.16): reanudar Mentor en etapa pendiente`).
- Commit de evidencia/índice: `c1c485ed321f0c1385184aa9e7faca1c29071ef9` (`docs(F17.16): registrar pruebas y commit`).
- Commit de actualización de estado de PR: `d3f3b8e7baa5f5587ecb4253770bf18b76c55ff3`.
- PR [#272](https://github.com/VGMil-dev/fragments/pull/272) — merge protegido normal, merge SHA `a250c260d3623050992ee33bb3ca6ab219dd4cb7`; CI #45492461040 SUCCESS.
- Tag anotada `v0.5.73` apuntó al SHA exacto de main. F14 run #45493007168 SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`.
- F14 poll/apply normales: `release_request_queued` ID `457369884`; `release_deployed`, exit `0/SUCCESS`. Las imágenes API/web `sha-a250c260d3623050992ee33bb3ca6ab219dd4cb7` quedaron healthy; PostgreSQL healthy. Health público `ok/database=ready`; bundle `/assets/index-BWVhuAlB.js` contiene v0.5.73 y SHA completo. No hubo deploy o reinicio manual.
- Ego Lite Profile 5, Space 80 existente: `/student/mentor?proposalId=da25119e-f1db-4cbb-892b-3ce45143c4df` mostró etapa activa «Objetivos y alcance», progreso 71 %, Idea/contexto/habilidades completadas, objetivos sin iniciar y Evaluación pendiente. No se guardó, evaluó ni alteró la propuesta; Space 80 quedó con `p1` preservada para el propietario.
