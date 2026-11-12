# F14 — Evidencia

**Estado:** INTEGRADA EN `main`; no se declara completa hasta instalar y comprobar el agente pull aislado en la VPS. No se creó ni publicó una tag nueva y no hubo despliegue.

## Procedencia histórica de `v0.3.1` — comprobación independiente del código F14

- `git fetch origin refs/heads/main:refs/remotes/origin/main refs/tags/v0.3.1:refs/tags/v0.3.1` — salida 0.
- `git cat-file -t refs/tags/v0.3.1` — `tag` anotada.
- Objeto tag: `3cf5185fc5d05edc9f5c6dee2a67c5bd8e9acbac`.
- Commit pelado: `50e2ace697afc125bb3bfdd9a705f0e383796a83`.
- `origin/main`: `704fe08c1932cdabed1303884eadf612625e94e7`, igual al valor conocido.
- `git merge-base --is-ancestor 50e2ace697afc125bb3bfdd9a705f0e383796a83 refs/remotes/origin/main` — salida 0.
- No se modificó ni movió `v0.3.1`. La revalidación del resolver F13 con objetos Git reales está en `task-list/F13/evidencie.md`; el árbol histórico de `v0.3.1` no contiene aún el componente visual F13.

## Auditoría de VPS y runner — solo lectura

- Verificada huella ED25519 conocida antes de conectar: `SHA256:zzF20RQw2amdh66Pxm89w3oUCuhieg0nToMxJlGnNlQ`. Todas las conexiones usaron `StrictHostKeyChecking=yes`; no se aceptaron hosts desconocidos.
- VPS `gavanti`, arquitectura `aarch64`; SSH como `ubuntu`. Docker estaba activo. La API de Fragments y el sitio respondían HTTP 200; contenedores de Pits estaban saludables y su endpoint local respondía 200.
- El runner compartido `actions.runner.GAVANTI-STARTUP.gavanti-srv-arm64.service` pertenece a `GAVANTI-STARTUP`, usa `actions-runner`, tiene el grupo `docker` y una exposición systemd auditada como `UNSAFE` (9.2). No se seleccionó, modificó ni reinició. La ruta F14 usa runners hospedados y un agente pull distinto.
- La imagen productiva observada conservaba el revision label `50e2ace697afc125bb3bfdd9a705f0e383796a83`; sus OCI version labels indicaban `v0.3.0`, aunque el commit/tag productivo esperado es `v0.3.1`. Se registra la discrepancia para que F14 reporte metadata de releases nuevos; no se alteró la imagen actual.
- El timer existente de backup estaba habilitado. La carpeta de backups era `root:root` modo `0700`; se hizo solo lectura de un snapshot existente, cuyo `PRAGMA integrity_check` devolvió `ok`. No se inició backup nuevo ni se leyó el contenido de `.env` o SQLite activa.
- La llave privada no se leyó ni se copió al repositorio. Debido a que su unidad original exFAT no permite ACL restrictivas, se usó una copia temporal en NTFS con acceso solo a la cuenta local; debe borrarse al cerrar la tarea.

## Configuración efectiva de GitHub

Consultas y cambios del 2026-11-12 en `VGMil-dev/fragments`:

- Actions habilitadas con `allowed_actions=selected`, `sha_pinning_required=true`; listas permitidas: `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/download-artifact`, `actions/attest` y `pnpm/action-setup`, todos referenciados por SHA completo en los workflows. No se permiten otras acciones externas.
- Entorno `fragments-production`: revisor requerido `VGMil-dev` (ID `259344844`), `prevent_self_review=false` por ser el único revisor colaborador, `can_admins_bypass=false`, sin secretos ni variables; política de despliegue limitada al patrón de tag `v*.*.*`. Verificado con `GET /environments/fragments-production` y `GET /deployment-branch-policies` después del cambio de interfaz.
- Ruleset activo `Fragments main via pull request` para `refs/heads/main`: PR obligatorio, merge normal, check `verify` obligatorio desde GitHub Actions (integration ID `15368`), sin bypass (`current_user_can_bypass=never`), force-push y borrado prohibidos.
- Ruleset activo `Fragments version tags immutable` para `refs/tags/v*.*.*`: actualización y borrado prohibidos, sin bypass. No se creó ni cambió tag alguna.
- La API no permite administrar `can_admins_bypass`; se desactivó en la interfaz de GitHub y luego se verificó por REST como `false`.
- No hay secrets de GitHub configurados para el entorno. Los permisos del job de publicación se limitan a `contents: write`; los jobs de build son `contents: read` y la atestación usa sus permisos específicos.

## Implementación F14 integrada

