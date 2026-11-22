# Evidencia F22.5 — Directorio administrativo docente

## Implementación local

- Base local `origin/main`: `ea2de7067d1710170a89df27b095a79e002fe9a9`.
- Rama: `codex/f22-admin-teachers` en worktree separado `C:\Users\vgmil\.codex\worktrees\f22-admin-teachers\Fragments`. El worktree F22.4 `fragments-f22-observability` y su rama se conservaron sin cambios.
- Commit de código y evidencia inicial: `d3d33156b69815e442940e68051b1a74b508d0ca`.
- Corrección de revisión P2: commit `bdd75e291e203c5d2c85bea12e489b8d5deee5af`.
- API feature-local: repository keyset, cursor/query estrictos, servicio de DTO mínimo y handler con autorización admin y audit callback fail-closed-before-read. El filtro excluye el token `admin` del CSV al inicio, medio o final, igual que `role.split(",").includes("admin")` de Better Auth.
- UI feature-local: cliente de solo lectura y panel paginado con estados accesibles; tras error en página posterior, reintenta el mismo cursor y mantiene el control para volver a la anterior. No se añadió ruta/navigation compartida.
- Integración requerida del arquitecto: registrar handler en ruta HTTP; agregar `admin.teachers.list` al allowlist/sink F22.4; conectar panel a route/navigation web. Sin cambios de contratos, schema, migraciones o TASKS.
- No se contactaron producción, base de datos, GitHub, IA, OAuth ni secretos. Fakes de auth/store/Prisma/fetch llevan nombres `fixture` o `fake`.

## Verificación

- En la primera pasada del worktree limpio falló el typecheck por dependencias workspace/generated Prisma ausentes; se resolvió con build local de contracts y `prisma generate` (sin base de datos ni migración).
- `pnpm --filter @fragments/api exec vitest run src/features/admin-teachers --maxWorkers=1` — PASS, 3 archivos / 8 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-teachers --maxWorkers=1` — PASS, 2 archivos / 6 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/contracts build` — PASS para preparar el worktree limpio.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; generó el cliente local desde el schema existente, sin migrar ni conectar a base de datos.
- `git diff --check` — PASS.

## Regresiones P2

- Antes del arreglo, las pruebas fallaron reproduciendo el rol compuesto `admin,teacher` en el filtro y la ausencia de `Anterior` tras fallar la segunda página.
- Tras el arreglo, el test del repository verifica las cuatro posiciones del token `admin` en el filtro Prisma; el test UI verifica que fallo→reintento usa el mismo cursor y conserva la vuelta a la página inicial.
- Verificación fresca final: API 8/8, web 6/6, typecheck API/web y `git diff --check` PASS.

## Limitaciones

- El handler feature-local y el panel no están montados en la aplicación compartida; por eso el recorrido admin completo no se ha validado.
- Better Auth real, PostgreSQL real, existencia de cuentas docentes, ruta/navegación, y logs de auditoría productivos: **NO COMPROBADOS**.
- No hay cursor de página anterior en el API; la UI conserva cursores vistos en memoria y solicita la página anterior de nuevo.
