# Evidencia F22.2 — Solicitudes académicas en consola admin

## Estado

Implementación feature-local y pruebas completadas en `codex/f22-admin-requests`, creada limpia desde `origin/main` (`a3c189f041694ccf898f208de41a51c36ad41a04`). El PR #93 estaba cerrado/mergeado en `b7ffa4cfb18eb99481386ff936f9e3d288a781e8`; su rama `codex/f22-readonly-diagnostics` se conservó intacta.

El módulo aún no está conectado a rutas compartidas ni validado contra una base de datos o sesión admin reales. Requiere integración del arquitecto y posterior smoke de la ruta integrada. No hubo producción, secretos, Ego Lite ni escrituras de base.

## Implementación

- API feature-local `GET /api/admin/classroom-requests?limit=&offset=&status=`; usa `ClassEnrollment` y campos relacionados existentes, sin migraciones ni writes.
- Autorización inyectada `isAdmin(request)`: 401 anónimo, 403 rol no admin, sin consulta ni datos en respuestas denegadas.
- Paginación acotada a 50, offset máximo 100000, filtro enum cerrado, orden por fecha descendente y desempate por ID.
- DTO solo incluye ID de matrícula como clave interna, título/área/período de aula, estado, origen y fechas. No selecciona estudiante, correo, contexto privado, autor de decisión ni credenciales.
- Web feature-local con cliente same-origin que valida estado, filtro, límites y campos permitidos; pantalla accesible con estados de carga/vacío/error, filtro, actualización y paginación. No hay acciones para cambiar matrículas.
- Pruebas con fake store/responses y fake Prisma delegate; no usan fixtures inventadas en la pantalla de producción ni llaman servicios externos.

## Integración requerida del arquitecto

1. En `apps/api/src/http/app.ts`, crear `createAdminClassroomRequestsRepository(database)` y conectar `createAdminClassroomRequestsHttp(store, isAdmin)` con `options.auth?.adminCheck(request)`, antes del 404 compartido.
2. En `apps/web/src/App.tsx`, importar `AdminRequestsScreen` y `adminRequestsApi`, y asignar la ruta protegida `/admin/requests` siguiendo el patrón admin existente.
3. Agregar el enlace de navegación desde el shell/admin correspondiente; confirmar que `adminCheck` permanece exclusivamente basado en rol Better Auth `admin`.
4. Verificar endpoint y pantalla integrados con fake auth/data en test; solo después solicitar validación visual admin autorizada.

## Verificación local

- `pnpm --filter @fragments/contracts build` — PASS; prerequisito local.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; cliente generado localmente desde schema existente, sin conexión a base.
- `pnpm --filter @fragments/api exec vitest run src/features/admin-requests --maxWorkers=1` — PASS, 2 archivos, 3 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-requests --maxWorkers=1` — PASS, 2 archivos, 4 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS (`GIT_DIFF_CHECK_PASS`).

## Limitaciones

- No se verificó el contenido actual de `fragments_prod` ni `fragments_test`; el comportamiento con filas persistidas depende de integrar la ruta con el Prisma client existente.
- El DTO omite identidad del estudiante, por lo que esta vista permite inspeccionar estados agregados por aula y fechas, pero no identificar a quién corresponde una solicitud. Cualquier acción para aprobar/rechazar queda fuera de F22.2.
- Aún no se ha integrado ni abierto PR para este incremento; SHA de commit y salida final se añadirán tras revisar estado, commit local, push y PR.
