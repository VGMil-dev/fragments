# F14 — Evidencia

## Release automática v0.5.88 · CU-12 feedback de rúbrica · 2026-11-25

- PR #312 se integró por merge normal como SHA `cd05bd238750bc1da8aa7b8de5ea29bfbdd153c9`; CI `45679461617` SUCCESS y revisión independiente CLEAN.
- La tag anotada nueva `v0.5.88` apunta al SHA exacto de `main`. F14 run `45680454124`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; no hubo aprobación humana adicional.
- El timer/poller normal recogió release `458529022`; el aplicador registró `release_deployed`, ledger `deployed`, tag/SHA coincidentes. Backup `fragments-prod-2026-11-25T19-04-39-502Z.dump`, 98,409 bytes, SHA-256 `ac38e49638cf117caab68a906c037d95079ebd74c39c4fefa57ca6bd0259e3e3`, `restored_to_temporary_database`.
- SSH de solo lectura: contenedores web/API healthy sobre `sha-cd05bd238750bc1da8aa7b8de5ea29bfbdd153c9`; poll timer, apply path y cloudflared activos; `systemctl --failed` vacío; servicios vecinos saludables. `/dev/sda1` con 92 GB libres (53% usado), inodos 12%; imagen previa `sha-e6d3979` conservada para rollback.
- Verificación pública: `/health` HTTP 200, `ok/database=ready`; bundle `/assets/index-G1iFj5_B.js` contiene `v0.5.88` y SHA exacto. UI autenticada Ego Lite post-release NO COMPROBADA: Space 44 fue autorizado pero no se pudo reclamar porque no aparece en el runtime; Space 80 tampoco disponible.
- No se cambió `fragments-production`, Required reviewers ni controles técnicos. No se ejecutó deploy/reinicio manual, SQL productivo ni rollback real.

**Estado actual:** F14 integrada; release automático al publicar una tag SemVer anotada tras superar las puertas técnicas. `Required reviewers` permanece desactivado. La configuración manual descrita en los registros históricos fue reemplazada y no debe reactivarse por iniciativa propia. La última release verificada es `v0.5.56` (2026-11-24), documentada abajo.

## Release y aplicación automática v0.5.55 — F10.7/F16.14 Pixel Night · 2026-11-24

- PR #228 y PR #229 se integraron normalmente; SHA de main `ec5a7e5a3efd00f50b9e6ff92be5efaccc800128`. Tag anotada `v0.5.55` apunta al merge exacto.
- F14 run `45305064817`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; se publicó el paquete atestado a la cola automática.
- Producción verificada públicamente: `/health` HTTP 200 (`ok`, DB `ready`); `/assets/index-hf2sHvom.js` contiene `v0.5.55` y el SHA exacto.
- Sin despliegue/reinicio manual ni cambios a entorno o gates. Ledger del host e integridad/retención de backups NO COMPROBADOS.

## Release y aplicación automática v0.5.56 — F17.12 elección de misión · 2026-11-24

- PR #231 se integró por merge normal como `1c9601634bca5866ad4bafee212e7a6f5cfdec7d`; tag anotada nueva `v0.5.56` apunta a ese SHA exacto de `main`.
- Preflight read-only de `fragments-production`: solo `branch_policy`, sin reviewers humanos ni wait timer; el entorno y sus controles no se modificaron.
- F14 run `45310349097`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Pasaron la verificación tag/SHA/main, pruebas, typecheck/lint/build, metadata, PostgreSQL desechable, backup/restore, imágenes ARM64 y atestación Sigstore; el paquete aprobado se publicó para el agente pull.
- Aplicación automática confirmada en dos comprobaciones públicas: `/health` HTTP 200 (`ok`, DB `ready`); `/assets/index-DJ51_Rsi.js` contiene `v0.5.56` y el SHA exacto.
- No se ejecutó despliegue ni reinicio manual y no se apagó producción. Las sesiones Ego Lite permanecieron abiertas.
- QA visual autenticada del estudiante, zoom/contraste/lector y aprobación visual propietaria NO COMPROBADOS. Ledger, hash/integridad y retención del backup del host NO COMPROBADOS.

## Release `v0.5.53` — F16.12 Galería Pixel Night · 2026-11-24

