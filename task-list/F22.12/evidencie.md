# Evidencia F22.12 — Eventos operativos Mentor

## Implementación

- Worker integrado: `codex/f22-mentor-real-events` SHA `e5463e2157f2580677675b45d6e5e7cbb3aac2dd`; merge local en `283aec0`. Commit del slice F22.12: `7c9478db5abc887a577cc91a8722727ea3721c7f`.
- F22 worker registra en el límite HTTP eventos allowlisted de evaluación Mentor finalizada o fallida. La proyección conserva etapa y código genérico; excluye identidades, propuestas, prompts, notas, puntuaciones y proveedor/modelo.
- F22.12 añade buffer en memoria (máximo 100), `GET /api/admin/mentor-events?limit=50` (máximo 50) y `/admin/mentor-events` con carga, vacío, error/403 y reintento.
- La consulta requiere Better Auth admin, registra `admin.mentor_events.read` antes de leer, y falla cerrada si auth/auditoría no están disponibles. La ruta envía `no-store` y `nosniff`.
- Sin contratos compartidos, migraciones, escrituras académicas ni llamadas a proveedores reales.

## Verificación local

Fecha: 2026-11-23.

- API focal: `pnpm --filter @fragments/api exec vitest run src/features/mentor/operational-events.test.ts src/features/mentor/operational-log.test.ts src/features/admin-mentor-events/http.test.ts --maxWorkers=1` — 3 archivos, 11/11 PASS.
- Web focal: `pnpm --filter @fragments/web exec vitest run src/features/admin-mentor-events --maxWorkers=1` — 2 archivos, 5/5 PASS.
- Suite API: 44 archivos PASS, 17 omitidos; 160 tests PASS, 69 omitidos.
- Suite web: 47 archivos PASS; 196 tests PASS.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `git diff --check` — PASS.
- Builds API y web — PASS. Vite emitió advertencias preexistentes del bundle >500 kB y directivas `use client` de lucide-react.
- Cobertura incluye 401/403, rechazo de límites, auditoría previa a lectura, fallo cerrado, buffer y códigos redactados, validación estricta de respuesta y estados básicos de UI.
- Revisión independiente del HEAD de integración `283aec0` — PASS.
- PR #148: CI `45099356226` SUCCESS; revisión independiente PASS; merge normal a `main` `6a7740d948b3a07c63396097e9400494cdfba0fb`. Commit de integración `283aec0`; commit F22.12 `7c9478db5abc887a577cc91a8722727ea3721c7f`.
- Skill aplicada: `vercel-react-best-practices`; se usaron estados localizados, efecto cancelable al desmontar y actualización funcional. No había skills locales `backend-architecture`, `test-driven-development` ni `verification-before-completion`; se siguieron las pruebas focales red→verde, revisión estática y verificación de salidas.

## Release y despliegue

- Tag anotada `v0.5.27` apunta al SHA exacto `6a7740d948b3a07c63396097e9400494cdfba0fb`.
- F14 run `45099728508`: `verify-build`, PostgreSQL disposable, backup/restore, pruebas, typecheck/lint/build, metadata, ARM64, atestación Sigstore y `publish-approved-release` SUCCESS.
- Poller automático ejecutado 02:28:08 UTC; `fragments-release-apply.service` terminó 02:30:10 UTC con `Result=success`, `ExecMainStatus=0`. No se lanzó deploy manual ni se reinició el servicio desde el coordinador.
- SSH de solo lectura: `fragments-api-1` y `fragments-web-1` `running/healthy` en `fragments-*:sha-6a7740d948b3a07c63396097e9400494cdfba0fb`.
- Verificación pública cache-bypass: `/health` `status=ok`, `database=ready`; bundle `/assets/index-32veZvDP.js` HTTP 200 contiene `v0.5.27`, SHA exacto y `/admin/mentor-events`.
- No se generó una evaluación real de Mentor. Existencia/retención de eventos productivos y acceso con una sesión admin quedan **NO COMPROBADOS**.
- Ego Lite: **NO COMPROBADO**. El verificador conservó las pestañas, encontró sesiones de perfil Milton, docente y estudiante, sin sesión admin disponible; no abrió la ruta, no consultó el endpoint y no accedió a producción.
- El buffer se pierde al reiniciar el proceso de API; no sustituye almacenamiento duradero ni logs externos.

## Recorrido compuesto local · 2026-11-23

