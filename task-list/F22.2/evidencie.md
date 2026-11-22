# Evidencia F22.2 — Solicitudes académicas en consola admin

## Estado

Implementación feature-local y pruebas completadas en `codex/f22-admin-requests`, creada limpia desde `origin/main` (`a3c189f041694ccf898f208de41a51c36ad41a04`). El PR #93 estaba cerrado/mergeado en `b7ffa4cfb18eb99481386ff936f9e3d288a781e8`; su rama `codex/f22-readonly-diagnostics` se conservó intacta. Commit de implementación: `b4cb44acfa9026d780eebe938eaaf61dfaf327e4`. Después se integraron los dos commits documentales que avanzaron `origin/main`, merge local `15b53e8573819129294c9c45638a3e5c658a4907`.

PR #98 está abierto contra `main`: https://github.com/VGMil-dev/fragments/pull/98. El módulo aún no está conectado a rutas compartidas ni validado contra una base de datos o sesión admin reales. Requiere integración del arquitecto y posterior smoke de la ruta integrada. No hubo producción, secretos, Ego Lite ni escrituras de base.

## Implementación

- API feature-local `GET /api/admin/classroom-requests?limit=&offset=&status=`; usa `ClassEnrollment` y campos relacionados existentes, sin migraciones ni writes.
- Autorización inyectada `isAdmin(request)`: 401 anónimo, 403 rol no admin, sin consulta ni datos en respuestas denegadas.
- Cada lectura admin exitosa requiere `getActorId` y `write` inyectados. El callback recibe `{requestId,event,occurredAt,adminActorId}`; reusa el `x-request-id` del response si fue generado por middleware servidor, con UUID server-side como fallback. No agrega identidad al DTO/response. Si no hay actor o falla la escritura, responde 503 sin entregar registros.
- Límite del sink: esta feature solo emite evento al callback; la integración esperada escribe stdout JSON. Retención y rotación dependen del runtime de logs, no se garantizan ni se verificaron. No hay persistencia DB.
- Respuesta al hallazgo independiente P2: commit de código `c7d0d45`; la auditoría se escribe antes de liberar el resultado y falla cerrada si no hay actor/sink.
- Paginación acotada a 50, offset máximo 100000, filtro enum cerrado, orden por fecha descendente y desempate por ID.
- DTO solo incluye ID de matrícula como clave interna, título/área/período de aula, estado, origen y fechas. No selecciona estudiante, correo, contexto privado, autor de decisión ni credenciales.
- Web feature-local con cliente same-origin que valida estado, filtro, límites y campos permitidos; pantalla accesible con estados de carga/vacío/error, filtro, actualización y paginación. No hay acciones para cambiar matrículas.
- Pruebas con fake store/responses y fake Prisma delegate; no usan fixtures inventadas en la pantalla de producción ni llaman servicios externos.

## Integración requerida del arquitecto

1. En `apps/api/src/http/app.ts`, crear `createAdminClassroomRequestsRepository(database)` y conectar `createAdminClassroomRequestsHttp(store, isAdmin, audit)` con `options.auth?.adminCheck(request)`, `options.auth.userId(request)` para el actor y un writer JSON estructurado stdout, antes del 404 compartido.
2. En `apps/web/src/App.tsx`, importar `AdminRequestsScreen` y `adminRequestsApi`, y asignar la ruta protegida `/admin/requests` siguiendo el patrón admin existente.
3. Agregar el enlace de navegación desde el shell/admin correspondiente; confirmar que `adminCheck` permanece exclusivamente basado en rol Better Auth `admin`.
4. Verificar endpoint y pantalla integrados con fake auth/data en test; solo después solicitar validación visual admin autorizada.

## Verificación local

- `pnpm --filter @fragments/contracts build` — PASS; prerequisito local.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; cliente generado localmente desde schema existente, sin conexión a base.
- `pnpm --filter @fragments/api exec vitest run src/features/admin-requests --maxWorkers=1` — PASS, 2 archivos, 4 pruebas; incluye evento atribuible, ausencia de identidad en respuesta y fail-closed si falla sink.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-requests --maxWorkers=1` — PASS, 2 archivos, 4 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS (`GIT_DIFF_CHECK_PASS`).

## Limitaciones

- No se verificó el contenido actual de `fragments_prod` ni `fragments_test`; el comportamiento con filas persistidas depende de integrar la ruta con el Prisma client existente.
- El DTO omite identidad del estudiante, por lo que esta vista permite inspeccionar estados agregados por aula y fechas, pero no identificar a quién corresponde una solicitud. Cualquier acción para aprobar/rechazar queda fuera de F22.2.
- PR #98 abierto y publicado por push normal. `task-list/TASKS.md` sigue siendo propiedad del planner y aún no tiene fila F22.2.

## Integración de rutas y auditoría — 2026-11-22

- PR #98 se integró mediante merge normal en `38ed9f3e7fe5637ce09efcb664a1db2e09c0fb65`; CI del head con audit trail `45041327156` SUCCESS. Revisión reflexiva independiente no encontró exposición en DTO ni bypass de auth; recomendó audit trail atribuible y quedó resuelta en el PR.
- El arquitecto instancia repository/handler en `apps/api/src/http/app.ts`: `adminCheck` autoriza y `userId` obtiene actor de la sesión Better Auth. Se escribe el evento `admin.classroom_requests.read` en stdout estructurado con actor admin, hora UTC y requestId generado por middleware F22.1. No se emite identidad estudiantil y ningún actor se devuelve en el DTO. Si falla actor o sink, el handler devuelve 503 sin filas.
- `apps/web/src/App.tsx` monta `/admin/requests`; navegación cruzada enlaza Diagnósticos y Solicitudes académicas. Diagnósticos clasifica la nueva ruta en familia `admin.requests` sin conservar query ni IDs.
- API integrado y clasificador: `pnpm --filter @fragments/api exec vitest run src/http/admin-requests.integration.test.ts src/features/admin-diagnostics/diagnostics.test.ts --maxWorkers=1` — PASS, 2 archivos / 5 pruebas. El test de integración usa DB y roles fake, confirma 401/403, consulta solo con rol admin, request ID/log auditado y respuesta sin actor/estudiante/contexto.
- Web: `pnpm --filter @fragments/web exec vitest run src/App.admin-requests.test.tsx src/features/admin-requests src/features/admin-diagnostics/AdminDiagnosticsScreen.test.tsx --maxWorkers=1` — PASS, 4 archivos / 7 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS; `pnpm --filter @fragments/web typecheck` — PASS; `git diff --check` — PASS.
- Integración del arquitecto aún en rama `codex/f22-admin-requests-integration`; falta publicar PR y CI. La base de datos real, sesión admin y retención/rotación de stdout siguen NO COMPROBADAS; no hubo producción ni Ego Lite.