- PR #224 merge normal; commit `90873bfc5d4d0d2061f693e86febb650606181c2` en `main`.
- Tag anotada `v0.5.53` apunta exactamente a ese commit. F14 run `45294837360`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Verify-build completó tests, typecheck, lint/build, verificaciones de backup/restore y rollback, bundle metadata e imágenes ARM64. El paquete atestado se publicó a la cola para el agente pull existente; no se desplegó manualmente.
- Entorno `fragments-production` consultado read-only: la única regla informada es `branch_policy`; no hay `Required reviewers` humano. No se alteró el entorno ni sus controles.
- Producción verificada públicamente después del ciclo pull: `/health` HTTP 200 con `status=ok`, `database=ready`; asset `/assets/index-S15JAbH-.js` contiene `v0.5.53` y SHA `90873bfc5d4d0d2061f693e86febb650606181c2`.
- Sin apagado/reinicio manual, escritura en base productiva ni lectura de secretos.
- Integridad/retención independiente de backups y ledger del host siguen NO COMPROBADAS.

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
- **Histórico, no configuración vigente (2026-11-12):** `fragments-production` usaba entonces revisor requerido `VGMil-dev` (`prevent_self_review=false`). Esa aprobación humana fue desactivada posteriormente por decisión explícita del propietario. Consulta read-only del 2026-11-24 informó únicamente `branch_policy`; no hay `Required reviewers` humanos.
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
- PR #6 se fusionó mediante merge normal; SHA `35e5b800aff892e592dfa5d7a76ab098c946c7fe`, CI run `43270044536` `success`.
- PR #7 se fusionó mediante merge normal; SHA `ddf141447ec7b982afb58a65db5b47debb7e597c`, CI run `43271644085` `success` (rama sincronizada con `main`); PR original también pasó run `43271483786`. El SHA final de `origin/main` es `ddf141447ec7b982afb58a65db5b47debb7e597c`.
- Los SHAs de `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `upload-artifact`, `download-artifact` y `attest` se cotejaron contra los refs actuales de sus repositorios upstream. La tag `v4.2.2` de checkout apuntaba a `11bd719...`; se corrigió la referencia antes de abrir el PR.
- `install-gh-cli.sh` se ejecutó desde el SHA integrado. Verificó el checksum SHA-256 publicado del keyring y fingerprint de firma; APT instaló solo `gh` 2.103.3 (`1 nuevo, 0 actualizados, 0 eliminados`). `gh attestation verify` incluye `--deny-self-hosted-runners`.
- El agente se instaló desde `main` SHA `35e5b800aff892e592dfa5d7a76ab098c946c7fe`. `fragments-release-poll.timer` y `fragments-release-apply.path` quedaron enabled/active. El poll inmediato terminó correctamente y no creó solicitudes.
- La cuenta `fragments-release` tiene solo el grupo `fragments-release-request`, shell `/usr/sbin/nologin`, sin sudo ni acceso Docker. Puede leer ledger y escribir cola; `docker ps` como esa cuenta devuelve acceso denegado. Ledger: `root:fragments-release-request` 0640; estado: root y traversal limitado al grupo; cola: root/grupo en modo 1730.
- `systemd-analyze security` evaluó ambos servicios como exposición `2.4 OK`. El aplicador corre como root solo en su unit endurecido, con capabilities vacías y acceso explícito al socket Docker. `fragments-release-apply.service` no se selecciona desde Actions ni ejecuta código de PR/tag.
- La plantilla Docker del instalador se corrigió y verificó antes de instalar: el `revision` observado en ambos contenedores era el SHA histórico esperado. La metadata de versión de imagen sigue siendo `v0.3.0` (discrepancia heredada registrada en la línea base); la base inicial del ledger conserva tag `v0.3.1` y commit exacto sin modificar imagen.

## Pruebas locales y simulaciones F14

En copia limpia NTFS `C:\Users\vgmil\AppData\Local\Temp\fragments-f14-verify-20261112` (para evitar la limitación de symlinks/virtual store del checkout exFAT):

- `node --test deploy/production/release-agent/test-release-agent-scripts.mjs` — 4/4: manifiesto y digest, rechazo de tag/objetos inválidos, metadata del bundle con tag/SHA exactos, y trigger exclusivo de tag sin rutas alternativas.
- Tras integrar la base remota, `pnpm exec turbo run test typecheck lint build --force` — 10/10 tareas, caché desactivada: contracts 19/19, API 101/101, web 67/67; typecheck, lint y build exitosos. Build local sin variables de release dejó metadata `dev`/`null`.
- En la VPS, con archivos temporales en `/tmp` y repo Git sintético: `python3 -m unittest -v test_release_agent` — 12/12; incluye transacción completa simulada (aprobación, backup ficticio, Compose limitado a API/web, ledger) y fallo de salud con rollback automático de imágenes, sin restaurar DB. HTTP, Docker, GitHub, backup y atestación externos se mockearon; no usó Docker ni datos productivos.
- En la VPS: `python3 -m py_compile`; `bash -n` de `install-release-agent.sh`; `systemd-analyze verify` de cuatro units — salida 0. Una validación posterior del instalador encontró y corrigió el formato de la plantilla Docker; sus dos usos se comprobaron en lectura y devolvieron el SHA histórico esperado.
- `systemd-analyze verify` de los cuatro units en `/tmp` — salida 0; únicamente emitió avisos preexistentes de units XFS del sistema, sin errores F14.
- `gh api repos/VGMil-dev/fragments/releases` devolvió cero releases; no hay paquete que el poller pueda desplegar. No se generó una atestación de un release nuevo ni se ejecutó Docker Compose para modificar producción porque hacerlo requeriría publicar una tag y desplegar.
- Después de instalar el agente: Docker, timer de backups y runner compartido siguieron activos; `fragments_api=200`, `pits_dev=200`, contenedores de Pits siguieron `healthy`. No se editó ni mostró `.env`, SQLite, Pits, PostgreSQL o runner.
- Tras integrar PR #7, el archivo `/usr/local/libexec/fragments-release-agent.py` se actualizó desde `main` SHA `ddf141447ec7b982afb58a65db5b47debb7e597c`; SHA-256 de fuente y destino coincide: `77eb46a06f2a60960a86adbed317c6e67112ea815b08279442d8ed4579dcdd95`. El poller ejecutado terminó `Result=success`, `ExecMainStatus=0`; timers/path de F14, backup timer, Docker y runner existente quedaron `active`.
- Chequeo final de solo lectura: `fragments-web-1` healthy, `fragments-api-1` healthy, ambas imágenes conservan revision `50e2ace697afc125bb3bfdd9a705f0e383796a83` y label histórico `v0.3.0`; web local `3001` HTTP 200 y Pits dev `8081` HTTP 200; contenedores de Pits healthy. GitHub API reportó cero releases, cola vacía y no se ejecutó Compose.
- `git diff --check` fue limpio. Tests locales frescos `node --test deploy/production/release-agent/test-release-agent-scripts.mjs` pasaron 4/4. En VPS con fixtures y mocks sintéticos: `python3 -m unittest -v test_release_agent` pasó 12/12 y `python3 -m py_compile fragments-release-agent.py test_release_agent.py` terminó sin salida/error. Los comandos no usaron Docker, red externa para releases ni datos productivos.
- La ejecución real de un release no se probó porque requeriría crear una tag nueva/publicar un release y potencialmente desplegar, acciones expresamente prohibidas en F14. El workflow fue validado por Actions CI, y el agente recorrió la transacción en pruebas con servicios externos simulados.

## Procedimiento para el próximo release

La tag `v0.4.0` es un intento fallido e inmutable; no volver a crearla ni moverla. La candidata siguiente es `v0.4.1`, y **no debe publicarse hasta una autorización específica del propietario**. Desde un checkout actualizado de `main`, el mantenedor verifica el commit a publicar y crea la tag anotada. El job `publish` sigue esperando que `VGMil-dev` la apruebe manualmente en `fragments-production`; la independencia es menor porque la misma identidad puede iniciar y aprobar. El bypass administrativo permanece desactivado.

```powershell
git switch main
git pull --ff-only origin main
git tag -a v0.4.1 -m "Fragments v0.4.1"
git push origin refs/tags/v0.4.1
```

El workflow valida semver, tag anotada, SHA exacto y pertenencia a `main`; el job de publicación espera la aprobación manual de `VGMil-dev` en `fragments-production`. Tras publicar el release, el agente pull verifica workflow/ejecución/atestación, digest y labels antes de preparar backup e instalar únicamente `api` y `web`. El ledger rechaza repetidos. Para detener el proceso, retirar la solicitud antes de aplicar o usar el rollback documentado; este revierte imágenes de código y no restaura automáticamente SQLite. La primera publicación real debe comprobarse con el run de GitHub y el ledger de la VPS.

## Intento v0.4.0 y hotfix de metadata Turbo — 2026-11-13

- Tag anotada `v0.4.0`: objeto `4b175b80a0b3159ff922bad491f8ef36efe4d0ee`, destino exacto `e73d25fe3e07e4125bc1f76cd45136e9c479cd00`. No se ha movido ni recreado.
- GitHub Actions run `43335099608`: verificación de tag/SHA y `Test, typecheck, lint, and build exact release source` pasaron. `Verify build bundle metadata` falló con `El bundle no contiene la versión y el SHA exactos verificados.` La atestación y `publish-approved-release` quedaron omitidos; no hubo aprobación ni despliegue.
- Causa: Turbo usa strict mode por defecto y filtraba las dos variables no declaradas. El fix agrega `FRAGMENTS_RELEASE_TAG` y `FRAGMENTS_RELEASE_SHA` a `tasks.build.env`, lo que también las incluye en el hash de caché. El verificador mantiene la comparación exacta de tag/SHA y ahora admite la serialización literal con backticks emitida por esbuild, además de comillas simples/dobles.
- Regresión nueva `deploy/production/release-agent/test-turbo-release-metadata.mjs`, integrada en el check obligatorio `verify`: clona una copia aislada, crea un commit, una ref `origin/main` y una tag anotada SemVer solo locales; ejecuta build `dev` sin variables y build de release mediante Turbo con variables, `--force`, y verifica el bundle con el verificador de producción. Limpia la copia al finalizar.
- `node --test deploy/production/release-agent/test-turbo-release-metadata.mjs` — 1/1; metadata de prueba `v99.98.97`, SHA `9de68d2761ff1b918e4280be75cdcad43f8e24e3`, 2 bundles JavaScript. El build sin variables conserva `dev`.
- `node --test deploy/production/release-agent/test-release-agent-scripts.mjs` — 4/4. `node --check` de ambos scripts y `git diff --check` — salida 0.
- En copia NTFS limpia: `pnpm exec turbo run test typecheck lint build --force` — 10/10 tareas exitosas, 0 en caché; contracts 19/19, API 109/109 y web 67/67. Typecheck, lint y builds exitosos.
- Commits de hotfix en `codex/f14-turbo-release-env`: código `9de68d2761ff1b918e4280be75cdcad43f8e24e3` y evidencia `449573baf67f14c8c77bdb34f78fcf5a7f31f06a`.
- PR #13 se fusionó con método `merge` normal; check `verify` requerido y exitoso en run `43338463332`. SHA final de `origin/main`: `42fa8ec24d5a348c4e63c54c046883c1b346a732`; el commit de hotfix está contenido en `main`.
- Protección `main` configurada desde GitHub: exige pull request y check `verify`, sin aprobación adicional; “Do not allow bypassing” activado para administradores. No se exigió que la rama esté actualizada automáticamente. No se alteró el entorno protegido `fragments-production`.
- `v0.4.0` sigue apuntando al objeto anotado `4b175b80a0b3159ff922bad491f8ef36efe4d0ee` → `e73d25fe3e07e4125bc1f76cd45136e9c479cd00`; no se movió. No existe `v0.4.1` y no se publicó release nuevo.
- Producción no se modificó para este hotfix: API y web siguen healthy con `fragments-api:50e2ace-arm64` y `fragments-web:50e2ace-arm64`; el `.env` productivo mantiene las credenciales OAuth privadas instaladas antes. SQLite, Pits y PostgreSQL permanecen intactos. No se creó la tag `v0.4.1`.

## Reducción de independencia autorizada

El entorno requiere aprobación manual, pero `prevent_self_review=false` permite al único mantenedor `VGMil-dev` aprobar la ejecución que inició. El bypass administrativo está desactivado. El propietario autorizó expresamente este modelo individual para v0.4.0; el riesgo de menor separación entre publicación y aprobación debe revisarse si se agregan más mantenedores.

## Evidencia privada

Evidencia privada: `C:\Users\vgmil\.codex\evidence\fragments-f14\audit-2026-11-12.md`; máximo 20 archivos, sin llaves, secretos ni contenido académico.

## Ejecución v0.4.1 y auditoría de producción — 2026-11-13

- Commit local de esta actualización de evidencia: `921518f8dc571416b102703af9a376d5cc980ab6` (rama `codex/f14-v041-agent-audit`; sin push).

- Revalidación: `origin/main` = `12b6e39fbb64016ab0f56ea104fe9b384da688fa`, coincide con el SHA autorizado; la tag anotada `v0.4.1` (objeto `62d1d7eea408fd2432e3e4bef88df2f0d9f760e4`) apunta a ese mismo commit. No se movió ni recreó tag. Tag y commit están en main.
- GitHub Actions run `43363693190`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. El maintainer aprobó manualmente el environment `fragments-production`; no se usó bypass. El release GitHub se publicó como ID `443806699` por `github-actions[bot]`. `fragments-images.tar.gz` (291,322,005 bytes) SHA-256 `8d15a3dc655090b6ca0212e1e04b104cf1fb9cbe143ef8da81533513d26595cb`; `release-manifest.json` SHA-256 `1c8bc7cdb31dec26138581a838977bd7d194b882cd03ef3ac0220e92b887c37c`.
- El agente pull aceptó el manifiesto: run, tag, SHA, workflow de referencia confiable y digest del archivo coinciden. Primer bloqueo reproducido: el servicio apply root no pertenecía a `fragments-release-request`, por lo que no podía leer el queue file 0640. Se corrigió solo el drop-in de la unidad dedicada `/etc/systemd/system/fragments-release-apply.service.d/10-fragments-release-request-access.conf`, con grupo suplementario y restauración de permisos del ledger en ExecStartPost; `systemd-analyze verify` pasó. La ruta de apply avanzó tras el ajuste.
- Bloqueo crítico actual: el agente no puede verificar la atestación de GitHub. En el entorno aislado del proceso se verificó que `gh attestation verify` falla con código 4 solicitando `GH_TOKEN` o `gh auth login`; el agente usa deliberadamente un `GH_CONFIG_DIR` vacío y no tiene una credencial de lectura ni bundle local. La publicación/atestación GitHub por sí misma sí pasó, pero esto no da al VPS prueba verificable offline. No se añadió credencial, no se desactivó la verificación y no se cargaron imágenes.
- Como el timer intentaba volver a descargar un paquete de 291 MB cada cinco minutos, se pausó reversiblemente `fragments-release-poll.timer` tras confirmar queue vacío, apply inactivo, ledger sin nueva release e imágenes no cargadas. `fragments-release-apply.path` continúa activo. Reanudar solo después de reparar y validar la verificación autenticada/offline de atestación. No hubo bypass ni despliegue manual.
- Docker VPS al 2026-11-13 04:35 UTC: API/web `healthy`, ARM64; imágenes `fragments-api:50e2ace-arm64` y `fragments-web:50e2ace-arm64`, revisión `50e2ace697afc125bb3bfdd9a705f0e383796a83`, etiqueta de versión de imagen `v0.3.0`; la imagen `sha-12b6e39...` no fue cargada. Origen `127.0.0.1:3001` y web pública sirven el bundle anterior (`index-Cmw4r12t.js`), no contienen v0.4.1 ni metadata/SHA nuevos. En consecuencia, **el release GitHub fue publicado, pero v0.4.1 no está desplegada y el release productivo no es exitoso**. Existe inconsistencia histórica entre release registrado `v0.3.1` y labels de imágenes productivas `v0.3.0`; no se alteraron para esta auditoría.
- Copia SQLite pre-release vigente, sin cambios: `/var/backups/fragments/fragments-pre-v0.4.1-20261113T040802Z.sqlite`, SHA-256 `fb16f0fd359bb32501757e4cf52d3b8c9d0ff77836770855d8e627a1c5b20ee2`, `root:root 0600`; integrity check `ok`, foreign key check 0, conteos coincidentes (proposals 261, revisions 261, mentor evaluations 212, control versions 2). Producción: journal WAL, integrity `ok`, migraciones 1–9, sin v10, mismos conteos. Ninguna migración productiva ejecutada ni base alterada.
- OAuth ID/secret están presentes en `/opt/fragments/deploy/production/.env` como variables privadas `root:root 0600` y Compose las pasa a API; no se imprimieron valores. No se verificó un intercambio de OAuth ni sesión válida Better Auth. F15 galería y rutas docentes no pueden declararse validadas en el build nuevo, que no está desplegado.
- Servicios vecinos: Pits development app y PostgreSQL healthy localmente. `pits.gavanti.org` respondió Cloudflare 502 a 04:35:55 UTC; no hay contenedor Pits productivo local ni listener en 8080. Registrado como incidencia independiente; no se modificó Pits, PostgreSQL ni Cloudflare. Fragments público HTTP 200 y responsive anterior a 390 px sin overflow horizontal; esto verifica el build viejo, no F15.
- Sin cambios de aplicación, SQLite, Pits, PostgreSQL, Cloudflare ni tags. Solo el drop-in dedicado reversible y la pausa temporal del timer de polling del agente de Fragments. Para completar falta una opción segura y verificable de lectura de atestaciones por el agente (credencial acotada/rotada provisionada fuera de GitHub, o rediseño confiable con bundle de atestación offline y nueva revisión de pipeline); después revalidar todo y reanudar el pipeline aprobado. No intentar otro despliegue manual.

## Recuperación con bundle Sigstore offline — 2026-11-13

- Commit local del agente y sus pruebas: `e7c2baea6be21cd9f05cac04178d2dabce1b6ebc`, rama `codex/f14-v041-agent-audit`, sin push. El cambio del workflow para bundles futuros sigue separado y sin integrar.

- Capacidad local comprobada con la misma GitHub CLI instalada en VPS, `gh 2.103.3`: `gh attestation download` obtiene el bundle asociado al archivo local mediante la sesión GitHub de operador. No se transmitió ni copió el token de operador. La acción `actions/attest` usada por el workflow fijado tiene el output `bundle-path` en el SHA `1e69f48acb82d1966a394da916b4c1698aa569d6`; GitHub CLI documenta `--bundle` y `--custom-trusted-root` para verificación offline. La metadata TUF se obtuvo con `gh attestation trusted-root`; las dos instancias TUF reportaron actualización y verificación correcta.
- Se reutilizó la copia existente en VPS para evitar otra descarga de 291 MB. SHA-256 del paquete: `8d15a3dc655090b6ca0212e1e04b104cf1fb9cbe143ef8da81533513d26595cb`, coincide con el manifiesto aprobado. SHA-256 del bundle: `6c066a4fc3943ffcd53e694742f1bda9d43f4454c6721b81677fa172c4c8ad84`. SHA-256 del trust root: `65ca537f6ed8a47fd0e560c421baa1f6c1efb8b25fc200d8c5c02c0e92eb2b9c`.
- Verificación real en estación y en VPS: `gh attestation verify` con configuración GitHub vacía, bundle local, trust root custom, repo, `--signer-workflow`, `--signer-digest`, `--source-ref`, `--source-digest` y `--deny-self-hosted-runners` devolvió exactamente una verificación. La certificación enlaza repo `VGMil-dev/fragments`, `.github/workflows/release.yml`, ref `refs/tags/v0.4.1`, SHA `12b6e39fbb64016ab0f56ea104fe9b384da688fa`, run `43363693190`, runner `github-hosted` y el SHA-256 esperado del paquete.
- Pruebas negativas sobre la atestación auténtica: archivo alterado, ref `v0.4.0`, workflow distinto y signer digest incorrecto rechazados por `gh` (exit 1). La suite del agente añade rechazos ante bundle vacío/digest erróneo, repo/workflow/ref/SHA/run incorrectos y runner self-hosted; cachea el tar solo cuando tamaño y digest coinciden. La verificación falla cerrada si no hay asset de bundle ni archivo local root-only.
- Solución local preparada: el agente usa bundle asset `fragments-images.attestation.jsonl` para releases futuros; para el histórico `v0.4.1`, busca el archivo provisionado root-only `/var/lib/fragments-release/attestations/443806699.jsonl`. Refresca el trust root por TUF con `GH_CONFIG_DIR` aislado y verifica el bundle sin token GitHub. El hash cacheado del tar se reutiliza en reintentos; los archivos parciales se acotan, protegen y limpian. El workflow futuro recoge el output `bundle-path`, lo verifica y publica el bundle junto con manifiesto y tar.
- Los dos archivos necesarios para la verificación offline se transfirieron por SSH a la ruta privada de Fragments, comprobando la clave conocida con `StrictHostKeyChecking=yes`: bundle `root:root 0600`, trust root `root:root 0600`, directorio `attestations` `root:root 0700`. Los temporales en `/home/ubuntu` se eliminaron. La VPS verificó el bundle sin `GH_TOKEN`/`GITHUB_TOKEN`; no se activó el agente ni se cargaron imágenes.
- Pruebas locales: Python 3.12, 14/14 tests del agente (simulación Windows con flock single-process simulado); `node --test` de scripts F14/metadata 5/5; parse sintáctico Python y `bash -n` correctos; verificación criptográfica real de `gh` en estación y VPS; pruebas negativas CLI 4/4; `git diff --check` sin errores. No se concluyó el check de formato YAML: `pnpm exec prettier --check` se canceló cuando pnpm empezó a materializar dependencias ya presentes en caché bajo `node_modules`; no hubo descargas de red ni se consideró resultado de validación.
- Límite de integración: `AGENTS.md` exige trabajar en rama, prohíbe push y exige PR/check obligatorio. Se preparan ramas locales en dos etapas para preservar la condición `verify_git_source`: primero integrar solo el soporte del agente y desplegar el tag cuyo workflow coincide hoy con `main`; solo después, integrar el cambio del workflow que agrega bundles a releases futuros. No abrir un PR que cambie el workflow antes del despliegue actual, pues haría que el control del agente rechace `v0.4.1` por diferencia entre el workflow histórico de la tag y el `main` nuevo.
- Estado final de esta recuperación: verificación criptográfica **completada**, deploy productivo **no realizado**. El código nuevo no está instalado ni pasó CI/PR; `fragments-release-poll.timer` sigue pausado, `apply.path` activo. API/web y SQLite conservan el estado previo ya documentado; Pits/PostgreSQL no se tocaron. No modificar assets ni recrear tags históricas.
- Cambio para publicar bundles futuros preparado aparte en la rama local `codex/f14-future-bundle-asset`, subordinada a la reparación del agente y al despliegue de `v0.4.1`. No integrar este cambio de workflow antes del tag histórico: el agente verifica que el workflow de la tag coincida con `origin/main`.
- Commit local del workflow de bundles futuros: `a2db359794dd2cdff0d5a0368682eeb18e3ec758` en `codex/f14-future-bundle-asset`, sin push. La rama secuenciada para PR del agente es `codex/f14-offline-agent-v041` (head en ese momento `382e86c6a618ec3fecf1c09c364ceed98a6fe7ba`); ninguna se ha integrado.

## Integración F14 y despliegue productivo v0.4.1 — 2026-11-13

- PR #15 (`fix(f14): verificar atestaciones offline con Sigstore`) publicó la rama mediante el conector GitHub, porque `AGENTS.md` prohíbe `git push`. Commit de cabeza `a2bef0367c8074a32a598f7d5254b3a12ebcd318`; check obligatorio `verify`, run `43373922570`: SUCCESS (tests, typecheck, lint y build incluidos). Merge normal, sin bypass: SHA `d9d2fba12e23117e638be4f49925c3ba50996fb5`.
- El `.github/workflows/release.yml` de `v0.4.1` sigue idéntico al de `main` después del merge; `v0.4.1` no se movió. La fuente del agente instalada corresponde al merge aprobado: SHA-256 `0f3e7f902720b3578b99e2b8a3d9ec577bf979748fc502e928824fcd6b757efa`, `root:root 0755`. Se conservó el script anterior en `/var/lib/fragments-release/agent-backups/`, `root:root 0600`. No se volvió a ejecutar el instalador inicial ni se modificaron los units endurecidos.
- En VPS Linux, copia temporal del agente instalado: `python3 -m unittest -v test_release_agent` — 14/14; `py_compile` pasó. `systemd-analyze verify` pasó, con avisos preexistentes de units XFS; `systemd-analyze security` mantuvo ambos units F14 en `2.4 OK`. En Windows, los mismos tests dieron 11/14 porque 3 escenarios de simulación requieren `fcntl.flock`; la suite Linux, entorno real del agente, sí pasó 14/14.
- Verificación criptográfica real desde la estación y el código instalado en VPS: `gh attestation verify --bundle --custom-trusted-root --deny-self-hosted-runners`, configuración `GH_CONFIG_DIR` vacía y sin `GH_TOKEN`/`GITHUB_TOKEN`. La atestación enlaza repo, workflow, tag `v0.4.1`, SHA `12b6e39fbb64016ab0f56ea104fe9b384da688fa`, run `43363693190`, runner hospedado y digest del paquete aprobado. La llamada Python de prueba inicial usó accidentalmente el ID de release en lugar del ID de workflow; al repetir con `43363693190`, pasó. El test negativo de `refs/tags/v0.4.0` fue rechazado. Bundle `root:root 0600`; trust root actualizado por TUF y `root:root 0600`; no se instaló token GitHub.
- Se reanudó `fragments-release-poll.timer` y se ejecutó `fragments-release-poll.service`. El poll agregó únicamente el release ID `443806699`, tag `v0.4.1`; `fragments-release-apply.service` terminó `Result=success`, `ExecMainStatus=0`. Ledger `/var/lib/fragments-release/ledger.json`: entrada `v0.4.1`, commit exacto, release ID correcto, estado `deployed`, backup `integrity=ok`. Cola vacía; timer y `fragments-release-apply.path` activos. El paquete de 291 MB se reutilizó por tamaño y SHA-256 coincidentes.
- Antes de aplicar se creó `/var/backups/fragments/fragments-2026-11-13T05-49-23-475Z.sqlite`, `root:root 0600`, SHA-256 `3d74f9b0722a035a256057e4848ebcbc7dbc9120b6a0482912efcafdc2fd7ed4`, `integrity_check=ok`, 0 violaciones FK. El agente creó y registró el backup más reciente `/var/backups/fragments/fragments-2026-11-13T05-53-47-732Z.sqlite` con el mismo SHA e integridad. La base productiva pasó de migraciones 1–9 a 1–10; integridad `ok`, 0 violaciones FK. Comparando las columnas históricas iguales entre el snapshot previo y SQLite migrada: propuestas 261/261, revisiones 261/261, evaluaciones 212/212 y versiones de rúbrica 2/2, digest exacto coincidente en las cuatro tablas. Hay 261 propuestas históricas sin propietario nuevo; la tabla de publicaciones académicas quedó vacía. No se restauró SQLite.
- API y web ARM64 `fragments-api:sha-12b6e39fbb64016ab0f56ea104fe9b384da688fa` y `fragments-web:sha-12b6e39fbb64016ab0f56ea104fe9b384da688fa`, labels de versión `v0.4.1`, revisión exacta `12b6e39fbb64016ab0f56ea104fe9b384da688fa`, ambas `healthy`. Local Fragments HTTP 200; landing pública cargó `v0.4.1`. En el DOM, el indicador muestra la versión y expone el SHA completo en `title`/`aria-label`; no muestra el SHA corto como texto visible. A 390 px no hubo overflow horizontal en landing ni login.
- Servicios vecinos verificados tras el apply: `pits-development-app-1` y `pits-development-postgres-1` siguieron saludables y el agente comparó los contenedores vecinos antes/después sin cambios. `pits-dev` HTTP 200. `pits.gavanti.org` sigue devolviendo HTTP 502, incidencia pública previa separada; no se modificaron Pits, PostgreSQL ni Cloudflare.
- OAuth: `.env` persistente permanece `root:root 0600`; Compose renderizado confirma par Client ID/Secret no vacío, secreto Better Auth y URLs `https://fragments.gavanti.org` en el servicio API. Tras recrear API, Docker confirma las dos variables OAuth presentes. El callback normal volvió a Better Auth con `account_not_linked`; no se creó sesión (`GET /api/auth/get-session`: 200, `valid=false`). No se repitió el callback ni se modificó la vinculación implícita. La galería y los endpoints docentes respondieron 401 sin sesión; el UI muestra la pantalla de autenticación y no datos. Login OAuth válido, galería autenticada y panel docente quedan pendientes de una cuenta de prueba autorizada que no colisione con una cuenta existente.
- Se detectó que la base de trabajo Windows marcó tres simulaciones como error por falta de `fcntl`; se validó la suite completa en Linux VPS antes del despliegue. Ninguna prueba automatizada ejecutó código estudiantil ni hizo llamadas IA.

