# Evidencia F22.1

## Estado

Módulo e integración principal implementados en `codex/f22-readonly-diagnostics`; pruebas focalizadas y typechecks pasan. Pendientes PR/CI y QA visual Ego Lite con rol admin disponible.

## Cambios y commit

- Commit del módulo: `f692eac015df3bb2da02e84d470e5b010cac0dd8` (`feat(f22.1): agrega diagnosticos admin redactados`).
- API: eventos HTTP con request ID generado por servidor, métodos y familias de ruta allowlist, UTC, status y duración; buffer en memoria de 100 registros y JSON estructurado a stdout. No almacena rutas completas, query, headers, cookies, IP, body, identidad, stack ni contenido IA.
- Handler aislado: `GET /api/admin/diagnostics/requests?limit=` requiere callback admin inyectado; anónimo 401 y teacher/otro rol 403, sin eventos en la respuesta denegada; máximo 50 resultados.
- Web: API cliente valida campos permitidos y presenta fecha UTC, método, familia, status, duración y request ID; estados carga/vacío/error y botón Actualizar.
- Sólo se modificaron `apps/api/src/features/admin-diagnostics/*` y `apps/web/src/features/admin-diagnostics/*` en el commit funcional.
- El integrador añadió `adminCheck` en Better Auth que acepta exclusivamente `role=admin` (no `isTeacher`), `observe()` al inicio de cada petición, handler en `createHttpHandler` y ruta web `/admin/diagnostics`. Se probó integrada con auth/DB fake etiquetados; no es una verificación de sesión real.
- Commit UX/a11y `10032a8`: retención en memoria explícita, nombres de área en español, `<time>`, región enfocada/desplazable, columna HTTP, anuncio de carga y reintento.
- Commit de integración `7e58cdc07c598da85a32c7d48956515bc2742203` (`feat(f22.1): integra diagnosticos admin`).

## Verificación local fresca

- `pnpm --filter @fragments/api exec vitest run src/http/admin-diagnostics.test.ts src/features/admin-diagnostics --maxWorkers=1` — PASS; 3 archivos, 7 pruebas, incluyendo integración de ruta, captura del status real, request ID, saneamiento y rechazo de profesor/anónimo.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-diagnostics --maxWorkers=1` — PASS; 2 archivos, 4 pruebas.
- `pnpm --filter @fragments/contracts build` — PASS; necesario para preparar workspace local.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; solo genera cliente local, sin abrir conexión a base.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS.

## Integración y límites pendientes

- No se hizo QA visual Ego Lite ni prueba autenticada con una sesión real de administrador; esas validaciones quedan NO COMPROBADAS.
- No hay persistencia tras reiniciar API; stdout y buffer en memoria son los límites deliberados de esta fase.
- No se accedió a `fragments_test`, `fragments_prod`, VPS, proveedores IA o despliegue. La UI usa la sesión same-origin de Better Auth y el server impone rol; la comprobación real de acceso sigue pendiente.
