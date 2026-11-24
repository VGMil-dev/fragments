# Evidencia F22.17 — Promoción admin de cuenta docente existente

## Estado

La implementación se integró en PR #267, y la corrección de conectividad en PR #268. F14 aplicó automáticamente `v0.5.71`; cuenta y correo ya están verificados. Quedan pendientes las acciones del propietario: establecer contraseña definitiva y después comprobar el login autenticado.

- Commit de implementación verificada: `d16b308` (`feat(f22): habilita bootstrap admin acotado`).
- CI inicial del PR #267 (`45468236357`) falló en la validación de perfiles Compose porque `${RESEND_API_KEY:?}` obligaba a configurar correo aun en QA. Se cambió a interpolación vacía opcional; el CLI valida Resend antes de escribir/promover y vuelve a comprobarlo antes de recuperación. El ajuste quedó cubierto por el CI final #487.
- CI #485 (`45468725123`) pasó todas sus etapas: Compose, Prisma PostgreSQL desechable, migraciones, 70 archivos de pruebas, typecheck/lint/build. Su integración de reset pasó, pero luego se revisó el fixture y se agregó `isTeacher=true` para que el caso de recuperación represente explícitamente una cuenta docente; este ajuste requiere el siguiente run.
- Commit del ajuste de fixture: `b2d676f026498f05af83f7375afc61278b6ae7a1`.
- CI #486 (`45469339322`) SUCCESS tras el ajuste: Compose, migraciones PostgreSQL aisladas, release/backup, 70/70 archivos de tests, typecheck, lint y build PASS. En concreto, `provision-better-auth-admin.test.ts` 4/4 y `better-auth.test.ts` 2/2 con PostgreSQL. El workflow confirma los pasos verdes.

## Archivos

- `apps/api/src/auth/provision-better-auth-admin.ts`: regla condicional de promoción de una sola identidad existente.
- `apps/api/src/auth/provision-better-auth-admin-cli.ts`: comando manual que aplica la promoción y solicita el recovery por Better Auth/Resend.
- `apps/api/src/auth/resend-password-reset.ts`: reconoce aceptación HTTP 2xx y extrae únicamente un posible ID del mensaje.
- `deploy/production/docker-compose.yml`: servicio manual aislado del arranque normal.
- `deploy/production/README.md`: procedimiento operacional sin credenciales.

## Verificación y estado final

- `pnpm install --frozen-lockfile` — PASS; lockfile sin cambios.
- `pnpm --filter @fragments/contracts build` — PASS (preparación requerida por el worktree limpio).
- `pnpm --filter @fragments/api exec vitest run src/auth/provision-better-auth-admin.test.ts src/auth/resend-password-reset.test.ts --maxWorkers=1` — PASS, 6/6.
- `pnpm --filter @fragments/api test` — PASS, 51 archivos / 196 pruebas; 19 archivos / 74 pruebas omitidas porque no se configuró base de datos en este checkout.
- `pnpm --filter @fragments/api typecheck` — PASS.
- `pnpm --filter @fragments/api build` — PASS.
- Parseo local del YAML de Compose con `yaml` — PASS; servicio `bootstrap-admin` bajo perfil explícito. `docker compose config -q` quedó sin ejecutar correctamente porque falta el env_file requerido `.env.test-migrate`; no se creó archivo de entorno para la validación.
- `git diff --check` — PASS.
- Corrección de red: `bootstrap-admin` se une a `fragments` para salida HTTPS y a `fragments-db` (que permanece `internal`) para PostgreSQL. YAML parse/assert local PASS; suites API 196 PASS, 74 omitidas por falta de DB, typecheck y build PASS. PR #268 merge en `a0e75e33ca5a3115392fef093b9ba40230953416`; CI #45473906796 SUCCESS.
- La integración Better Auth/PostgreSQL del flujo reset está escrita, pero no corrió localmente por ausencia de `DATABASE_URL`; queda pendiente su salida CI con PostgreSQL efímero.
- PR #267 se integró normalmente; CI final #487 (`45469831174`) SUCCESS. Merge SHA `d569f7633af71704ddc88992ead720c69b81fb55`; release anotada `v0.5.70`, F14 run `45470586035` SUCCESS. Producción confirma API/web en ese SHA y `/health` ok/ready.
- F14 `v0.5.71`, run #45474371223, SUCCESS en verify-build, attest-package y publish-approved-release. El poll/apply normales registraron `release_deployed`; API/web healthy en SHA exacto y health público/local `ok/ready`.
- CLI ejecutado dentro del API de producción verificó la identidad exacta autorizada con `admin=true`, `isTeacher=true`; Resend aceptó el recovery, ID `01a20f25-bc8d-7154-b595-7c619e5a4d36`. No se creó cuenta ni se cambió contraseña.
- Ego Lite espacio 44, perfil `Fragments-Docente`: versión `v0.5.71`; dashboard sirve login, y `/teacher/reset-password` muestra el formulario correcto. El acceso autenticado queda NO COMPROBADO hasta que el propietario establezca su nueva contraseña.
- Las pestañas existentes de dashboard y Control Mentor se conservaron abiertas; la pestaña temporal de reset se cerró.

## Límites

No se imprimieron ni copiaron valores de `.env`, claves, tokens o URL de recovery. Se comprobó solo la presencia de variables necesarias (sin valores). La única escritura productiva fue la promoción condicional del usuario docente específico autorizada por el propietario; se preservó `isTeacher`, no se alteró otra cuenta y no se ejecutaron migraciones.