## Estado de bundles futuros

- PR #16 publicó `fragments-images.attestation.jsonl` en releases futuros y revalida el bundle en el job protegido. Check `verify`, run `43375995436`: SUCCESS; merge normal SHA `8990d37414d20c33f5dcfab40d5f11fb71c1ccca`. No se añadió ningún trigger alternativo. El cambio se integró después de confirmar la aplicación de `v0.4.1`.
- Al merge de PR #15, el workflow aún coincidía con el de la tag y el agente aplicó `v0.4.1`. PR #16 modificó intencionadamente el workflow de `main` **después** del despliegue; el workflow y assets históricos de `v0.4.1` permanecen intactos. Las próximas tags construirán con el workflow nuevo que adjunta el bundle.
- Estado final consultado por `git fetch origin main`: `origin/main` `8990d37414d20c33f5dcfab40d5f11fb71c1ccca`; el commit de PR #16 está contenido. No hubo otra tag, build de release ni despliegue. El timer de polling y el path de Fragments siguen activos. F14 queda completada con evidencia productiva; F15 conserva el bloqueo de OAuth real descrito en su evidencia.
- Después del cierre F14, PR #18 integró una mejora F13 del indicador a `main` (merge normal `ffb647706782c8bf3942e7793b117ec3d870d527`, `verify` run `43376992320` SUCCESS). Esta integración solo prepara el próximo build: no cambia la tag ni las imágenes `v0.4.1`; timer y producción permanecen en el estado verificado.