- La cobertura anterior probaba por separado la emisión de eventos Mentor y la lectura del endpoint admin. Se agregó una prueba compuesta que ejecuta `createMentorHttp` con `createLocalMentorEvaluator`, registra el evento en `createMentorOperationalLog` y consulta el buffer mediante `createAdminMentorEventsHttp`.
- El escenario confirma respuesta de evaluación 200, un evento `mentor_evaluation_completed` redactado en la respuesta admin, y orden de auditoría `admin.mentor_events.read` antes de la lectura del buffer. La salida no contiene IDs de estudiante/propuesta, puntuación, prompt ni proveedor.
- Esta primera prueba local sintética representa el verificador admin y actor con fixtures; no usa Better Auth ni PostgreSQL. Eventos reales y sesión admin en producción permanecen **NO COMPROBADOS**.
- `pnpm --filter @fragments/api exec vitest run src/features/mentor/operational-events.test.ts src/features/mentor/operational-log.test.ts src/features/admin-mentor-events/http.test.ts --maxWorkers=1` — PASS, 3 archivos, 12/12 pruebas.
- `pnpm --filter @fragments/contracts build` — PASS; se regeneraron tipos de trabajo ignorados desde el source actual. `pnpm --filter @fragments/api typecheck` — PASS. La primera ejecución previa al build detectó `dist` de contratos desactualizado; no hubo cambios a los contratos fuente.
- `git diff --check` — PASS. No se usó PostgreSQL, Better Auth productivo, Gateway, ni se efectuaron escrituras de datos académicos. La respuesta administrativa usa un verificador/actor fake; la sesión admin real sigue NO COMPROBADA.

## Integración con sesión Better Auth sintética · 2026-11-23

- Se agregó `better-auth.integration.test.ts`. En una base efímera local `fragments_test` (contenedor sin volumen, enlazado solo a `127.0.0.1`) se aplicaron las cinco migraciones versionadas y `prisma migrate status` confirmó el esquema actualizado.
- La prueba crea un solo usuario admin QA con Better Auth `signUpEmail`, actualiza el rol del fixture, obtiene una sesión mediante `signInEmail` y sirve el endpoint a través de `createHttpHandler` con la instancia real de Better Auth/Prisma. Inserta un evento Mentor sintético en el buffer.
- Resultado por HTTP: 401 sin cookie; 403 con la sesión mientras el mismo usuario no tiene rol admin; 200 después de restaurar el rol. La respuesta contiene únicamente el evento redactado y el audit sink recibe `admin.mentor_events.read` con el actor fixture. No se creó otro usuario, aula, propuesta o dato académico. `afterAll` elimina por ID propio la identidad QA y sus relaciones en cascada; el contenedor efímero se eliminó al detenerlo.
- `pnpm --filter @fragments/api exec vitest run src/features/admin-mentor-events/better-auth.integration.test.ts src/features/admin-mentor-events/http.test.ts src/features/mentor/operational-events.test.ts src/features/mentor/operational-log.test.ts --maxWorkers=1` — PASS, 4 archivos, 13/13 pruebas.
- `pnpm --filter @fragments/contracts build` — PASS; `pnpm --filter @fragments/api typecheck` — PASS; `git diff --check` — PASS.
- Better Auth real significa que el adapter, sesión/cookie, lectura de rol y endpoint corrieron localmente con Prisma/PostgreSQL; el proveedor Mentor, el evento, el admin y sus credenciales son sintéticos. AI Gateway, producción, cuentas reales, eventos productivos y sesión admin productiva siguen **NO COMPROBADOS**.
- Implementación `1a31b1dad298e2266af759cc5aaa0a7154e19d38`; PR #156 se integró normalmente en `main` como `3fa16a150de410df7637385d92944cc44954cca2`, CI run `45117312137` SUCCESS. Es solo cobertura de prueba: no generó release F14.

## Integración normal de la prueba compuesta · 2026-11-23

- PR #153 se integró mediante merge normal en `0f12e7fc1e6ff6fdf1663a85e30787667c28f9b9`; CI run `45112711742` SUCCESS. La prueba conecta evaluación Mentor fake → buffer operativo → endpoint admin auditado.
- Revalidación focal: 3 archivos API, 12/12 pruebas PASS; API typecheck y `git diff --check` PASS. No hubo cambio runtime ni release por este PR de prueba.
- Better Auth real, sesión administrativa y eventos de evaluaciones productivas siguen NO COMPROBADOS; no se usó Gateway ni hubo escrituras académicas.
- Commit de implementación y prueba: `4ab1bd4185d8f8f139a64b081bd75e6535a17f88` en `codex/f22-admin-events-e2e`; aún sin PR ni release.
## Reejecución independiente y merge PR #156 · 2026-11-23

- Coordinador volvió a crear PostgreSQL 16 local efímero sin volumen, ligado a `127.0.0.1`, con `current_database=fragments_test`; aplicó las cinco migraciones versionadas. La suite corrió con `DATABASE_URL` apuntando a esa instancia, no se omitió el test de integración.
- Salida fresca: los cuatro archivos focales completados y **13/13 PASS**; API typecheck, build de contratos y `git diff --check` PASS. El fixture usuario se limpió por ID y el contenedor se retiró en `finally`.
- PR #156 merge normal `3fa16a150de410df7637385d92944cc44954cca2`; CI `45117312137` SUCCESS. Sin cambio de runtime, release, producción ni AI Gateway. La sesión es sintética Better Auth local; acceso admin productivo, existencia de eventos productivos y calidad IA siguen NO COMPROBADOS.
