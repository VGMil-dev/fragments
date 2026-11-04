# F03 — Evidence / evidencie

Estado: DONE
Owner: W3

## Skills y criterio aplicado

- `backend-architecture` (`we-are-singular/skills`, [SKILL.md original](https://github.com/we-are-singular/skills/blob/main/skills/backend-architecture/SKILL.md)): límites de HTTP, servicio, persistencia y configuración; repositorio mantiene transacciones; schemas en los bordes. Se descartaron framework, factories y capas extra sin reutilización; se conservó un único puerto de verificación de credenciales porque es un límite real de auth y permite un fake de prueba.
- `test-driven-development` (`obra/superpowers`, [SKILL.md original](https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md)): config, lease, recuperación, validación HTTP y servicio de sesión siguieron red/green con fallos esperados. El hardening final del atributo `Secure` también tuvo un fallo observado antes de pasar. Límite: la implementación inicial del firmante HMAC precedió a su prueba unitaria específica; esa prueba se añadió después y pasó, así que esa pieza no tuvo ciclo red/green previo.
- `verification-before-completion` (`obra/superpowers`, [SKILL.md original](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md)): se repitieron suite, tipos, compilación, Docker ARM64, configuración y health/persistencia antes del cierre.

## Rutas cambiadas

- `.dockerignore`
- `apps/api/Dockerfile`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.test.json`
- `apps/api/migrations/001-platform.sql`
- `apps/api/src/platform/config.ts` y `config.test.ts`
- `apps/api/src/db/open.ts`, `open.test.ts`, `migrate.ts`
- `apps/api/src/queue/repository.ts`, `repository.test.ts`
- `apps/api/src/auth/session.ts`, `session.test.ts`, `session-service.ts`, `session-service.test.ts`
- `apps/api/src/http/app.ts`, `app.test.ts`, `main.ts`
- `docker-compose.yml`, `docker-compose.prod.yml`
- `task-list/F03/intent.md`, `spec.md`, `evidencie.md`

## Comandos y resultados

Instalación local con scripts de terceros desactivados y store solicitado:

```text
pnpm install --frozen-lockfile --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments
exit 0; lockfile existente quedó sin cambios.
pnpm install --lockfile=false --ignore-scripts --store-dir C:\Users\vgmil\.cache\pnpm\fragments
exit 0; necesario porque apps/api es un importer nuevo y root/lockfile están fuera del alcance W3.
```

Verificación local final:

```text
.\node_modules\.bin\vitest.cmd run apps/api/src
exit 0 — Test Files 6 passed; Tests 12 passed.
.\apps\api\node_modules\.bin\tsc.cmd --noEmit -p apps/api/tsconfig.test.json
exit 0 — sin diagnósticos.
.\apps\api\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.json
exit 0 — compilación sin diagnósticos.
git diff --check
exit 0 — sin errores de whitespace.
```

SQLite local: prueba de integración abre dos conexiones al mismo archivo temporal; confirma `PRAGMA journal_mode=wal`, una migración aplicada idempotentemente, un lease activo entre workers y reclamación tras vencimiento. Pruebas HTTP confirman health JSON, entrada inválida sin reflejar contraseña, y login con verificador fake etiquetado `fake-fixture-password`; cookie es HttpOnly, Secure y SameSite=Strict.

Docker y Compose:

```text
docker buildx build --platform linux/arm64 --target runtime --load -f apps/api/Dockerfile -t fragments-api:f03 .
exit 0.
docker image inspect fragments-api:f03 --format '{{.Os}}/{{.Architecture}}'
linux/arm64.
docker compose -f docker-compose.yml config
exit 0.
docker compose -f docker-compose.prod.yml config
exit 0.
docker compose -f docker-compose.yml up -d --build
exit 0; servicio fragments-api-1 inició; `GET /health` devolvió {"ok":true,"data":{"status":"ok","database":"ready"}}.
```

Persistencia real del volumen: inserté una fila de prueba con `idempotency_key=volume-check-key` en `/app/data/fragments.sqlite`; después `docker compose -f docker-compose.yml restart api`, health volvió a estar listo y una consulta devolvió `persisted rows: 1`. Bajé Compose de desarrollo sin borrar el volumen; inicié Compose de producción y health volvió a responder con `persisted rows: 1`. `docker compose -f docker-compose.prod.yml up -d --build` terminó con exit 0. Tras verificar, `docker compose -f docker-compose.prod.yml down -v` removió contenedor, red y volumen de prueba (exit 0).

Primeras construcciones ARM64 descubrieron que el contexto Docker podía copiar `node_modules` de Windows y que los comandos `pnpm --filter ...` volvían a instalar en build. Añadí `.dockerignore` para excluir `.env*`, node_modules, bases locales y artefactos; el Dockerfile ejecuta los compiladores ya instalados directamente, con scripts ignorados. El build ARM64 final y la imagen de producción pasan sin ejecutar scripts lifecycle de dependencias.

## Runtime SQLite

Driver: `node:sqlite` integrado, sin addon ni compilación nativa, sobre Node **24.21.0**; ambas etapas Docker fijan `node:24.21.0-bookworm-slim`, imagen multi-arquitectura. La [documentación oficial Node 24](https://nodejs.org/docs/latest-v24.x/api/sqlite.html) marca `node:sqlite` Stability 1.2, **release candidate**. El build ARM64 y tests corrieron, pero debe planificarse un cambio si Node no promueve esta API a estable o cambia el soporte; no se oculta este riesgo.

## Seguridad y límites

- `.env` no se leyó ni se imprimió; `.env*` se excluye del contexto Docker. Ninguna credencial externa o valor sensible entró en evidencia. No hubo llamadas a Gateway, GitHub, Moodle o despliegues externos; no se ejecutó código de estudiantes.
- No se modificaron contratos, root package, workspace, pnpm-lock ni configuración compartida. Como contratos congelados no definen DTO de login, la entrada usa un esquema Zod local; los resultados HTTP usan el `ApiResultSchema` compartido.
- `AUTH_ENABLED=true` exige `SESSION_SECRET`; además el proceso falla cerrado hasta conectar un verificador docente real. La ruta de login y firma se ejercitan con fake driver de test solamente; no se crea ni habilita una cuenta docente de producción.
- El esquema persistente de sesiones queda preparado; el token actual se firma con HMAC y expiración. No se implementan revocación, recuperación de contraseña ni políticas de alta docente en S0.
- Node built-in SQLite permanece en release candidate (Stability 1.2), documentado arriba.
- El lockfile raíz no incluye el importer nuevo de API por límite de ownership; instalación local y Docker usan `--lockfile=false`. Planner debe sincronizar el lockfile en integración.

## Hash / commit

Commit de implementación: `626511d82c32d46cc37867707ad44ca1ca51022e` (`feat(api): implementar base HTTP y SQLite`). El commit documental registra DONE en `task-list/TASKS.md`.

## Capturas / logs

No se generaron capturas. Los comandos y resultados resumidos arriba son la evidencia; no se copiaron logs con credenciales.
