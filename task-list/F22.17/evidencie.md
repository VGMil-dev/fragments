# Evidencia F22.17 — Promoción admin de cuenta docente existente

## Estado

Implementación en rama `codex/f22-admin-provisioning`; no hay PR, release ni mutación productiva todavía.

- Commit de implementación verificada: `d16b308` (`feat(f22): habilita bootstrap admin acotado`).

## Archivos

- `apps/api/src/auth/provision-better-auth-admin.ts`: regla condicional de promoción de una sola identidad existente.
- `apps/api/src/auth/provision-better-auth-admin-cli.ts`: comando manual que aplica la promoción y solicita el recovery por Better Auth/Resend.
- `apps/api/src/auth/resend-password-reset.ts`: reconoce aceptación HTTP 2xx y extrae únicamente un posible ID del mensaje.
- `deploy/production/docker-compose.yml`: servicio manual aislado del arranque normal.
- `deploy/production/README.md`: procedimiento operacional sin credenciales.

## Verificación pendiente

- `pnpm install --frozen-lockfile` — PASS; lockfile sin cambios.
- `pnpm --filter @fragments/contracts build` — PASS (preparación requerida por el worktree limpio).
- `pnpm --filter @fragments/api exec vitest run src/auth/provision-better-auth-admin.test.ts src/auth/resend-password-reset.test.ts --maxWorkers=1` — PASS, 6/6.
- `pnpm --filter @fragments/api test` — PASS, 51 archivos / 196 pruebas; 19 archivos / 74 pruebas omitidas porque no se configuró base de datos en este checkout.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api build` — PASS.
- Parseo local del YAML de Compose con `yaml` — PASS; servicio `bootstrap-admin` bajo perfil explícito. `docker compose config -q` quedó sin ejecutar correctamente porque falta el env_file requerido `.env.test-migrate`; no se creó archivo de entorno para la validación.
- `git diff --check` — PASS.
- La integración Better Auth/PostgreSQL del flujo reset está escrita, pero no corrió localmente por ausencia de `DATABASE_URL`; queda pendiente su salida CI con PostgreSQL efímero.
- Seguridad pendiente de revisión independiente y checks CI antes de integrar.
- PR normal, checks y F14 según tag anotada.
- En producción, confirmar solo la cuenta autorizada, preservar `isTeacher`, aceptación Resend, flujo reset y dashboard con Ego Lite.
- Si cualquier precondición falla: detener la mutación, informar el resultado parcial y no afirmar cuenta admin/recovery completo.

## Límites

No se han abierto `.env`, `.env.bootstrap`, ni variables/credenciales. No se ha conectado a la base productiva ni se envió correo.
