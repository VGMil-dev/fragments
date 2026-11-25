# Evidencia — CU-06 habilidades por aula y snapshots

Estado: implementación de prueba; CI PostgreSQL pendiente.

## Cambio

- Se agregó un caso en `apps/api/src/features/assignments/academic-flow.integration.test.ts` para visibilidad según habilitación, preservación del snapshot publicado después de renombrar/archivar y rechazo de una misión nueva que use la habilidad archivada.
- Fixtures sintéticos propios. Sin cambio de runtime/migraciones/contratos, sin proveedor IA ni escrituras productivas.

## Verificación local

- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts --maxWorkers=1` — 1 archivo/6 pruebas OMITIDAS porque no existe `DATABASE_URL`; no es una comprobación PostgreSQL.
- `git diff --check` — PASS.
- Añadido en commit: pendiente.
- PostgreSQL CI — pendiente.

## Limitación

La integración autenticada de Ego Lite no se realizó: el Space 44/Profile 3 fue autorizado pero Ego Lite responde `task space not found: 44`. No se creó un espacio sustituto. El caso productivo visual permanece NO COMPROBADO.

## Ajuste tras CI inicial

CI #45720413138 detectó que la prueba modificaba una habilidad compartida con otros casos paralelos de la misma suite; también precisó que el snapshot incluye `description: null`. Se aisló la prueba con una habilidad fixture independiente y se ajustaron las aserciones al DTO real. El run inicial falló y no se interpreta como resultado funcional PASS; el commit correctivo vuelve a ejecutar CI.