## Hotfix del pin de `upload-artifact` — 2026-11-13

- Release fallido `v0.4.2`: tag anotada, objeto `a8fd693f6d73366e04b063d30ba2b8c69d22a04c`, commit autorizado `da12119046244072b6bf2e66941ac87a6c995fd3`. En run `43453312671`, `verify-build` pasó tests, typecheck, lint, build, verificación de metadata y build ARM64. `attest-package` falló en `Set up job`; el error reportó que `actions/upload-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093` no se pudo resolver. El job protegido fue omitido; no se creó el release ni se desplegó.
- Se verificó cada pin de `.github/workflows/release.yml` contra el endpoint de commits del repositorio oficial correspondiente: checkout `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`; pnpm `pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1`; Node `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`; upload `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`; download `actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093`; attest `actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6`. La API oficial resolvió los seis commits exactos. El SHA `d3f86a…` corresponde a `download-artifact` v4.3.0, no a `upload-artifact`.
- Rama `codex/f14-fix-upload-artifact-pin`, creada desde `origin/main` `da12119046244072b6bf2e66941ac87a6c995fd3`; commit de código `4a5db5353dbbd2f01e977b07036fe6af77a4605b`. En el paso de publicar el bundle offline, el pin de `upload-artifact` se corrigió a `ea165f8d65b6e75b540449e92b4886f43607fa02`; las referencias correctas de `download-artifact` y los demás controles F14 no cambian.
- Se añadió una regresión que coteja todas las líneas `uses:` con un mapa por repositorio oficial y SHA completo, incluida la correspondencia separada upload/download. Antes del arreglo, la prueba falló específicamente al asignar el SHA de `download-artifact` a `upload-artifact`; después, `node --test deploy/production/release-agent/test-release-agent-scripts.mjs` pasó 5/5. `node --check` y `git diff --check` pasaron.
- `node --test deploy/production/release-agent/test-turbo-release-metadata.mjs` pasó 1/1 en copia Git aislada: tag ficticia `v99.98.97`, commit de fixture válido y dos bundles verificados con metadata exacta. No creó tags en el repositorio.
- La modificación YAML es una sustitución del valor `uses:` en el mismo paso e indentación; la prueba estructura trigger, entorno protegido, atestación y pins por acción. La sintaxis final queda también sujeta al check `verify` del PR.
- PR #23 se integró por merge normal: rama `codex/f14-fix-upload-artifact-pin`, cabeza `fbf96e9a873e568da3022d5e3e75a86203df5524`, check obligatorio `verify` SUCCESS en run `43462324919`; SHA del merge `858e9a7a8401427bf3812c74c106f3e9c3c2c97d`. La regresión, la prueba Turbo de metadata y tests/typecheck/lint/build pasaron en CI.
- Revalidación posterior al merge: `origin/main` fue `858e9a7a8401427bf3812c74c106f3e9c3c2c97d`, contiene el commit del arreglo, y el workflow presenta `upload-artifact@ea165f8…` para ambos uploads y `download-artifact@d3f86a…` para los downloads. La tag histórica `v0.4.2` conserva el objeto anotado y peeled SHA anteriores. `v0.4.3` no existía al comprobarlo.
- No se volvió a ejecutar el pipeline fallido: el workflow F14 de `v0.4.2` es inmutable y no debe reutilizarse; tampoco se publicó release ni se hizo despliegue. No se modificó producción, SQLite, Pits, PostgreSQL ni Cloudflare. La candidata `v0.4.3` requiere autorización específica y debe usar el SHA exacto de `main` tras integrar cualquier documentación final.

## Despliegue v0.5.10 — 2026-11-22

