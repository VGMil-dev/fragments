# Evidencia — CU-05 catálogo de habilidades

Estado: cobertura ampliada; CI PostgreSQL pendiente.

## Cambio

- Vitest UI cubre creación en Classroom Studio, filtrado de habilidades y edición con carga posterior del catálogo.
- Integración HTTP/PostgreSQL cubre lectura, edición persistente al reiniciar el API y aislamiento frente a otra identidad docente.
- La prueba de persistencia ahora exige host local, URL `/fragments_test` y consulta `current_database()` antes de crear fixtures.
- No se cambia runtime, migraciones ni contratos; no se invoca IA ni se requiere una release.

## Verificación local

- Commit del test y guardas: `7f6d1c0` (`test(cu05): cubre catalogo docente de habilidades`).
- `pnpm --filter @fragments/web exec vitest run src/features/classroom/ClassroomStudio.test.tsx` — 8/8 PASS.
- `pnpm --filter @fragments/api typecheck` — PASS.
- Integración PostgreSQL local — omitida por ausencia de `DATABASE_URL`; Docker Desktop no está disponible. Ejecutar en CI aislado antes de completar.

## Limitación

El Space 44/Profile 3 autorizado no aparece en Ego Lite y `claimTaskSpace(44)` respondió `task space not found: 44`. No se creó otro espacio. La prueba autenticada visual en producción permanece NO COMPROBADA; el resultado CU05 se mantendrá parcial.
