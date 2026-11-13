# F13 — Evidence / evidencie

**Estado:** COMPLETA (2026-11-12). Se verificó la relación histórica tag→commit→`origin/main` con objetos reales y se probó por separado el código nuevo. No se desplegó.

## Rutas implementadas

- `apps/web/src/build/release-metadata.ts`: valida formato, tag anotada, SHA completo igual a `HEAD`, ascendencia en `origin/main` y árbol limpio. Sin variables de release devuelve `dev` y `commit: null`.
- `apps/web/src/components/brand/BuildVersion.tsx`, `apps/web/src/App.tsx` y hojas de estilo: muestra versión en pie de landing, espacio estudiantil y rutas docentes; el SHA completo se ofrece en tooltip y nombre accesible.
- `.github/workflows/release-build-candidate.yml`: disparo manual desde `main`, permisos `contents: read`, checkout del SHA validado y artefacto web. No tiene secretos ni pasos de despliegue.
- Pruebas en `apps/web/src/build/release-metadata.test.ts` y `apps/web/src/components/brand/BuildVersion.test.tsx`.

## Verificación del código F13

Se creó una copia temporal desde los archivos rastreados y los cambios F13 en `C:\Users\vgmil\AppData\Local\Temp\fragments-f13-check-c2c524caabb7444e91568913e2fdfb77` para ejecutar Node/pnpm: el volumen `D:` es exFAT y rechaza los symlinks de pnpm, incluso con `node-linker=hoisted`. No se cambió la configuración ni el lockfile del proyecto.

- `pnpm build` — salida 0; contracts, API y web (3 tareas). El bundle de build local contiene metadata `dev` sin SHA, comprobado por `node check-build-metadata.mjs` (`bundles=2`, `expectedLocalMetadata=true`).
- `pnpm test` — salida 0; contracts 19/19, API 95/95, web 65/65 (179 pruebas). Las advertencias Better Auth de usuario inexistente son de fixtures de reset-password y no fallan la suite.
- `pnpm typecheck` — salida 0; 4 tareas del workspace.
- `pnpm lint` — salida 0; la configuración existente solo ejecuta lint de contracts.
- `pnpm --filter @fragments/web exec vitest run src/build/release-metadata.test.ts src/components/brand/BuildVersion.test.tsx` — 10/10.
- `git diff --check` — salida 0 en el checkout de la tarea antes del commit.
- `ego-browser` skill v2.2.0 leída y ejecutada antes de QA visual. Landing a 1600px de escritorio y 390×844 móvil; muestra `dev` al pie, sin cubrir contenido. En móvil `documentWidth=390` (sin desbordamiento horizontal).
- `task-list/F13/screenshots/version-dev-desktop.png` — SHA-256 `E10C8AB3921114445E616A3BE541A8CAC37D9CE18CDDBF0DCB624A31B8B100F8`.
- `task-list/F13/screenshots/version-dev-mobile-390.png` — SHA-256 `EE3F04D3FE66165A271DA0D1DB3A8657CB195078BDD65E39934D251CFC2ACDB5`.

## Verificación histórica real de `v0.3.1` — separada del código F13

- Autorización de lectura recibida; `git fetch origin refs/heads/main:refs/remotes/origin/main refs/tags/v0.3.1:refs/tags/v0.3.1` — salida 0; fast-forward local `origin/main` de `b83c479` a `704fe08` y descarga de tag nueva. No se usó refspec forzado.
- `git cat-file -t refs/tags/v0.3.1` — `tag` (tag anotada).
- `git rev-parse refs/tags/v0.3.1` — `3cf5185fc5d05edc9f5c6dee2a67c5bd8e9acbac`.
- `git rev-parse 'refs/tags/v0.3.1^{commit}'` — `50e2ace697afc125bb3bfdd9a705f0e383796a83`.
- `git rev-parse refs/remotes/origin/main` — `704fe08c1932cdabed1303884eadf612625e94e7`, igual al esperado; `git merge-base --is-ancestor <tag-commit> refs/remotes/origin/main` — salida 0. Hay un commit posterior a la tag: `704fe08 docs(incident): cierra INC-MENTOR-503 en producción`.
- Se clonó localmente con `--shared` a una carpeta temporal, se hizo checkout detached de `v0.3.1` y se fijó allí `refs/remotes/origin/main` al objeto real ya verificado. Ejecutar el resolver F13 actual con Node 24 y Git real desde ese checkout produjo `{"version":"v0.3.1","commit":"50e2ace697afc125bb3bfdd9a705f0e383796a83","verification":"real Git objects, isolated historical checkout"}`.
- El árbol histórico de `v0.3.1` no contiene `apps/web/src/components/brand/BuildVersion.tsx`; se comprobó con `git cat-file -e` (no existe en esa tag). La verificación acredita que el resolver selecciona la versión y SHA correctos, no que el artefacto ya publicado tenga el indicador. El código F13 llegará a usuarios con la siguiente versión.

## Alcance de release

- `.github/workflows/release-build-candidate.yml` sigue siendo solo un build candidato manual desde `main`, con `contents: read`, sin secretos de producción ni despliegue. No acredita la infraestructura de despliegue segura y aislada solicitada para F14.
- No hubo push, merge, cambio de tags, despliegue, runner nuevo ni modificación de producción. `env` permaneció intacto.

## Commits

