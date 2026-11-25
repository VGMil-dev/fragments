# Evidencia CU-13 — configuración de entregas

Estado: cobertura automatizada de tres entregas PASS en CI; la matriz Notion mantiene CU-13 PARCIAL por falta del recorrido UI autenticado en producción.

## Implementación y pruebas locales

- Extendido el recorrido académico HTTP/PostgreSQL para publicar tres entregas `proposal`, `progress` y `final`, con requisitos y fecha `2026-12-20` en la entrega final; verifica la versión inmutable, una Review fake completada por etapa, el siguiente ID tras cada Review y el mismo proyecto/repositorio.
- Tras completar propuesta y avance, el historial identifica `delivery-final`; tras completar final, `nextDeliverableId=null`. El historial y Trainer no exponen score/findings privados.
- Prueba local memory/fake `repository.test.ts` y `academic-flow.integration.test.ts`: 8 PASS, 4 omitidas. Las cuatro omitidas son la integración PostgreSQL porque `DATABASE_URL` no está configurada; no se usó la base remota ni se modificaron datos.
- `pnpm --filter @fragments/api typecheck` PASS; `git diff --check` PASS.
- Revisión independiente estática: CLEAN; confirmó snapshot de tres etapas, continuidad, proyecto/repositorio común y exclusión de hallazgos privados. El revisor no ejecutó tests.
- Este incremento solo amplía pruebas de código ya desplegado; no cambia comportamiento runtime, esquema, contratos ni prompts. No requiere release nueva.

## Integración

- Commit de pruebas `ffe5878ed95a0ecc1b3c17424ab59adb7ba1caf3`; PR #314 merge normal en `12df6f599e6a4037a290796661694dacd8d9160d`.
- CI #45683751479 SUCCESS. La suite `academic-flow.integration.test.ts` pasó con PostgreSQL desechable (4 casos); API 72 archivos/283 pruebas PASS; web 57/336, contratos 33/33; typecheck, lint y build PASS.
- La rama solo añadió tests y evidencia; no hubo cambio de comportamiento runtime ni nueva tag. El runtime permanece en `v0.5.88` (bundle/SHA/health verificados en `task-list/CU12/evidencie.md`).

## Pendiente de verificación

- Commit de pruebas: `ffe5878ed95a0ecc1b3c17424ab59adb7ba1caf3` (`test(CU-13): valida tres etapas de una mision`).
- CU-13 producción/Ego Lite autenticada permanece NO COMPROBADA; no se verificó interacción docente para crear/publicar la misión ni lectura autenticada estudiante post-release. Los Spaces 44/80 no aparecen disponibles en el runtime.
- El comportamiento evaluado es con proveedores `fake`; calidad de evaluación IA real continúa NO COMPROBADA.

## Límites conocidos

- Los Spaces Ego Lite autorizados (44 docente y 80 estudiante) no aparecen disponibles en el runtime de esta sesión. No se crean perfiles ni sesiones sustitutas.
- La validación de la progresión de las tres entregas se requiere con PostgreSQL desechable y proveedor fake en CI; esto no equivale a Review IA real ni a validación autenticada en producción.
- No se ha hecho ninguna escritura en producción, llamada IA real ni modificación de esquema.
