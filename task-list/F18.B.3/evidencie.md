# Evidencia F18.B.3

Estado: IMPLEMENTACIÓN LOCAL VERIFICADA PARCIAL; integración PostgreSQL, revisión, PR y producción pendientes.

## Preflight

- Base de trabajo: `origin/main` `449b4b8c44ed891bf103a60f7e35a529e5cdcb05`.
- Worktree aislado: `C:\Users\vgmil\.codex\worktrees\f18-delivery-trace\Fragments`.
- Rama: `codex/f18b-mission-delivery-tracking`.
- Sistema revisado: `AssignmentVersion` ya conserva un `snapshotJson`; no se requiere migración para añadir rúbrica/entregas versionadas.
- `test-driven-development` y `verification-before-completion` no están instaladas en esta sesión; no se afirma su uso. Se seguirá ciclo rojo/verde y se registrarán comandos reales.
- No se usará proveedor IA real ni se harán escrituras productivas.

## Verificación

- `pnpm --filter @fragments/contracts build` — PASS.
- `pnpm --filter @fragments/contracts exec vitest run src/index.test.ts` — 31/31 PASS. Cubre pesos 100, IDs de criterios repetidos, menos de dos entregas, referencia de criterio ausente, orden continuo e histórico versionado.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/repository.test.ts src/features/assignments/mentor-context.test.ts src/features/assignments/http.test.ts` — 14/14 PASS. Comprueba snapshot inmutable v1/v2, rechazo de publicación incompleta y precedencia de rúbrica de misión sobre la global para Mentor.
- `pnpm --filter @fragments/web exec vitest run src/features/assignments/AssignmentsPanel.test.tsx src/features/student/StudentClassroomsScreen.test.tsx` — 17/17 PASS. Comprueba las nuevas vistas de configuración, tarjetas estudiante, criterios, entregas y continuidad del flujo existente.
- `pnpm --filter @fragments/web typecheck` y `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web build` — PASS; mantiene el aviso conocido de chunk >500 kB.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts` — cuatro pruebas omitidas porque `DATABASE_URL` no está configurada en este proceso. Se encontró un contenedor PostgreSQL de prueba preexistente en `127.0.0.1:55447`, pero no se adivinaron roles/credenciales ni se modificó. La integración queda **NO COMPROBADA localmente**, pendiente de CI con base efímera y preflight `current_database() = fragments_test`.

## Cambios locales

- Contratos Zod de rúbrica propia (1–10 criterios; pesos suman 100), entregas ordenadas (2–12 al publicar) y referencias a criterios existentes. Los snapshots históricos sin campos nuevos reciben lista vacía sin migración.
- Persistencia de borrador y snapshot inmutable en `draftJson`/`snapshotJson`; al publicar, las versiones anteriores permanecen sin cambios.
- Mentor toma la rúbrica del snapshot enlazado; usa F11 global para snapshots históricos sin rúbrica propia.
- Classroom Studio edita y previsualiza rúbrica/entregas y bloquea publicar un borrador incompleto. Mis aulas muestra la configuración publicada del estudiante.
- No se conecta cada entrega con un Review/commit, no se registra historial de entregas, ni se calcula progreso/notas. No se ejecutó IA real, Ego Lite, escritura productiva o despliegue.
- Commit de implementación: `4b973003fa760c63135fd780067c02a20feb26c6`.

## Promoción administrativa solicitada, fuera de este incremento

El propietario autorizó promover `vgmiltonisaac@gmail.com` a admin conservando `isTeacher=true`. La investigación está pendiente de mecanismo autorizado disponible; no hay un endpoint público para autoasignar admin y no se usó escritura SQL/manual ni el bootstrap docente local. No cambiar rol ni tocar producción como parte de F18.B.3.
