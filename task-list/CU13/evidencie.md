# Evidencia CU-13 — configuración de entregas

Estado: cobertura automatizada ampliada; falta CI PostgreSQL desechable y verificación post-release autenticada. F18.B ya soporta snapshots de entregas y continuidad Review; la matriz Notion marca CU-13 parcial por falta de recorrido Ego Lite integral.

## Implementación y pruebas locales

- Extendido el recorrido académico HTTP/PostgreSQL para publicar tres entregas `proposal`, `progress` y `final`, con requisitos y fecha `2026-12-20` en la entrega final; verifica la versión inmutable, una Review fake completada por etapa, el siguiente ID tras cada Review y el mismo proyecto/repositorio.
- Tras completar propuesta y avance, el historial identifica `delivery-final`; tras completar final, `nextDeliverableId=null`. El historial y Trainer no exponen score/findings privados.
- Prueba local memory/fake `repository.test.ts` y `academic-flow.integration.test.ts`: 8 PASS, 4 omitidas. Las cuatro omitidas son la integración PostgreSQL porque `DATABASE_URL` no está configurada; no se usó la base remota ni se modificaron datos.
- `pnpm --filter @fragments/api typecheck` PASS; `git diff --check` PASS.
- Revisión independiente estática: CLEAN; confirmó snapshot de tres etapas, continuidad, proyecto/repositorio común y exclusión de hallazgos privados. El revisor no ejecutó tests.
- Este incremento solo amplía pruebas de código ya desplegado; no cambia comportamiento runtime, esquema, contratos ni prompts. No requiere release nueva.

## Pendiente de verificación

- Ejecutar la prueba PostgreSQL con DB desechable en CI antes de integrar. Resultados: PENDIENTE.
- CU-13 producción/Ego Lite autenticada permanece NO COMPROBADA; no usar Review IA real. Los Spaces 44/80 no aparecen disponibles en el runtime.
- El comportamiento evaluado es con proveedores `fake`; calidad de evaluación IA real continúa NO COMPROBADA.

## Límites conocidos

- Los Spaces Ego Lite autorizados (44 docente y 80 estudiante) no aparecen disponibles en el runtime de esta sesión. No se crean perfiles ni sesiones sustitutas.
- La validación de la progresión de las tres entregas se requiere con PostgreSQL desechable y proveedor fake en CI; esto no equivale a Review IA real ni a validación autenticada en producción.
- No se ha hecho ninguna escritura en producción, llamada IA real ni modificación de esquema.