- Código F13: `065e3b2a7da42eded9b02d1a30a801cd93779efd` — `feat(f13): muestra version verificable en la interfaz`.
- Commit documental previo: `e6360d4601acc27ca3df9e07889e324a95994b11`; esta actualización añade la verificación real de GitHub y capturas persistentes.
- La identidad del commit de código es `Codex <codex@localhost>` aplicada solo a ese commit; no se cambió configuración global.

## Revalidación fresca durante F14 — 2026-11-12

- `git fetch origin` → salida 0. `origin/main` quedó en `704fe08c1932cdabed1303884eadf612625e94e7`.
- `git cat-file -t refs/tags/v0.3.1` → `tag`; objeto anotado `3cf5185fc5d05edc9f5c6dee2a67c5bd8e9acbac`; `refs/tags/v0.3.1^{commit}` → `50e2ace697afc125bb3bfdd9a705f0e383796a83`; `git merge-base --is-ancestor <SHA> refs/remotes/origin/main` → salida 0.
- Se hizo una copia Git aislada en `C:\Users\vgmil\AppData\Local\Temp\fragments-f14-historical-bd61f9119efd457e9072d086adef504c`, checkout detached del SHA histórico y referencia local `origin/main` fijada al objeto verificado. Ejecutar `resolver-real-git-check.ts` con el resolver actual desde el workspace produjo `{"version":"v0.3.1","commit":"50e2ace697afc125bb3bfdd9a705f0e383796a83","verification":"real Git objects, isolated historical checkout"}`. Se confirmó que `BuildVersion.tsx` no existe en el árbol histórico; esto prueba el resolver, no que el artefacto productivo histórico muestre el indicador.
- En la copia de verificación NTFS de F13, `pnpm exec turbo run test typecheck lint build --force` → `Tasks: 10 successful, 10 total; Cached: 0 cached, 10 total`. Suites: contracts 19/19, API 95/95, web 65/65; typecheck, lint y build exitosos. `node check-build-metadata.mjs` → `bundles=2`, `expectedLocalMetadata=true`; el bundle contiene `version:"dev", commit:null`.
- `pnpm --filter @fragments/web exec vitest run src/build/release-metadata.test.ts src/components/brand/BuildVersion.test.tsx` → 2 archivos, 10 pruebas correctas.
- Los comandos se ejecutaron en copia temporal NTFS porque el checkout de trabajo está en D: exFAT; en ese volumen pnpm no pudo completar la creación de su virtual store. No se alteró la configuración ni el lockfile del repositorio. `git status --short` siguió mostrando únicamente el archivo preexistente `env` sin rastrear.

Esta revalidación no integra ni publica F13 en `main`; la comprobación de integración queda sujeta a la revisión y procedimiento de F14.

## Indicador de producción — v0.4.1 — 2026-11-13

- Tras el release F14, la landing pública mostró `v0.4.1`; el build expone commit completo `12b6e39fbb64016ab0f56ea104fe9b384da688fa` en `title` y `aria-label` del componente, correspondiente a los labels OCI de API/web.
- La landing y login caben en viewport Ego Lite de 390 px sin overflow horizontal.
- Limitación solicitada en F15: el componente muestra actualmente solo la versión como texto; el SHA corto no es visible salvo tooltip/nombre accesible que contiene el SHA completo. No se modificó el artefacto aprobado `v0.4.1`; un cambio visual nuevo requiere versión nueva y autorización específica de tag.

## SHA corto visible — PR #18

- Código local `9ffab86919be835775dcc2e3a83aefda20b22555`: `BuildVersion` ahora muestra los primeros 7 caracteres del SHA junto a la versión; el SHA completo permanece en `title` y `aria-label`. La metadata `dev` sin SHA no dibuja el sufijo.
- Pruebas de regresión cubren el build de release y el estado `dev`. El test local no terminó porque pnpm intentó materializar 308 dependencias en el checkout exFAT; se detuvo esa instalación. GitHub Actions `verify`, run `43376762673`, pasó en el PR #18 e incluye tests, typecheck, lint y build.
- Este cambio no altera la tag ni los assets `v0.4.1`, y no se desplegó. Aun integrado, requerirá una nueva tag/version y autorización específica antes de producción.
- PR #18 se integró mediante merge normal: branch head `69c7ffaac3f62353a0a4d92e55602b6cd178d686`, merge SHA `ffb647706782c8bf3942e7793b117ec3d870d527`; check `verify` run `43376992320`: SUCCESS. `origin/main` en la revalidación quedó en `ffb647706782c8bf3942e7793b117ec3d870d527`.
- La versión pública continúa siendo `v0.4.1` porque no se creó tag nueva ni se desplegó el cambio. El frontend público seguirá mostrando solo la versión y SHA completo accesible hasta la próxima release autorizada.

## Integración prevista con F14

- El workflow candidato continúa siendo únicamente manual y de build. Sus tres acciones ahora están fijadas a SHA completos porque GitHub se configura con `sha_pinning_required=true` y una lista cerrada de acciones permitidas; no se añadió capacidad de publicación ni despliegue.
- El workflow separado de CI valida los pull requests con permisos de solo lectura. El workflow de releases no se dispara por `workflow_dispatch` y conserva únicamente `push.tags: v*.*.*`.
- F13 y F14 todavía están en una rama de trabajo; su integración protegida en `main` y la primera entrega del indicador a usuarios requieren completar el PR de F14 y un futuro release autorizado.

- Commit de esta revalidación: `0794e0f` — `docs(f14): registra auditoria de seguridad`.
