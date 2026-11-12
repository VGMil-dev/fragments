# Despliegue de producción

Este overlay añade el servidor estático, el proxy interno a la API, la cuenta docente inicial y los backups a la release `v0.1.0-mvp`. API y web se construyen en el host ARM64. El único puerto publicado por Compose es `127.0.0.1:3001`; Cloudflare Tunnel debe apuntar a `http://127.0.0.1:3001`.

## Variables y credenciales

- Crear `.env` a partir de `.env.example` y protegerlo como `root:root`, modo `0600`.
- Configurar `BETTER_AUTH_SECRET` con al menos 32 bytes aleatorios, `BETTER_AUTH_URL` y `PUBLIC_APP_URL` con el hostname HTTPS definitivo y `AI_GATEWAY_*` con las tarifas/modelo ya aprobados.
- `GITHUB_TOKEN` puede omitirse para repositorios públicos.
- No añadir `VITE_*` con secretos. El frontend se sirve desde el mismo origen y solo envía solicitudes a `/api`.
- `.env.bootstrap` sirve únicamente para crear la primera cuenta docente. Debe vaciarse inmediatamente después del provisioning.

## Arranque

Desde `/opt/fragments`:

```sh
docker compose -f deploy/production/docker-compose.yml build --pull
docker compose -f deploy/production/docker-compose.yml up -d
docker compose -f deploy/production/docker-compose.yml ps
```

Primero instalar el contenido de `systemd/` en `/etc/systemd/system/` y crear `/var/backups/fragments` con propietario `root:root` y modo `0700`. Después ejecutar un backup manual y habilitar el timer.

El servicio `bootstrap` usa solo variables de auth y de la cuenta docente. Provisiona la cuenta en el volumen de producción con el módulo ya compilado; no habilita registro público en el API.

## Backups y recuperación

El servicio `backup` ejecuta `VACUUM INTO` sobre una conexión de solo lectura, valida `PRAGMA integrity_check`, guarda el snapshot con modo `0600` y elimina únicamente archivos `fragments-*.sqlite` vencidos según la retención de 14 días. systemd lo programa diariamente. La ubicación actual está en la misma VPS; todavía no equivale a un backup fuera del host.

Para recuperar, conservar primero una copia de la base y sidecars actuales, parar la API en una ventana de mantenimiento, restaurar un snapshot a un volumen nuevo, validar `integrity_check` y comprobar `/health`. Conmutar a la base restaurada solo tras verificarla. No usar un snapshot sobre la base activa.

## Releases seguros por tag

El único workflow de release se activa con `push` de una tag anotada `vMAJOR.MINOR.PATCH`. CI de pull request es un workflow separado, de solo lectura y sin acceso a producción. La validación del release exige repositorio correcto, evento de creación de tag, formato semántico estricto, objeto de tag anotada, SHA exacto del commit, ascendencia en `main` y que el archivo del workflow de la tag sea idéntico al de `main` actual.

GitHub Actions usa runners hospedados ARM64 y construye las imágenes desde el SHA comprobado. El paquete y su manifiesto vinculan repositorio, ID del repositorio, tag, objeto de tag, SHA, run de Actions, plataforma y SHA-256 del archivo. GitHub firma una atestación del artefacto. El job que publica el GitHub Release está detrás del entorno protegido `fragments-production`; su aprobación es el control humano previo a que el agente local vea el paquete. No hay llave SSH, token de producción ni secreto en GitHub.

En la VPS, `fragments-release-poll.timer` consulta los Releases públicos cada cinco minutos con la cuenta sin login `fragments-release`. Esa cuenta no recibe `sudo`, Docker, LXD ni acceso a otros servicios; solo puede crear un archivo de solicitud fijo. `fragments-release-apply.path` despierta un servicio root endurecido, que valida de nuevo el release, la ejecución aprobada, la tag y el SHA contra GitHub, la atestación, el paquete ARM64 y las etiquetas de ambas imágenes. El socket Docker solo queda disponible a ese servicio fijo. Se recrean únicamente `api` y `web` de Fragments.

Antes del cambio se ejecuta el servicio existente `fragments-backup.service`; se comprueban propietario, permisos y `PRAGMA integrity_check=ok` del snapshot, cuyo SHA-256 se registra en el ledger privado. El agente comprueba que el volumen SQLite y los contenedores vecinos no cambian. Si falla el healthcheck, revierte las referencias de imagen anteriores sin restaurar la base. El ledger persistente registra tag, objeto, SHA, imágenes anteriores, backup y resultado; bloquea repetir tag, SHA o ID de release. No se borran tags para reintentar.

### Publicar la siguiente versión

Desde una copia limpia y actualizada, integra primero los cambios en `main`. Después, para publicar `v0.4.0`, fija la tag a ese commit exacto y envíala como la única acción que inicia el release:

```powershell
git fetch origin main
git switch main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
git tag -a v0.4.0 -m "Fragments v0.4.0" HEAD
git cat-file -t refs/tags/v0.4.0
git rev-parse 'refs/tags/v0.4.0^{commit}'
git merge-base --is-ancestor 'refs/tags/v0.4.0^{commit}' refs/remotes/origin/main
git push origin refs/tags/v0.4.0
```

Confirma que el árbol esté limpio, que `git cat-file` devuelva `tag` y que el SHA pelado sea el `HEAD` que se decidió publicar. El workflow verifica, prueba y construye; después espera la aprobación manual de `fragments-production`. Al aprobar, publica los assets; el agente pull verifica y despliega. No uses `workflow_dispatch`, la UI de GitHub Releases ni un push a una rama para iniciar este recorrido.

Para revertir manualmente solo el código si el rollback automático no terminó, entra por SSH con el procedimiento operativo vigente y ejecuta como administrador:

```sh
sudo /usr/bin/python3 /usr/local/libexec/fragments-release-agent.py --rollback-latest
```

El comando usa las imágenes anteriores registradas, valida salud y deja la base SQLite sin cambios. Si el endpoint o el ledger indican que el rollback también falló, detén los servicios `fragments-release-poll.timer` y `fragments-release-apply.path`, conserva el ledger y solicita recuperación operativa; no restaures SQLite automáticamente. Para pausar releases sin desplegar, detén únicamente esos dos units de Fragments; no detengas el runner compartido ni otros servicios.

## Túnel

El túnel remoto existente `gavanti-srv` conserva sus hostnames anteriores y publica `fragments.gavanti.org` con origen `http://127.0.0.1:3001`. Cloudflare creó el CNAME al túnel y termina HTTPS en el borde; la conexión al origen queda limitada al loopback del host.

En la verificación de F08, los destinos existentes `pits.gavanti.org` (`127.0.0.1:8080`) y `pits-dev.gavanti.org` (`127.0.0.1:8081`) permanecieron en la configuración. Se observó que el primero devuelve 502 porque no había listener local en 8080; no se redirigió el hostname de producción al puerto de desarrollo ni se modificó ningún servicio de Pits.
