# Evidencia F22.1

## Estado

Módulo implementado y probado localmente; pendiente de integración por el arquitecto, PR, CI y QA visual/Ego Lite. Rama `codex/f22-readonly-diagnostics`, basada en `origin/main` commit `c25f97a60934b294fa30b3b4d3fcccea4f51007e`.

## Cambios y commit

- Commit del módulo: `f692eac015df3bb2da02e84d470e5b010cac0dd8` (`feat(f22.1): agrega diagnosticos admin redactados`).
- API: eventos HTTP con request ID generado por servidor, métodos y familias de ruta allowlist, UTC, status y duración; buffer en memoria de 100 registros y JSON estructurado a stdout. No almacena rutas completas, query, headers, cookies, IP, body, identidad, stack ni contenido IA.
- Handler aislado: `GET /api/admin/diagnostics/requests?limit=` requiere callback admin inyectado; anónimo 401 y teacher/otro rol 403, sin eventos en la respuesta denegada; máximo 50 resultados.
- Web: API cliente valida campos permitidos y presenta fecha UTC, método, familia, status, duración y request ID; estados carga/vacío/error y botón Actualizar.
- Sólo se modificaron `apps/api/src/features/admin-diagnostics/*` y `apps/web/src/features/admin-diagnostics/*` en el commit funcional.

## Verificación local fresca

- `pnpm --filter @fragments/api exec vitest run src/features/admin-diagnostics --maxWorkers=1` — PASS; 2 archivos, 6 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-diagnostics --maxWorkers=1` — PASS; 2 archivos, 4 pruebas.
- `pnpm --filter @fragments/contracts build` — PASS; necesario para preparar workspace local.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; solo genera cliente local, sin abrir conexión a base.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --cached --check` — PASS antes del commit.

## Integración y límites pendientes

- El handler aún no está registrado en `apps/api/src/http/app.ts`; el integrador central debe crear el almacén en memoria y llamar `observe(request, response)` al inicio de cada solicitud para capturar requestId/status reales.
- Better Auth aún no expone una comprobación estricta de rol `admin`; el integrador debe agregar `adminId` separado de `teacherId` y conectarlo a `isAdmin`.
- `AdminDiagnosticsScreen` aún no está montada en una ruta de la app; el root integrator añadirá `/admin/diagnostics` y su acceso.
- No hay persistencia tras reiniciar API; stdout y buffer en memoria son los límites deliberados de esta fase.
- No se accedió a `fragments_test`, `fragments_prod`, VPS, proveedores AI ni GitHub remoto desde la feature. No se desplegó.
- Aún sin Ego Lite ni verificación con sesiones docente/admin/estudiante; no declarar el recorrido funcional integrado hasta completar ese QA.
