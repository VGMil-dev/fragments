# Evidencia F22.2 — Solicitudes académicas en consola admin

## Corrección de auditoría previa a lectura — 2026-11-22

- Revisión del handler ya integrado encontró que `store.list()` ocurría antes de resolver el actor y escribir `admin.classroom_requests.read`, aunque después fallara cerrada la respuesta. Ahora la auditoría del intento autorizado ocurre antes de consultar la base; si actor o sink fallan, el store no se invoca. Si la lectura falla, el intento ya quedó auditado.
- Regresiones añadidas comprueban orden `audit → read`, que un sink fallido no consulta el store y que los errores de lectura quedan precedidos por auditoría.
- Verificación local fresca: `pnpm --filter @fragments/api exec vitest run src/features/admin-requests/http.test.ts --maxWorkers=1` — PASS, 4/4; `pnpm --filter @fragments/api typecheck` — PASS; `git diff --check` — PASS.
- Sin producción, bases reales, sesiones ni cambios de permisos. Falta CI del PR de integración arquitectónica y el resto de F22.2 (sesión admin/retención stdout) sigue NO COMPROBADO.

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
- Integración del arquitecto se publicó en PR #99, rama `codex/f22-admin-requests-integration`, head inicial `f73e49b820daf86236c05c728b127f3f3152637c`; CI inicial se disparó. La base de datos real, sesión admin y retención/rotación de stdout siguen NO COMPROBADAS; no hubo producción ni Ego Lite.
- Revisión independiente detectó que stdout no esperaba el callback de escritura. Se corrigió en commit `c4ec322a471672b3ab25f5569b200f3ba74e2434`: el writer productivo resuelve tras callback exitoso y rechaza errores asíncronos; el handler falla cerrado con 503 sin datos cuando falla auditoría. API 5/5, web 7/7, typechecks API/web y `git diff --check` PASS. CI del head final `45042506959` SUCCESS; revisión reflexiva independiente PASS estático.

## Release v0.5.12 y límite de QA admin — 2026-11-22

- PR #99 integrado en `main` mediante merge normal `613c02f71129a1f0bb417a5e602ff631fc1de42c`; CI final `45042506959` SUCCESS. Release F14 `v0.5.12`, run `45042723696`: build/verificación, atestación y publicación SUCCESS.
- Producción pública sirve bundle con `v0.5.12` y SHA exacto; `/health` responde `status=ok`, `database=ready`.
- GET anónimo de `/api/admin/classroom-requests` respondió `401 AUTH_REQUIRED` y sin `items`; confirma que la API deniega acceso anónimo antes de entregar datos.
- Sin sesión admin real no se pudo comprobar la UI autenticada, filas persistidas, ni que el evento de auditoría quede retenido/rotado en el host. Estos puntos quedan **NO COMPROBADOS**; los tests usan fakes para roles/Prisma/sink. El shell de página sin sesión no muestra solicitudes, y ACL backend permanece obligatoria.
- Ledger/backup hash/labels de imágenes host siguen **NO COMPROBADOS** por falta de canal administrativo de solo lectura. No se intentó SSH, no se modificó la producción y no hubo escrituras a matrículas.
