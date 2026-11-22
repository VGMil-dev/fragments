# Evidencia F22.5 — Directorio administrativo docente

## Implementación local

- Base local `origin/main`: `ea2de7067d1710170a89df27b095a79e002fe9a9`.
- Rama: `codex/f22-admin-teachers` en worktree separado `C:\Users\vgmil\.codex\worktrees\f22-admin-teachers\Fragments`. El worktree F22.4 `fragments-f22-observability` y su rama se conservaron sin cambios.
- API feature-local: repository keyset, cursor/query estrictos, servicio de DTO mínimo y handler con autorización admin y audit callback fail-closed-before-read.
- UI feature-local: cliente de solo lectura y panel paginado con estados accesibles; no se añadió ruta/navigation compartida.
- Integración requerida del arquitecto: registrar handler en ruta HTTP; agregar `admin.teachers.list` al allowlist/sink F22.4; conectar panel a route/navigation web. Sin cambios de contratos, schema, migraciones o TASKS.
- No se contactaron producción, base de datos, GitHub, IA, OAuth ni secretos. Fakes de auth/store/Prisma/fetch llevan nombres `fixture` o `fake`.

## Verificación

- En la primera pasada del worktree limpio falló el typecheck por dependencias workspace/generated Prisma ausentes; se resolvió con build local de contracts y `prisma generate` (sin base de datos ni migración).
- `pnpm --filter @fragments/api exec vitest run src/features/admin-teachers --maxWorkers=1` — PASS, 3 archivos / 8 pruebas.
- `pnpm --filter @fragments/web exec vitest run src/features/admin-teachers --maxWorkers=1` — PASS, 2 archivos / 5 pruebas.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/web typecheck` — PASS.
- `pnpm --filter @fragments/contracts build` — PASS para preparar el worktree limpio.
- `pnpm --filter @fragments/api exec prisma generate` — PASS; generó el cliente local desde el schema existente, sin migrar ni conectar a base de datos.
- `git diff --check` — PASS.

## Limitaciones

- El handler feature-local y el panel no están montados en la aplicación compartida; por eso el recorrido admin completo no se ha validado.
- Better Auth real, PostgreSQL real, existencia de cuentas docentes, ruta/navegación, y logs de auditoría productivos: **NO COMPROBADOS**.
- No hay cursor de página anterior en el API; la UI conserva cursores vistos en memoria y solicita la página anterior de nuevo.
