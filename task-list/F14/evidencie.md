# F14 — Evidence / evidencie

**Estado:** BLOQUEADA; no se declara F14 completa (2026-11-12). La regla exclusiva de tag sigue siendo obligatoria. No se creó workflow ni se cambió la configuración de GitHub porque el destino pull-based no pudo inspeccionarse ni aislarse en la VPS real.

## Verificaciones de procedencia histórica — separadas del código nuevo

- `git fetch origin` — salida 0; `origin/main` actual `704fe08c1932cdabed1303884eadf612625e94e7`, igual al valor esperado.
- `git cat-file -t refs/tags/v0.3.1` — `tag` anotada; objeto tag `3cf5185fc5d05edc9f5c6dee2a67c5bd8e9acbac`; commit pelado `50e2ace697afc125bb3bfdd9a705f0e383796a83`.
- `git merge-base --is-ancestor 50e2ace697afc125bb3bfdd9a705f0e383796a83 refs/remotes/origin/main` — salida 0.
- El commit etiquetado está contenido en `origin/main`; no se movió, recreó ni modificó ninguna tag.
- La revalidación del resolver y del árbol histórico se documenta por separado en `task-list/F13/evidencie.md`.

## Inventario efectivo de GitHub — solo lectura

Consulta autorizada al repositorio `VGMil-dev/fragments`; resultados de `gh api` del 2026-11-12:

- Repositorio público, default branch `main`.
- `GET /actions/permissions` → Actions habilitadas; `allowed_actions=all`; `sha_pinning_required=false`.
- `GET /actions/permissions/workflow` → token predeterminado `read`; `can_approve_pull_request_reviews=false`.
- `GET /rules/branches/main` → `[]`; `GET /branches/main/protection` → 404 “Branch not protected”.
- `GET /environments` → `total_count=0`.
- `GET /actions/runners` → `total_count=0`.
- `GET /actions/workflows` → `total_count=0` en el repositorio remoto (el workflow candidato F13 todavía no está en `main`).
- `GET /collaborators?per_page=100` → solo `VGMil-dev`, con admin/maintain/push. No hay un segundo revisor registrado.

## Bloqueo de infraestructura real

- La documentación F08 registra una VPS anterior y describe servicios vecinos; no demuestra su estado actual ni el aislamiento actual del runner compartido.
- `C:\Windows\System32\OpenSSH\ssh.exe -o BatchMode=yes -o ConnectTimeout=5 servidor ...` falló: `Could not resolve hostname servidor`. No hay hostname/IP alternativo configurado en este entorno y no se pudieron consultar usuario efectivo, grupos, `sudo`, socket Docker, credenciales, servicios vecinos, red, backup reciente o rollback en el host.
- GitHub no tiene runner del repositorio; el runner existente del contexto de infraestructura es compartido con otros servicios y no puede seleccionarse ni reutilizarse con seguridad sin auditoría. No se intentó instalar, conectar ni activar otro runner.
- Como no se puede verificar ni configurar un agente pull limitado en el VPS, tampoco se puede demostrar un recorrido end-to-end de backup consistente, integridad SQLite, despliegue aislado ARM64, healthcheck, ledger persistente y rollback de código. El acceso real a la VPS es requisito para esa configuración y simulación.

## Código y efectos

- `.github/workflows/release-build-candidate.yml` de F13 queda intacto: solo build candidato, sin credenciales ni despliegue.
- No se creó workflow tag-triggered incompleto que hiciera creer que producción está protegida o que la siguiente tag desplegaría correctamente.
- No se cambió configuración de Actions, protección de ramas ni entornos; no hubo push, merge, creación de tag, build publicado ni despliegue.
- No se tocó Pits, PostgreSQL, Cloudflare Tunnel, runner compartido, SQLite ni otros datos académicos. `env` permanece sin leer ni modificar.

## Pruebas F13 ejecutadas durante esta auditoría — no son pruebas de F14

En la copia temporal NTFS `C:\Users\vgmil\AppData\Local\Temp\fragments-f13-check-c2c524caabb7444e91568913e2fdfb77`:

- `pnpm exec turbo run test typecheck lint build --force` → 10/10 tareas exitosas, 0 en caché; contracts 19/19, API 95/95 y web 65/65.
- `node check-build-metadata.mjs` → `bundles=2`, `expectedLocalMetadata=true`, metadata local `dev`/SHA `null`.
- `pnpm --filter @fragments/web exec vitest run src/build/release-metadata.test.ts src/components/brand/BuildVersion.test.tsx` → 10/10.
- El resolver actual ejecutado en un checkout Git aislado de la tag histórica devolvió `v0.3.1` y el SHA exacto. Esto valida los objetos y el código nuevo; no demuestra que el artefacto productivo histórico incluya el indicador.

La evidencia privada compacta de auditoría queda fuera del repositorio en `C:\Users\vgmil\.codex\evidence\fragments-f14\audit-2026-11-12.md` (1 archivo; sin secretos ni datos académicos).

## Commit

`3d0cbfe691e59a23b869d8d592fcee598e7cc7bc` y `df4e83138405c1356c2057e32262f9563de6c4a4` fijaron antes los requisitos. Esta actualización registra verificación e impedimentos; no representa implementación ni cierre de F14.

- Actualización de evidencia y TASKS: `0794e0f` — `docs(f14): registra auditoria de seguridad`.