- `.github/workflows/release.yml`: único disparador `push` de tags `v*.*.*`; valida repositorio, evento de creación, semver estable estricto, tag anotada, SHA exacto del checkout y ascendencia en `main`. Exige que el archivo de workflow de la tag coincida con el de `main` actual antes del entorno protegido.
- Build/tests ARM64 en runner hospedado desde el SHA etiquetado; verifica metadata de bundle F13, labels OCI de API/web, manifiesto y SHA-256; job de atestación sin privilegios de producción; publicación de assets detrás del entorno protegido. El agente valida nuevamente la ejecución, atestación, tag y commit.
- `ci.yml` separado se dispara solo por pull requests, con token de solo lectura y runner hospedado. `release-build-candidate.yml` sigue siendo manual y sin publicación o despliegue; sus referencias de acciones se fijaron a SHA para cumplir la política global.
- Agente pull dedicado (`fragments-release`) sin login, Docker, sudo o LXD; cola con archivo único; aplicador root de systemd endurecido, con acceso al socket Docker limitado al unit y Compose fijo para API/web de Fragments. Timer a cinco minutos, ledger antirrepetición, validación de SHA/tag contra GitHub, atestación, backup, healthchecks y rollback de imágenes sin restaurar SQLite.
- PR #5 se fusionó mediante merge normal; SHA de merge en `main`: `13b99a0e7af12c2dfb4377a7de390c9ad129281c`. CI `Fragments CI`, run `43269293206`, check `verify` concluyó `success`; el workflow YAML fue aceptado por GitHub Actions.
- Los SHAs de `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `upload-artifact`, `download-artifact` y `attest` se cotejaron contra los refs actuales de sus repositorios upstream. La tag `v4.2.2` de checkout apuntaba a `11bd719...`; se corrigió la referencia antes de abrir el PR.
- `install-gh-cli.sh` se ejecutó desde el SHA integrado. Verificó el checksum SHA-256 publicado del keyring y fingerprint de firma; APT instaló solo `gh` 2.103.3 (`1 nuevo, 0 actualizados, 0 eliminados`). `gh attestation verify` incluye `--deny-self-hosted-runners`.
- El agente y sus units aún no están instalados. El preflight de solo lectura confirmó que no existían la cuenta, el grupo, la configuración del agente ni el origen APT antes de iniciar F14. Se probó la plantilla `docker inspect` del instalador como root y corrigió el error antes de ejecutarlo; la plantilla corregida devolvió el revision SHA esperado para ambas imágenes.

## Pruebas locales y simulaciones F14

En copia limpia NTFS `C:\Users\vgmil\AppData\Local\Temp\fragments-f14-verify-20261112` (para evitar la limitación de symlinks/virtual store del checkout exFAT):

- `node --test deploy/production/release-agent/test-release-agent-scripts.mjs` — 4/4: manifiesto y digest, rechazo de tag/objetos inválidos, metadata del bundle con tag/SHA exactos, y trigger exclusivo de tag sin rutas alternativas.
- Tras integrar la base remota, `pnpm exec turbo run test typecheck lint build --force` — 10/10 tareas, caché desactivada: contracts 19/19, API 101/101, web 67/67; typecheck, lint y build exitosos. Build local sin variables de release dejó metadata `dev`/`null`.
- En la VPS, con archivos temporales en `/tmp` y repo Git sintético: `python3 -m unittest -v test_release_agent` — 10/10; casos de semver, tag ligera, SHA/main, manifiesto, ledger, cola, snapshot SQLite sintético íntegro/corrupto y rollback simulado de código. No usó Docker ni datos productivos.
- En la VPS: `python3 -m py_compile`; `bash -n` de `install-release-agent.sh`; `systemd-analyze verify` de cuatro units — salida 0. Una validación posterior del instalador encontró y corrigió el formato de la plantilla Docker; sus dos usos se comprobaron en lectura y devolvieron el SHA histórico esperado.
- `systemd-analyze verify` de los cuatro units en `/tmp` — salida 0; únicamente emitió avisos preexistentes de units XFS del sistema, sin errores F14.
- La simulación de rollback usó mocks y dejó el fixture intacto. No se simuló el flujo completo de Docker real ni se creó atestación de un release nuevo porque hacerlo requeriría publicar una nueva tag.

## Pendiente para cerrar F14

- Integrar por un segundo PR la corrección encontrada en la revisión preinstalación del instalador.
- Instalar el agente pull desde el contenido revisado e integrado de `main`; habilitar únicamente sus dos timer/path units.
- Verificar usuario y grupos efectivos, unidades activas/endurecidas, polling sin secretos, ausencia de cambios en producción/Pits/runner y estado de salud después de la instalación.
- No crear `v0.4.0`, no ejecutar release y no desplegar durante esta preparación.

## Evidencia privada

Actualizar `C:\Users\vgmil\.codex\evidence\fragments-f14\audit-2026-11-12.md` al final de la integración. Mantener máximo 20 archivos, sin llaves, secretos ni contenido académico.
