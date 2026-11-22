# Evidencia F22.5 — Directorio administrativo docente

## Implementación local

- Worktree del agente basado en `ea2de70`; integración arquitectónica local basada en `origin/main` `c1e5a7d0d0ff75283a26ea7e173d92b39fa1433c`.
- Rama: `codex/f22-admin-teachers` en worktree separado `C:\Users\vgmil\.codex\worktrees\f22-admin-teachers\Fragments`. El worktree F22.4 `fragments-f22-observability` y su rama se conservaron sin cambios.
- Commit de código y evidencia inicial: `d3d33156b69815e442940e68051b1a74b508d0ca`.
- Corrección de revisión P2: commit `bdd75e291e203c5d2c85bea12e489b8d5deee5af`.
- Integración compartida del arquitecto: commit local `4fcc01a3f16492edc6aa21c0b2e3eaf597940e90` en `codex/f22-admin-teachers-integration`.
- API feature-local: repository keyset, cursor/query estrictos, servicio de DTO mínimo y handler con autorización admin y audit callback fail-closed-before-read. El filtro excluye el token `admin` del CSV al inicio, medio o final, igual que `role.split(",").includes("admin")` de Better Auth.
- UI: ruta `/admin/teachers`, navegación del espacio admin, cliente GET paginado y panel de solo lectura con estados accesibles; tras error en página posterior, Reintentar conserva cursor y Anterior sigue disponible.
- El arquitecto conectó el handler a Better Auth admin, `createAdminAuditLog` y el sink existente; `admin.teachers.list` se audita antes de la consulta de cuentas y la familia queda clasificada como `admin.teachers`.
- Sin cambios de contratos, schema, migraciones, permisos de infraestructura o datos productivos.
- No se contactaron producción, base de datos, GitHub, IA, OAuth ni secretos. Fakes de auth/store/Prisma/fetch llevan nombres `fixture` o `fake`.

## Verificación

- En la primera pasada del worktree limpio falló el typecheck por dependencias workspace/generated Prisma ausentes; se resolvió con build local de contracts y `prisma generate` (sin base de datos ni migración).
- `pnpm --filter @fragments/api exec vitest run src/features/admin-teachers --maxWorkers=1` — PASS, 3 archivos / 8 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-teachers --maxWorkers=1` — PASS, 2 archivos / 6 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/contracts build` — PASS para preparar el worktree limpio.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; generó el cliente local desde el schema existente, sin migrar ni conectar a base de datos.
- Verificación de integración fresca `pnpm exec turbo run test typecheck lint build --force` — 11/11 tareas PASS. API 135 PASS / 68 omitidas por ausencia de base configurada; Web 167/167 PASS; contracts 29/29 PASS; typecheck, lint y builds PASS.
- API focal de integración/directorio/diagnósticos: 14/14 PASS. Web focal de ruta, panel, API y registro admin: 9/9 PASS.
- `git diff --check HEAD^ HEAD` — PASS para el commit arquitectónico; `git diff --check` PASS en la rama del agente.

## Regresiones P2

- Antes del arreglo, las pruebas fallaron reproduciendo el rol compuesto `admin,teacher` en el filtro y la ausencia de `Anterior` tras fallar la segunda página.
- Tras el arreglo, el test del repository verifica las cuatro posiciones del token `admin` en el filtro Prisma; el test UI verifica que fallo→reintento usa el mismo cursor y conserva la vuelta a la página inicial.
- Verificación fresca final: API 8/8, web 6/6, typecheck API/web y `git diff --check` PASS.

## Limitaciones

- Better Auth real, PostgreSQL real, existencia/conteo de cuentas docentes, sesión admin y lectura productiva del directorio/logs: **NO COMPROBADOS**. CI/local usa fixtures/fakes; la ruta integrada aún requiere PR/CI/release.
- No hay cursor de página anterior en el API; la UI conserva cursores vistos en memoria y solicita la página anterior de nuevo.