- Autorización nocturna F14 consultada en Notion: release anotado y despliegue autónomo por el flujo normal, manteniendo gates técnicos; sin bypass ni cambios a infraestructura.
- Tag anotada `v0.5.10` → commit `818b9c39acb739d272ae27ce234114b650ab3787` (merge PR #90). Workflow `45033466925`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Release creado con atestación, paquete de imágenes y manifiesto.
- Environment `fragments-production` verificado de solo lectura: 0 required reviewers, sin wait timer; reglas de ramas intactas.
- Apply reportado exitoso por agente F14: imágenes API y web fijadas al SHA `818b9c3`, backup previo SHA-256 `4c86afb2c3100166dcc3fb4dd48bc5fefcb098d1269f38fa3ef2e0d5d0c625f4`, healthchecks sanos y `/health` DB ready. No se apagó producción ni se ejecutó despliegue manual.

## Despliegue v0.5.11 — 2026-11-22

- PR #95 integró el hotfix F18.B en `main`; SHA `a3c189f041694ccf898f208de41a51c36ad41a04`. CI `45037887441` SUCCESS. Rama de documentación verificada sobre ese SHA.
- Antes de etiquetar se consultó el environment `fragments-production` en modo solo lectura: `reviewers_count=0`, `wait_timer=null`; políticas de rama preservadas. La tag anotada `v0.5.11` apunta exactamente a `a3c189f041694ccf898f208de41a51c36ad41a04`; publicación normal sin bypass.
- Workflow F14 `45038131003`: `verify-build`, build ARM64, `attest-package` y `publish-approved-release` SUCCESS. Release publicado con atestación, artefacto de imágenes y manifiesto.
- Verificación pública: `https://fragments.gavanti.org/health` respondió `status=ok`, `database=ready`; bundle servido reporta `v0.5.11` y SHA exacto `a3c189f041694ccf898f208de41a51c36ad41a04`.
- Alcance de verificación: el agente supervisor no halló canal disponible de solo lectura para consultar ledger del host, hash del backup o labels de imágenes; estos tres datos son **NO COMPROBADOS**. No se usó SSH, no se leyó ninguna llave, no se detuvieron servicios y no se tocó configuración productiva.
- Política F14 vigente: `Required reviewers` permanece desactivado exclusivamente; el entorno `fragments-production` se conserva y todos los gates técnicos de build, firma/atestación, backup, healthchecks y rollback siguen siendo obligatorios. No introducir aprobación humana en futuras features salvo autorización explícita del propietario.

## Release v0.5.12 — 2026-11-22

- PR #99 integró F22.2 en `main`; merge SHA `613c02f71129a1f0bb417a5e602ff631fc1de42c`. Tag anotada `v0.5.12` apunta al SHA exacto.
- Antes del tag se comprobó `fragments-production` de solo lectura: cero reviewers requeridos, sin wait timer; reglas de rama/gates no se tocaron.
- F14 run `45042723696`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Se validó el tag/SHA exactos, pruebas/migración/restore en base efímera, metadata, build ARM64, atestación GitHub/Sigstore y publicación del paquete al flujo aprobado.
- Producción verificada desde público: `/health` → `status=ok`, `database=ready`; página 200 y bundle `/assets/index-C1smlPXh.js` contiene `v0.5.12` y SHA `613c02f71129a1f0bb417a5e602ff631fc1de42c`.
- GET anónimo a `/api/admin/classroom-requests` → `401 AUTH_REQUIRED`, sin campo `items`. No se usó una sesión docente/estudiante ni se escribieron matrículas.
- **NO COMPROBADO:** ledger del host, digest del backup previo, labels Docker, sesión admin real y audit event observado en stdout productivo. Health y bundle confirman disponibilidad/version, pero no sustituyen esos checks. No se intentó SSH ni se modificó infraestructura.

## Release y aplicación v0.5.14 — 2026-11-22

- PR #108 se integró normalmente como `d40817ad2e62d1d9971fccbef5b878543307f9e9`, CI `45052607454` SUCCESS. La tag anotada `v0.5.14` apunta al SHA exacto de `origin/main`.
- Environment `fragments-production`: cero revisores, sin wait timer; consultado solo lectura. No se cambió el environment ni gates técnicos.
- F14 run `45052895014`: `verify-build`, pruebas contra DB disposable, build/metadata, ARM64 y `attest-package` SUCCESS; `publish-approved-release` SUCCESS. Release incluye paquete, manifiesto y attestation.
- Después del sondeo normal del agente pull, el bundle productivo `/assets/index-C8xxczOG.js` contiene `v0.5.14`, SHA exacto `d40817ad2e62d1d9971fccbef5b878543307f9e9` y `/admin/audit-log`. `GET /health`: `status=ok`, `database=ready`. GET anónimo a `/api/admin/audit-log?limit=1`: `401 Unauthorized`, `Cache-Control: no-store`.
- Release aplicado verificado por bundle y API pública; no se apagó producción ni se usó despliegue manual. Ledger del host, digest del backup previo, labels Docker, sesión admin y eventos productivos siguen NO COMPROBADOS.

## Release y aplicación v0.5.16 — 2026-11-22

- PR #115 (F22.6) y PR #116 (F18.B) se integraron por merge normal; `main` quedó en `23528bccfb256dabaa3d6317a36138ad6f0edbd6`. CI #45060021130 y #45060350800 SUCCESS; revisiones independientes PASS.
- Preflight de solo lectura: `fragments-production` conservó la política de rama; la API devolvió solo `branch_policy` (sin reviewers ni wait timer). Los gates técnicos y el agente pull no se modificaron. La tag local/remota `v0.5.16` es anotada; objeto `2472d624fcb7a77d1866aa183753d927390921ba`, peeled commit exactamente `23528bccfb256dabaa3d6317a36138ad6f0edbd6`.
- F14 run `45060644194`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Validó tag/SHA/main, PostgreSQL disposable, backup/restore, release-agent, pruebas/typecheck/lint/build, imágenes ARM64, atestación Sigstore y publicación normal de paquete/manifiesto.
- Tras el sondeo del agente pull, el bundle público cambió a `/assets/index-B5aKBWSl.js`, con versión `v0.5.16` y commit corto `23528bc`; incluye `/admin/teachers`, filtro de eventos y enlace de aula a habilidades. `/health` respondió `status=ok`, `database=ready`. GET anónimo `/api/admin/teachers?limit=1` → 401 sin datos.
- Ego Lite existente: docente abrió el catálogo desde el aula y volvió; estudiante conservó matrícula activa sin habilidades/misiones. Páginas permanecieron abiertas y no se guardaron recursos. No hubo deploy manual, SSH, reinicio ni cambios de infraestructura.
- Ledger/backup hash/labels del host, sesión admin real, cuentas y eventos del feed siguen NO COMPROBADOS. El flujo real de misión/Mentor/provider tampoco se valida con el aula actual sin habilidades/misiones.

## Release y aplicación v0.5.17 — 2026-11-22

- PR #119 y PR #120 se integraron normalmente; PR #121 consolidó evidencia y checklist. Main final: `bb6e70532e26ac71aaf31543b20413040d7bc581`.
- Preflight de solo lectura: `fragments-production` mantuvo su regla de rama, con `reviewers=null`; tag remota v0.5.17 inexistente antes de publicar. Se creó tag anotada `v0.5.17`, objeto `640c285a82214da5e4694da478fbc4a4e29c2b16`, peeled SHA exactamente `bb6e70532e26ac71aaf31543b20413040d7bc581`; push normal.
- F14 run `45065509688`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; validación de tag/SHA/main, PostgreSQL disposable, backup/restore, pruebas/typecheck/lint/build, imágenes ARM64, atestación y publicación del paquete/manifest.
- El sondeo normal `fragments-release-poll.timer` ejecutó success a las 20:26:40 UTC y activó el aplicador. `fragments-release-apply.service` terminó `Result=success` a las 20:28:45 UTC. Sin invocación manual ni reinicio de servicio por el coordinador.
- SSH read-only confirmó `fragments-web-1` y `fragments-api-1` en imagen `sha-bb6e705...`, ambos healthy. GET público `/health` → `ok`, database `ready`; bundle `/assets/index-BkvVCLOV.js` confirma `v0.5.17`, historial de misiones y mensajes 401/403 de feed, diagnósticos y cuentas docentes.
- Ego Lite docente en las tres vistas admin muestra denegación 403 segura, sin filas ni detalle backend; no se intentó acceso admin. El aula sigue sin misiones, por lo que historial visual y flujo misión→Mentor quedan NO COMPROBADOS. Cero eventos admin allowlisted en la ventana de 20m observada; sesión admin, eventos reales, ledger/hash backup/labels y liveness de worker separado siguen NO COMPROBADOS.
- Required reviewers continúa desactivado; entorno y gates F14 preservados. No se escribieron datos académicos ni se apagó producción.

## Release y aplicación v0.5.18 — 2026-11-22

- PR #123 (F22.9) y PR #124 (evidencia) integrados normalmente; main exacto `214fb1344816172ecc52c99de5e7351508d77324`. CI de código `45067784339` y CI de evidencia `45068097463` SUCCESS.
- Preflight de solo lectura: `fragments-production` conserva branch policy, `reviewers=null`; tag v0.5.18 ausente antes de publicación. Tag anotada objeto `d3fc6f31442ec897ed4c5faaa117373ccebccf79`, peeled SHA exacto `214fb1344816172ecc52c99de5e7351508d77324`.
- Run F14 `45068388150`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; paquete, manifiesto y attestation publicados. No hubo aprobación humana adicional.
- El sondeo normal del agente pull y aplicador terminó success (20:53 y 20:55 UTC). SSH read-only vio web/api healthy en imagen `sha-214fb...`; `/health` público `ok`, DB `ready`; el bundle `/assets/index-QEJ8Q_ES.js` confirma v0.5.18 y los nuevos mensajes de cola/solicitudes.
- Ego Lite read-only en sesión docente: `/admin/queue` y `/admin/requests` presentan el 403 específico, sin tabla ni filas. No se hizo login admin ni escrituras; sesiones docente/admin permanecen abiertas/restauradas.
- La afirmación histórica previa de revisión manual en la configuración inicial F14 fue superada por la decisión aprobada y cambio de configuración ya verificados: `Required reviewers` OFF. El entorno y todos los gates técnicos F14 se mantienen; no volver a habilitar revisión humana. Ledger/hash del backup/labels del host, sesión admin, datos/eventos y worker independiente continúan NO COMPROBADOS.

## Release y aplicación v0.5.19 — 2026-11-22

- PR #126 integrado mediante merge normal como `af8e6b4764b58ffa299ef7f1b85dfd674318c6ee`; su head final fue `883675206581cfddb9eaf1a1e6ca8946705fc9fd`; CI `45071108105` PASS, revisión independiente PASS. No hubo cambios posteriores al SHA integrado antes de etiquetar.
- Preflight read-only: `origin/main` coincide con el SHA de la release, la tag remota `v0.5.19` no existía, `fragments-production` conserva el patrón de tag `v*.*.*`, Required reviewers=0 y wait timer=0. Tag anotada objeto `aaed354081758b16ca927004725c38dfaf774b88`, peeled SHA `af8e6b4764b58ffa299ef7f1b85dfd674318c6ee`.
- F14 run `45071360770`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Pasaron base PostgreSQL desechable, backup/restore, suites, typecheck/lint/build, verificación bundle, ARM64 y atestación. Paquete, manifest/attestation y pull queue publicados.
- El timer normal del agente pull sondeó la cola; el servicio aplicador concluyó `Result=success` y los contenedores cambiaron automáticamente a `sha-af8e6b4764b58ffa299ef7f1b85dfd674318c6ee`, ambos healthy. No se hizo pull, restart ni invocación manual.
- Público: `/health` devuelve `status=ok`, `database=ready`; home 200, bundle `/assets/index-BgnTqOr6.js` contiene versión y SHA exactos y los textos “Reintentar misiones”/“Reintentar habilidades”. Sin escrituras productivas ni parada de servicios.
- Environment/gates F14 conservados; no revisión humana. Ledger/hash backup/labels, sesión admin, eventos reales y worker separado continúan NO COMPROBADOS.

## Release y aplicación v0.5.20 — 2026-11-22

- PR #128 se integró normalmente como merge de `main` `1041d1af3f949a13671d761ee96a59c52d2a1d78`; CI final `45074239987` SUCCESS. Tag anotada `v0.5.20` objeto `67483ab021a0b30970ec7ba5a4b1892e0e088a37`, apunta al SHA exacto de `main`.
- F14 run `45074528240`: `verify-build`, pruebas/build de la fuente etiquetada, PostgreSQL disposable y restore, build ARM64, `attest-package`/Sigstore y `publish-approved-release` SUCCESS.
- Aplicación automática verificada desde el sitio público: `/health` status `ok`, database `ready`; `/assets/index-DQ4oYmnp.js` contiene versión `v0.5.20` y el SHA exacto. No se realizó deploy manual, SSH, reinicio ni cambio de infraestructura.
- `Required reviewers` sigue OFF según decisión F14; no se alteró configuración del entorno. Ledger/archivo y hash de backup/labels del host NO COMPROBADOS.
- Commit de reconciliación de evidencias: `303f2c824670d2bc1100f305a08bde4507b5f876`; integrado en PR documental #129 como `f324469c5959c368c920e9c0c24bf12fca60f6a7`, CI `45075978694` SUCCESS.
- Estado de integración registrado en `beedba8acaf86e62ccd9fd2d8c9326dc327544c2`.

## Release y aplicación automática v0.5.24 — 2026-11-23

- La tag anotada `v0.5.24` apunta al merge exacto de PR #141: SHA `073819c31881fd1ae3513bf72a7afe322e5051e6`. No se etiquetó el PR #140 posterior porque contiene solo pruebas/helper sin lógica runtime.
- F14 run `45090388470` terminó SUCCESS en `verify-build`, construcción ARM64, `attest-package` y `publish-approved-release`; firmó y publicó el paquete para el pull queue.
- El timer normal sondeó a 00:52 UTC; `fragments-release-apply.service` terminó `Result=success` a 00:54 UTC. SSH read-only confirmó API/web healthy en `sha-073819c`; `/health` del origen dio `status=ok`, `database=ready`.
- Verificación pública cache-bypass: `/health` devuelve `ok/ready`; bundle `/assets/index-C_-XL4FG.js` contiene `v0.5.24` y el SHA completo exacto.
- No se ejecutó deploy manual ni reinicio; entorno `fragments-production` y controles técnicos F14 permanecieron intactos. El ledger/hash del backup previo y etiquetas de host no se releen ni exponen en esta actualización; continúan NO COMPROBADOS.

## Release y aplicación automática v0.5.25 — 2026-11-23

- PR #143 integrada normalmente como `52917ec6fcba790f487a7d2f9807c3c52927400d`; tag anotada `v0.5.25` apunta al SHA exacto de main. Preflight confirmó tag nueva y `fragments-production` conserva solo su branch policy, sin reviewers.
- F14 run `45092884337`: verify-build, pruebas, typecheck, lint, build metadata, ARM64, atestación Sigstore y publicación del paquete al pull queue terminaron SUCCESS.
- Timer normal ejecutó el pull y el aplicador F14 terminó success; SSH read-only confirma web/API healthy en `sha-52917ec`. Verificación pública cache-bypass: `/health` `ok`, DB `ready`; bundle `/assets/index-Iviv3wW8.js` contiene `v0.5.25` y SHA completo exacto.
- Sin despliegue manual, reinicio manual ni cambio de gates. `Required reviewers` sigue OFF. Hash del backup previo y labels de imágenes del host siguen NO COMPROBADOS.

## Release y aplicación automática v0.5.26 — 2026-11-23

- PR #146 integrada normalmente en `1aa0690fa2573d18cd2fa46c2a5780833e523bb5`; tag SemVer anotada `v0.5.26` apunta a ese SHA exacto de `main`.
- Run F14 `45095642953`: `verify-build`, PostgreSQL desechable y backup/restore, suites/typecheck/lint/build, bundle, ARM64, Sigstore y `publish-approved-release` terminaron SUCCESS.
- El servicio aplicador normal terminó `Result=success`, `ExecMainStatus=0`; no se ejecutó despliegue manual ni reinicio.
- Verificación pública cache-bypass: `/health` `ok`, database `ready`; `/assets/index-CyC9Ismb.js` contiene `v0.5.26` y SHA exacto `1aa0690fa2573d18cd2fa46c2a5780833e523bb5`.
- `Required reviewers` OFF; entorno `fragments-production` y gates técnicos F14 intactos. Hash backup previo y labels de imágenes del host siguen NO COMPROBADOS.

## Release y aplicación automática v0.5.27 — 2026-11-23

- PR #148 integrada mediante merge normal en `6a7740d948b3a07c63396097e9400494cdfba0fb`; tag SemVer anotada `v0.5.27` apunta a ese SHA exacto de `main`.
- F14 run `45099728508`: `verify-build`, PostgreSQL desechable, backup/restore, pruebas/typecheck/lint/build, verificación de bundle, ARM64, atestación Sigstore y `publish-approved-release` terminaron SUCCESS.
- El timer normal sondeó a las 02:28:08 UTC; `fragments-release-apply.service` terminó a las 02:30:10 UTC con `Result=success`, `ExecMainStatus=0`. No se realizó deploy manual ni reinicio.
- SSH solo lectura verificó `fragments-api-1` y `fragments-web-1` `running/healthy`, ambos en imagen `sha-6a7740d948b3a07c63396097e9400494cdfba0fb`. Verificación pública cache-bypass: `/health` `status=ok`, `database=ready`; bundle `/assets/index-32veZvDP.js` contiene `v0.5.27`, SHA exacto y `/admin/mentor-events`.
- `fragments-production` conservó el flujo F14 y no requirió aprobación manual. No se alteraron sus controles técnicos. Eventos Mentor reales, acceso admin autenticado, rotación y hash del backup siguen NO COMPROBADOS.

## Release y aplicación automática v0.5.30 — 2026-11-23

- PR #154 se integró mediante merge normal en `863dd4fde725a038fd2a181f985d504bc0a8ad83`; la tag anotada nueva `v0.5.30` apunta a ese SHA exacto de `main`. La versión previa era `v0.5.29` y la tag no existía.
- F14 run `45114325986`: `verify-build`, pruebas/typecheck/lint/build, build ARM64, atestación Sigstore y `publish-approved-release` terminaron SUCCESS. El release publicado contiene `release-manifest.json`, `fragments-images.tar.gz` y `fragments-images.attestation.jsonl`.
- El timer normal se ejecutó a las 05:01:08 UTC; `fragments-release-apply.service` quedó `Result=success`, `ExecMainStatus=0`. No se invocó un deploy manual ni se detuvo producción.
- Verificación pública cache-bypass: `/health` devolvió `ok` y `database=ready`; el bundle `/assets/index-DGKk1qQh.js` contiene `v0.5.30` y el SHA completo exacto `863dd4fde725a038fd2a181f985d504bc0a8ad83`.
- No se modificó el entorno ni los gates técnicos F14. Hash del backup previo y labels de imágenes del host continúan NO COMPROBADOS.

## Release y aplicación automática v0.5.31 — 2026-11-23

- PR #157 se integró mediante merge normal en `376bb94bb9961b11cd9e70c4e8e5c43e0d67539a`; la tag anotada `v0.5.31` apunta al SHA exacto de `main`.
- F14 run `45119521437`: `verify-build`, `attest-package` y `publish-approved-release` terminaron SUCCESS.
- El aplicador automático `fragments-release-apply.service` terminó `Result=success`, `ExecMainStatus=0` (05:50:30 UTC). SSH fue de solo lectura; no se usó deploy manual ni se reinició producción.
- API y web estaban `running/healthy` en imágenes con SHA `376bb94bb9961b11cd9e70c4e8e5c43e0d67539a`; healthcheck del origen en puerto 3001 respondió 200.
- Salud pública cache-bypass: `/health` respondió 200 con `status=ok`, `database=ready`. Bundle `/assets/index-BWzdK7A_.js` respondió 200 y contiene `v0.5.31` y el SHA completo exacto.
- Entorno `fragments-production` y gates técnicos F14 conservados. Hash/retención del backup y labels host siguen NO COMPROBADOS.
- Sin interrupción de producción. Se confirmó la aplicación del artefacto; esto no valida el recorrido académico completo ni la estabilidad para piloto.

## Release y aplicación automática v0.5.32 — 2026-11-23

- PR #160 se integró mediante merge normal en `42b0539e8ae010a9e24228bcdb74c10eb4983635`; la tag anotada `v0.5.32` apunta al SHA exacto de `main`.
- F14 run `45123596403`: `verify-build`, `attest-package` y `publish-approved-release` terminaron SUCCESS. El release `v0.5.32` se publicó a las 06:26:33 UTC.
- El timer normal sondeó a las 06:30:30 UTC; el aplicador automático reportó `release_deployed`, `Result=success`, `ExecMainStatus=0` y finalizó a las 06:32:24 UTC. Sin deploy manual, reinicio solicitado ni pausa de producción.
- El ledger del agente registró `v0.5.32`, release `455059507`, SHA `42b0539e8ae010a9e24228bcdb74c10eb4983635`, estado `deployed`. El evento de apply informó imágenes API/web con ese SHA.
- Verificación pública cache-bypass: `/health` respondió 200 (`status=ok`, `database=ready`); bundle `/assets/index-CXzLlLHM.js` respondió 200 y contiene `v0.5.32` y el SHA completo exacto.
- Entorno `fragments-production` y controles técnicos F14 se conservaron. El apply registró un hash de backup; su integridad/retención y una restauración independiente no se comprobaron en esta verificación. Esto no valida el recorrido académico completo ni la estabilidad para piloto.

## Release y aplicación automática v0.5.33 — 2026-11-23

- Tag anotada `v0.5.33` apunta a `main` SHA `f256b6a02c54891040e1f4ba3591c2f85eea2c75`, que incluye PR #162 (F22), #164 (F18.B) y #165 (F25). F14 run `45126688900`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; release publicado a las 06:54:20 UTC.
- El timer normal encoló release `455078583` a las 06:57:20 UTC. `fragments-release-apply.service` terminó `Result=success`, `ExecMainStatus=0` a las 06:59:09 UTC. No hubo deploy manual, parada de producción ni cambio de gates.
- Ledger verificó tag, SHA, release ID y estado `deployed`. API y web aparecen `running/healthy` con imágenes `sha-f256b6a02c54891040e1f4ba3591c2f85eea2c75`.
- Comprobación pública cache-bypass: `/health` 200 (`status=ok`, `database=ready`); bundle `/assets/index-uKrjHQQz.js` contiene v0.5.33, SHA exacto, la acción «Reintentar carga de misiones» y el evento admin `admin.mentor_events.read`.
- `fragments-production` y controles técnicos F14 siguen activos. Apply registró un hash de backup; integridad/retención independiente de ese backup no comprobada. Ningún despliegue por sí solo valida un piloto académico.

## Release y aplicación pública v0.5.34 — 2026-11-23

- PR #169 se integró mediante merge normal en `main` como `5ab32afde23e7ed29724a757ce7a064c3b40704b`; CI del PR `45134521042` SUCCESS. La tag anotada `v0.5.34` apunta al SHA exacto.
- F14 run `45134914694`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; paquete, manifiesto y atestación publicados como release `v0.5.34` a las 08:02:35 UTC.
- Aplicación productiva comprobada públicamente después de la publicación: `/health` HTTP 200, `status=ok`, `database=ready`; bundle `/assets/index-CZSFpu9d.js` contiene `v0.5.34` y el SHA completo `5ab32afde23e7ed29724a757ce7a064c3b40704b`.
- No se hizo deploy manual, reinicio ni se cambió el workflow/entorno. F14 gates y agente pull se conservaron. El hash/integridad/retención del backup y la inspección del ledger/host no se verificaron en esta comprobación.

## Release y aplicación pública v0.5.35 — 2026-11-23

- PR #172 se integró mediante merge normal como `befbc7c3116bf9df2a33f5d344bbb7040b806939`; CI run `45139615945` PASS. La tag anotada nueva `v0.5.35` apunta al SHA exacto de `origin/main`.
- F14 run `45140042384`: `verify-build`, `attest-package` y `publish-approved-release` SUCCESS; la validación confirmó tag anotada, SHA exacto y ascendencia en `main`. Release publicó `fragments-images.tar.gz`, `release-manifest.json` y `fragments-images.attestation.jsonl`.
- Verificación pública posterior: `/health` HTTP 200 (`status=ok`, `database=ready`); bundle `/assets/index-B3UmVzeh.js` incluye `v0.5.35` y SHA `befbc7c3116bf9df2a33f5d344bbb7040b806939`.
- Se conservaron entorno `fragments-production`, workflow, agente pull y controles técnicos. No hubo deploy manual, parada, reinicio, migración ni cambio de infraestructura. Integridad/retención del backup de esta release y estado interno del ledger quedan NO COMPROBADOS.

## Release y aplicación pública v0.5.36 — 2026-11-23

- PR #176 se integró normalmente como `cf2edb14ad97fda4b07a87e806d3ae9e3191e1be`; CI del PR `45151950478` SUCCESS. Tag anotada `v0.5.36` apunta al SHA exacto de `main`.
- F14 run `45153003708`: validación de tag/SHA/main, tests, typecheck, lint/build, metadata del bundle, PostgreSQL desechable y restore, imágenes ARM64, atestación Sigstore y publicación a la cola protegida terminaron SUCCESS.
- Health público previo: HTTP 200 `ok/ready`. Durante la ventana de aplicación automática, una lectura pública devolvió HTTP 502; la siguiente observación volvió a HTTP 200 `ok/ready`, y el bundle `/assets/index-CCBddJ1x.js` confirmó `v0.5.36` y el SHA completo exacto.
- Sin invocación manual, reinicio solicitado, pausa ni cambio de infraestructura. Se conservaron el entorno `fragments-production`, el workflow, el poller y todos los gates técnicos. Ledger del host e integridad/retención independiente del backup NO COMPROBADOS.

## Release automática v0.5.46 · 2026-11-23

- PR [#200](https://github.com/VGMil-dev/fragments/pull/200) merge normal en `main`, SHA exacto `f5c4e0d6750e327599b80a06d19ac4e42d67e219`; CI PR `45233169921` PASS. Tag anotada `v0.5.46` apunta a ese merge.
- F14 run [`45233695756`](https://github.com/VGMil-dev/fragments/actions/runs/45233695756): `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. Incluye validación tag/SHA/main, tests, typecheck/lint/build, bundle metadata, PostgreSQL disposable con round-trip backup/restore, imágenes ARM64 y atestación Sigstore.
- El poller/aplicador automático aplicó la release sin deploy o reinicio manual ni cambios de `fragments-production` o sus gates. Health público HTTP 200 (`ok`, `database=ready`); bundle `/assets/index-Dt-RQvqU.js` contiene `v0.5.46` y SHA exacto.
- Ego Lite 320/390/768/1024/1440 confirma Dashboard sin overflow, sin escrituras. La CTA de misión quedó oculta por un borrador prioritario y esa ruta productiva permanece NO COMPROBADA.
- Hash/retención/integridad independiente del backup del host, ledger y labels de imágenes del host siguen NO COMPROBADOS.

## Release Pixel Night `v0.5.42` — 2026-11-23

- PR #190 se integró por merge normal: `e184280f992f9b4a90603fbc4dd79c856ddf38a2`; CI PR run `45193340720` SUCCESS.
- Se consultó `fragments-production`: solo regla `branch_policy`; no tenía revisores requeridos ni temporizador. La tag remota no existía. Tag anotada `v0.5.42`, objeto `5eed3047f8c91ee2c1ee4a913726996ea7fe260b`, apunta exactamente al merge de `main`.
- Run F14 `45193941563` SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`. Verificó tag/SHA, PostgreSQL disposable, backup/restore, pruebas/typecheck/lint/build, metadata, imágenes ARM64, atestación Sigstore y publicación del paquete.
- Aplicación observada mediante el pull agent y endpoints públicos: `/health` HTTP 200 `ok`, DB `ready`; bundle `/assets/index-yKTmZzCk.js` contiene `v0.5.42` y SHA `e184280f992f9b4a90603fbc4dd79c856ddf38a2`. No se ejecutó despliegue/aplicador manual.
- Ego Lite comprobó Mentor, Dashboard y Trainer en las sesiones ya abiertas, sin guardados, evaluaciones IA ni escrituras académicas; sin overflow a 320/390/768/1024/1440 CSS px. Trainer no disponía de una Review en esa sesión, por lo que repo/SHA seleccionado y reto real siguen NO COMPROBADOS.
- Capturas autenticadas quedan solo localmente porque incluyen identidad y datos académicos; no se añadieron a Git ni a Notion.
- Notion F16, F17 y F10 actualizado con merge/release, QA observada y límites NO COMPROBADOS.

## Release F22.15 `v0.5.51` — 2026-11-23

- PR #213 se integró mediante merge normal como `c9576aad08dfd689a0852ec9a6b748d938fa2803`; CI `45274714433` SUCCESS. La tag anotada nueva apunta a ese SHA exacto de `origin/main`.
- F14 run `45275604889` SUCCESS: validación de tag/SHA/main, PostgreSQL desechable, backup/restore, suite/typecheck/lint/build, metadata, imágenes ARM64, atestación Sigstore y publicación aprobada.
- Ego Lite público: `/health` HTTP 200 `ok/database=ready`; el bundle `/assets/index-BDAa_SKe.js` contiene `v0.5.51`, el SHA exacto y `/admin/trainer-events`. GET del feed con sesión sin rol admin dio 403 seguro. El feed con rol admin y eventos Trainer reales quedan NO COMPROBADOS.
- No se realizó despliegue manual, cambio de infraestructura, migración ni escritura en producción.

## Release Pixel Night `v0.5.52` — 2026-11-23

- Tag anotada `v0.5.52` apunta al merge de `main` `7da17eca74f1c5df7efb1e909e3a73abcd14794b`; se validó que `v0.5.51` era tag anotada y ancestro de `main`. No se modificaron tags existentes.
- F14 run `45282721019` SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`. Pasaron la verificación tag/SHA/main, PostgreSQL desechable, backup/restore, state machine, suite/typecheck/lint/build, metadata, imágenes ARM64, firma Sigstore y publicación del paquete.
- Revisión read-only de `fragments-production`: solo regla `branch_policy`; no aparece `Required reviewers`. No se cambió configuración de entorno.
- Aplicación confirmada por SSH read-only en `gavanti`: `fragments-web-1` y `fragments-api-1` están `Up (healthy)` y usan `fragments-web:sha-7da17eca74f1c5df7efb1e909e3a73abcd14794b` / `fragments-api:sha-7da17eca74f1c5df7efb1e909e3a73abcd14794b`. La imagen web contiene un asset JS que incluye `v0.5.52` y el SHA exacto; archivo `index-GzHAFdj-.js`.
- El alias SSH reporta `StrictHostKeyChecking=true` y `BatchMode=yes`; se usó `sudo -n` solo para listar contenedores/salud e inspeccionar en modo lectura el asset estático. No se accedió a variables de entorno ni a la base de datos.
- Ego Lite TaskSpace 44 había terminado y exigía autorización explícita para reclamarlo. No se abrió otro espacio ni un navegador alternativo; QA visual autenticada y observación por sesión Ego Lite quedan pendientes.
- No se ejecutaron migraciones ni escrituras académicas en producción. Aplicación de F14 queda comprobada a nivel de contenedor/artefacto; health HTTP público y pantallas autenticadas siguen **NO COMPROBADOS**.

## Release Pixel Night `v0.5.57` — 2026-11-24

- PR #233 se integró mediante merge normal en `main` como `7648fd5b7d5df4daed3485aef9659b5ba57d5628`; CI del PR `45314909157` SUCCESS.
- Tag anotada `v0.5.57` apunta exactamente a ese merge. F14 run `45315350460` completó `verify-build`, `attest-package` y `publish-approved-release` en SUCCESS. Pasaron validación tag/SHA/main, PostgreSQL desechable y backup/restore, pruebas, typecheck/lint/build, metadata, imágenes ARM64, firma Sigstore y publicación del paquete a la cola protegida.
- Aplicación pública automática verificada: `/health` HTTP 200 `ok`, database `ready`; bundle `/assets/index-DQPP14Ar.js` contiene `v0.5.57` y el SHA exacto `7648fd5b7d5df4daed3485aef9659b5ba57d5628`.
- No hubo deploy manual, reinicio, migración, cambio de configuración ni escritura productiva. El TaskSpace estudiantil de Ego Lite no estaba disponible; QA visual autenticada queda NO COMPROBADA.

## Release Review Pixel Night `v0.5.58` — 2026-11-24

- PR [#235](https://github.com/VGMil-dev/fragments/pull/235) se integró por merge normal como `004df54d9e485e59b294cbec263020eb034bbf46`; CI del PR `45320215869` SUCCESS. La tag anotada nueva `v0.5.58` apunta a ese SHA exacto de `main`.
- F14 run [`45320565441`](https://github.com/VGMil-dev/fragments/actions/runs/45320565441) SUCCESS: validación de tag/SHA/main, PostgreSQL desechable y backup/restore, suite/typecheck/lint/build, metadatos, imágenes ARM64, atestación Sigstore y publicación aprobada del paquete, manifiesto y atestación.
- La primera observación Ego Lite después de publicar todavía sirvió el asset de `v0.5.57`; después, el agente pull aplicó automáticamente la release. Verificación posterior Ego Lite: `/health` HTTP 200 `status=ok`, database `ready`; HTML `/assets/index-M0AC9oiW.js` contiene `v0.5.58` y SHA exacto `004df54d9e485e59b294cbec263020eb034bbf46`. Sin deploy manual, reinicio ni cambio de servicios/controles.
- QA visual autenticada de Review y accesibilidad con Ego Lite estudiante, y calidad semántica de puntuaciones/citas IA: **NO COMPROBADAS**. No se hicieron escrituras productivas ni llamadas a proveedores.

## Release Mentor `v0.5.59` — 2026-11-24

- PR [#240](https://github.com/VGMil-dev/fragments/pull/240) se integró por merge normal como `518e3de06b66456b7a404cb3e2468c34b0bccecc`; CI `45330071847` SUCCESS. Tag anotada `v0.5.59` apunta al mismo SHA de `main`.
- F14 run [`45330419832`](https://github.com/VGMil-dev/fragments/actions/runs/45330419832) SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`; se validaron procedencia exacta, test/typecheck/lint/build, backup/restore PostgreSQL de prueba, imágenes ARM64 y atestación Sigstore. Se publicaron paquete, manifiesto y bundle de atestación.
- Aplicación confirmada con acceso SSH `BatchMode` y host checking estrictos, `sudo -n docker ps` de solo lectura: `fragments-web-1` y `fragments-api-1` están `Up (healthy)` con imágenes `sha-518e3de06b66456b7a404cb3e2468c34b0bccecc`. No se accedió a variables, base productiva ni datos de otros usuarios. `/health` en Ego Lite respondió HTTP 200 (`status=ok`, `database=ready`); `/assets/index-C27BWUUA.js` contiene `v0.5.59` y el SHA exacto.
- Ego Lite estudiante verificó la separación entre habilidades propias de propuesta y la habilidad requerida de la misión en el borrador QA persistido, a 320/390/768/1024/1440 CSS px sin overflow. Dashboard y Trainer se observaron en desktop 1920 px solo como líneas base. No hubo guardado, evaluación, publicación ni llamada IA; la sesión estudiantil permanece abierta.
- Capturas autenticadas conservadas localmente, con hashes y sin publicar en GitHub/Notion: Mentor `39EAD9F1145EEBA784D3371436865734FD67D898E5ED81FF3691E3289B5782B7`, Dashboard `F6FC02DEBD21CFD4E97DBD6039D41AA8C44DB4E94A56A8297FBE135C78B54FE0`, Trainer `2D0F7A5A7F039833DD65494007932081BEB01F0365D513F360F7DFBD92603BAB` (archivos bajo `C:\Users\vgmil\ego\fragments-game-experience-20261124\`).
- La evaluación histórica visible no fue repetida; calidad real de puntuación Mentor/Review, accesibilidad de contraste y lector, zoom 200 %, estabilidad integral y retención/restore del backup productivo siguen **NO COMPROBADOS**.

## Release Pixel Night `v0.5.61` — 2026-11-24

- PRs #244, #245 y #246 se integraron mediante merges normales en `main`; el merge final es `900b5bd075e601ade487dadd49336b713f7c0334`. Tag anotada `v0.5.61` apunta exactamente a ese SHA.
- F14 run `45341081720` terminó SUCCESS en `verify-build`, `attest-package` y `publish-approved-release`. Pasaron validación tag/SHA/main, PostgreSQL desechable y backup/restore, suite/typecheck/lint/build, metadatos, imágenes ARM64, firma Sigstore y publicación del paquete.
- Revisión read-only de `fragments-production`: conserva solo `branch_policy`; `Required reviewers` no está configurado. No se alteró el entorno ni los gates técnicos.
- El aplicador automático normal registró `release_deployed tag=v0.5.61 commit=900b5bd075e601ade487dadd49336b713f7c0334`, terminó `Result=success`, `ExecMainStatus=0` y dejó API/web `Up (healthy)` sobre el SHA exacto. SSH usó `BatchMode`/host checking estrictos y consultas read-only.
- Salud pública cache-bypass: `/health` `status=ok`, `database=ready`. El HTML entrega `/assets/index-D5BowZnw.js`, que contiene la versión y el SHA completos. No hubo deploy manual, reinicio, migración ni interrupción.
- F14 verifica entrega de artefacto y estado de servicios; esto no declara Fragments estable para piloto ni valida calidad real de evaluaciones IA. No se accedió a variables de entorno o base productiva.

## Incidente de almacenamiento y recuperación automática · 2026-11-24

- Auditoría read-only: partición raíz ext4 `/dev/sda1`, 206,900,281,344 bytes totales, 205,967,380,480 usados y 916,123,648 disponibles (100 %). Inodos al 22 %, por lo que no estaban agotados. `docker system df` mostraba 179 imágenes (192.3 GB, 183.8 GB reclaimable) y 9.056 GB de build cache. La unidad `fragments-release-poll.service` registraba `release_poll_failed type=OSError`.
- El logger del agente F14 registra solo la clase de excepción, no `errno` ni mensaje; el errno exacto permanece NO COMPROBADO. El disco lleno es la causa operativa consistente con la excepción y con la recuperación posterior, aunque el código errno no puede afirmarse.
- Se verificó ledger, tags de releases, imágenes de contenedores y referencias de todos los contenedores. Se retiraron exactamente 142 tags de imágenes antiguas de Fragments (71 pares API/Web) de releases anteriores a la ventana preservada; ninguna imagen seleccionada estaba referenciada por contenedores. Se conservaron `v0.5.63`, `v0.5.64` como rollback, `v0.5.65`, las imágenes pendientes `v0.5.66`, todos los contenedores, volúmenes, backups y el build cache. `docker image rm` confirmó 142 tags sin error; no se usó prune global.
- El espacio pasó de 916 MB libres a 168.0 GB libres tras retirar tags; luego las imágenes de las releases legítimas `v0.5.66` y `v0.5.67` ocuparon espacio nuevo. Estado final: 165.38 GB libres, 21 % usado, inodos 6 %; aumento neto de espacio libre de 164,465,672,192 bytes frente a la auditoría inicial.
- El timer F14 recogió y aplicó `v0.5.66` normalmente (ledger release `456571026`) después de recuperar espacio. Posteriormente, la tag anotada `v0.5.67` fue validada/publicada por el workflow F14 `45398587029` (verify-build, attest-package, publish-approved-release: SUCCESS), y el timer la recogió sin invocar manualmente el aplicador. Ledger release `456771380`, estado `deployed`, commit `a40653c10b6874f72b47c9a8027dd2d24982ad37`.
- Verificación final: API y web de Fragments `Up (healthy)` en el SHA exacto; `/health` devolvió `ok/ready`; Pits development, test web/API y PostgreSQL continuaron saludables; `systemctl --failed` no mostró unidades fallidas. Sin cambios de secretos, reglas/protecciones, servicios, PostgreSQL, backups o mecanismo F14. F14 mantuvo su backup y healthcheck regulares.
- El almacenamiento queda recuperado, pero el espacio no sustituye una política de retención supervisada: inventario restante de Docker reportó 27.89 GB de imágenes y 9.056 GB de build cache (7.871 GB reclaimable), preservados. Vigilar crecimiento y planificar ampliación si vuelve a aproximarse a capacidad crítica.

## Release automática v0.5.71 · 2026-11-24

- PR #268 merge normal en SHA `a0e75e33ca5a3115392fef093b9ba40230953416`; CI #45473906796 SUCCESS. Tag anotada `v0.5.71` apunta al mismo SHA de `main`.
- F14 run #45474371223 terminó SUCCESS en verify-build, attest-package y publish-approved-release, incluyendo PostgreSQL disposable, backup/restore, typecheck/lint/build, metadata, ARM64 y atestación.
- El poll F14 aceptó release ID `457260586`; el aplicador normal registró `release_deployed`, `Result=success`, `ExecMainStatus=0`. API y web están healthy sobre el SHA exacto. Health local y público `ok/database=ready`.
- Sin despliegue ni reinicio manual, sin cambios de `fragments-production`, secrets o gates. El cambio de código habilita egress solo al servicio manual `bootstrap-admin`; PostgreSQL sigue en la red interna. Espacio raíz al verificar: 140 GB disponibles, 28 % usado, inodos 7 %.
- Se conservaron servicio e imágenes de rollback, volúmenes, backups y servicios vecinos. Ledger/hash de respaldo y retención detallada del host siguen NO COMPROBADOS para esta release.

## Release automática v0.5.75 · 2026-11-24

- PR #277 se integró por merge normal en `main` SHA `81a4a9e9006c1e55086e376d8ed62ccd2bbb52be`; CI del PR `45509184330` PASS.
- Tag anotada `v0.5.75`, tag object `9145f9ad5f131a513e605f3d8c18ed9b67b46f3b`, apunta exactamente al SHA de `main`. F14 run `45509638382` completó `verify-build`, `attest-package` y `publish-approved-release` en SUCCESS. La release GitHub se publicó.
- Ego Lite docente Space 44/Profile 3 verificó el artefacto servido: `/assets/index-CRG6D7Lj.js` incluye `v0.5.75` y el SHA completo; `/health` respondió HTTP 200 con `status=ok`, `database=ready`. El enlace Habilidades apareció en desktop y en menú móvil a 390×844; `/teacher/skills` cargó Catálogo de habilidades. Sin escrituras ni reinicio/deploy manual.
- Se conservó el viewport original 1908×944/DPR2 y la pestaña del Space 44. El Space 80 no fue abierto.
- No se inspeccionó la fila del ledger ni el hash de backup de esta release; rollback productivo no fue ejercido. La comprobación de UI confirma el release servido, no sustituye esas evidencias operativas.

## Release v0.5.89 · CU-20 CTA «Continuar misión» · 2026-11-25

- PR #316 se integró mediante merge normal en `main`, SHA `fd91e02ba7d877d7f492ee64a6bd12d9d1024974`; CI `45685906693` SUCCESS. La tag anotada `v0.5.89` apunta al merge exacto.
- F14 run `45686422248` completó `verify-build`, `attest-package` y `publish-approved-release` SUCCESS. El poller/aplicador normales registraron `release_deployed`; el ledger marca `v0.5.89`/SHA exactos como `deployed`.
- Backup `fragments-prod-2026-11-25T19-41-09-704Z.dump`, 98,409 bytes, SHA-256 `d916f87dc800741ac44e888c42bfa26e8b76ac2bf59d484d3891acac2cd2fec5`, integridad `restored_to_temporary_database`.
- API y web `Up (healthy)` sobre `sha-fd91e02ba7d877d7f492ee64a6bd12d9d1024974`; `/health` HTTP 200 `ok/database=ready`. Hubo HTTP 502 transitorio durante sustitución y la aplicación se recuperó normalmente; no se intervino el aplicador. Poll timer, apply path y cloudflared activos; `systemctl --failed` vacío. Tymeslot, ImagenEC, PostgreSQL, Pits y sus contenedores de prueba permanecieron sanos.
- `/dev/sda1`: 89 GB libres, 55 % usado; inodos 12 %. Se conservan imágenes de `v0.5.88` y `v0.5.87` para rollback; no se ejerció rollback. Sin cambio de gates, secretos, servicios o datos académicos.
- El HTML público sirve `/assets/index-kRRtjVZJ.js` (675,213 bytes); lectura directa confirmó dentro del bundle `v0.5.89` y el SHA exacto `fd91e02ba7d877d7f492ee64a6bd12d9d1024974`.
- Ego Lite autenticado post-release NO COMPROBADO porque Spaces autorizados 44/80 no aparecen en el runtime actual. Esto verifica aplicación operativa de la release, no estabilidad general ni piloto académico.

## Release automática v0.5.92 · CU-33 navegación admin · 2026-11-25

- PR #327 integrada mediante merge normal en `main`, SHA `d513d2283d5091fffa6c27a63206f37a209a6da5`; CI #45706974889 SUCCESS. Tag anotada `v0.5.92` fijada al SHA exacto de main.
- F14 run #45707727984 pasó `verify-build`, `attest-package` y `publish-approved-release`. Publicó GitHub Release ID `458690137` con paquete de imágenes, manifest y atestación.
- El poller y aplicador F14 normales registraron el release ID `458690137`, tag/SHA exactos y estado `deployed`. Backup `fragments-prod-2026-11-25T21-58-25-758Z.dump`, 98,409 bytes, SHA-256 `768fbf3a30fc605c5265494d32e0388a0b37d989663c22e3e95a1f35b108180e`, `restored_to_temporary_database`.
- API/web Fragments `Up (healthy)` en imágenes `sha-d513d2283d5091fffa6c27a63206f37a209a6da5`. `/health` HTTP 200 `ok/database=ready`; bundle `/assets/index-Bwomdy0w.js` confirma `v0.5.92` y SHA exacto. No se efectuó operación manual, migración de datos ni limpieza Docker.
- F14 timer, apply path y cloudflared activos; apply service inactivo al finalizar; `systemctl --failed` vacío. PostgreSQL, Tymeslot, ImagenEC, Pits y contenedores de QA `healthy`.
- `/dev/sda1`: 77 GB disponibles de 193 GB, 61 % usado; inodos 13 %. Docker reportó 110.5 GB en imágenes, 98.47 GB reclaimable y 9.056 GB de build cache; no se eliminó ningún artefacto. Imágenes API/web anteriores `v0.5.91` y `v0.5.90` permanecen disponibles para rollback; no se ejecutó rollback.
- UI autenticada post-release NO COMPROBADA porque Ego Lite no expuso en este runtime los Spaces autorizados. La evidencia del bundle y servicios no sustituye esa prueba ni declara estabilidad para piloto.
