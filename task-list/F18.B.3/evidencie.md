# Evidencia F18.B.3

Estado: IMPLEMENTACIÓN INTEGRADA Y v0.5.68 DESPLEGADA; pruebas autenticadas post-release y continuidad de entregas pendientes.

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
- `pnpm exec turbo run test typecheck lint build --force` — 11/11 tareas PASS; web 54 archivos/301 pruebas PASS, API 50 archivos/191 pruebas PASS y 19 archivos/73 pruebas omitidas por requerir PostgreSQL/config local, contratos 31/31 PASS; typecheck, lint y builds PASS. El bundle advierte un chunk >500 kB y directivas `use client` de Lucide.
- Pruebas focales tras la negociación de capacidad y ajuste del mensaje estudiante: web 26/26 PASS; API 3 PASS y 8 omitidas por requerir base local.
- `git diff --check` — PASS; Git notificó normalización CRLF→LF en dos archivos, sin errores de whitespace.
- `pnpm --filter @fragments/api exec vitest run src/features/assignments/academic-flow.integration.test.ts` — cuatro pruebas omitidas porque `DATABASE_URL` no está configurada en este proceso. Se encontró un contenedor PostgreSQL de prueba preexistente en `127.0.0.1:55447`, pero no se adivinaron roles/credenciales ni se modificó. La integración queda **NO COMPROBADA localmente**, pendiente de CI con base efímera y preflight `current_database() = fragments_test`.
- PR [#261](https://github.com/VGMil-dev/fragments/pull/261). Implementación `4b973003fa760c63135fd780067c02a20feb26c6`, documentación inicial `b62cabb34743339dd9262227d4d316ca54e93a95`. CI `45443102711` **SUCCESS**; los logs muestran `academic-flow.integration.test.ts` 4/4 PASS con PostgreSQL efímero de CI y la suite API 69 archivos PASS. El resultado PostgreSQL sí está comprobado en CI aislada aunque la ejecución local se omitió.

## Cambios locales

- Contratos Zod de rúbrica propia (1–10 criterios; pesos suman 100), entregas ordenadas (2–12 al publicar) y referencias a criterios existentes. Los snapshots históricos sin campos nuevos reciben lista vacía sin migración.
- Persistencia de borrador y snapshot inmutable en `draftJson`/`snapshotJson`; al publicar, las versiones anteriores permanecen sin cambios.
- Mentor toma la rúbrica del snapshot enlazado; usa F11 global para snapshots históricos sin rúbrica propia.
- Classroom Studio edita y previsualiza rúbrica/entregas y bloquea publicar un borrador incompleto. Mis aulas muestra la configuración publicada del estudiante.
- No se conecta cada entrega con un Review/commit, no se registra historial de entregas, ni se calcula progreso/notas. No se ejecutó IA real, Ego Lite, escritura productiva o despliegue.
- Commit de implementación: `4b973003fa760c63135fd780067c02a20feb26c6`.
- CI integrado del PR #261: PASS; integración PostgreSQL efímera 4/4 PASS.
- Revisión independiente encontró que la vista previa docente omitía los criterios por entrega; corregida en `c390c0c`, focal web actualizada a 10/10 PASS.
- Compatibilidad con despliegue mixto: la API expone `GET /api/mission-plan-capability`; los clientes nuevos negocian `x-fragments-mission-plan: 1` y los DTO incorporan `missionPlanVersion: 1`. La API omite campos nuevos a clientes viejos y conserva su publish F11 legacy. El frontend nuevo consulta capacidad; ante API vieja conserva lectura de misiones existentes pero bloquea autoría/publicación hasta actualizar, sin bloquear el inicio de propuestas estudiantiles.
- El CI `45446577770` completó SUCCESS para el commit previo `27aba84`; la integración final del PR y la release se registran en la sección posterior.
- Commit de negociación de compatibilidad: `9ca05deb14d7c35abae4911d6ba7f8b8bece0a0b`. Revisión reflexiva independiente confirma resuelto el aviso de API antigua en estudiante, sin otros hallazgos en este cambio.
- CI del commit `9ca05de`: ejecución `45448796884` **SUCCESS**; 11/11 tareas, web 54 archivos/301 pruebas, API 69 archivos/264 pruebas e integración `academic-flow.integration.test.ts` 4/4 con PostgreSQL efímero, contratos 31/31.

## Integración y release F14 · 2026-11-24

- PR #261 se integró mediante merge normal `608143fb13865a31373f139e5a248ac88292f4f9`. El commit documental `f1419dac8046c4e6c7214df2f08a01b958149d9e` pasó CI `45449333665` SUCCESS.
- Tag anotada `v0.5.68` sobre el SHA exacto de main. F14 run `45449889989` completó `verify-build`, atestación Sigstore y `publish-approved-release` en SUCCESS. No se modificaron migraciones ni controles de F14.
- Verificación pública read-only: `/health` devolvió `ok/ready`; el bundle `/assets/index-UZZrt3PK.js` contiene `v0.5.68` y el SHA exacto `608143fb13865a31373f139e5a248ac88292f4f9`.
- Ego Lite docente, espacio 44: p1 cargó la versión y SHA exactos tras recarga; la sesión estaba desconectada y mostró el formulario de acceso. No se introdujeron credenciales. Se conservaron p1 y p2; p2 ya estaba sin responder y no se cerró.
- Ego Lite estudiante, espacio 60: el runtime informó que la tarea había terminado y prohíbe reclamarla/reanudarla sin petición explícita del propietario. No se intentó otra vez. La UI autenticada post-release queda **NO COMPROBADA**.
- Receptor/historial de entregas y vínculo individual entrega→Review/commit aún no están implementados en este incremento. Calidad semántica Mentor/Review real sigue **NO COMPROBADA**; no hubo evaluación IA ni escritura académica productiva.
- La cuenta de correo autorizada para promoción a admin sigue bloqueada por falta de mecanismo administrativo autorizado disponible; fuera del alcance de este incremento. No se usó SQL ni se cambió la identidad.

## Promoción administrativa solicitada, fuera de este incremento

El propietario autorizó promover `vgmiltonisaac@gmail.com` a admin conservando `isTeacher=true`. La investigación está pendiente de mecanismo autorizado disponible; no hay un endpoint público para autoasignar admin y no se usó escritura SQL/manual ni el bootstrap docente local. No cambiar rol ni tocar producción como parte de F18.B.3.
