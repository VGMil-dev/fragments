# Evidencia — CU-05 catálogo de habilidades

Estado: pruebas de catálogo y persistencia QA completadas; validación autenticada visual pendiente.

## Cambio

- Vitest UI cubre creación en Classroom Studio, filtrado de habilidades y edición con carga posterior del catálogo.
- Integración HTTP/PostgreSQL cubre lectura, edición persistente al reiniciar el API y aislamiento frente a otra identidad docente.
- La prueba de persistencia ahora exige host local, URL `/fragments_test` y consulta `current_database()` antes de crear fixtures.
- No se cambia runtime, migraciones ni contratos; no se invoca IA ni se requiere una release.

## Verificación local

- Commit del test y guardas: `7f6d1c0` (`test(cu05): cubre catalogo docente de habilidades`).
- `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx` — 8/8 PASS.
- `pnpm --filter @fragments/api typecheck` — PASS.
- CI GitHub Actions #45719359913 — SUCCESS sobre PR #333; PostgreSQL desechable, migración, suite API 73 archivos/286 pruebas PASS (incluye `classroom/persistence.test.ts` 1/1), web 58 archivos/342 pruebas PASS (incluye `ClassroomStudio.test.tsx` 8/8), typecheck/lint/build PASS.
- PR #333 integrado normalmente el 2026-11-25; merge SHA `31e2b28980dcea069ed7a774c358b88df43844d6`. El cambio es solo de tests y documentación; no requiere release.
- Prueba PostgreSQL local omitida por ausencia de `DATABASE_URL`; Docker Desktop no está disponible. La verificación equivalente corrió en CI aislado.

## Limitación

El Space 44/Profile 3 autorizado no aparece en Ego Lite y `claimTaskSpace(44)` respondió `task space not found: 44`. No se creó otro espacio. La prueba autenticada visual en producción permanece NO COMPROBADA; CU-05 queda parcial aunque sus pruebas automatizadas de QA pasaron. No hubo cambio en producción.
