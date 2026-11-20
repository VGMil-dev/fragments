# Despliegue de producción

Este overlay añade PostgreSQL privado, migraciones Prisma, el servidor estático, la cuenta docente inicial y los backups. API y web se construyen en el host ARM64. El único puerto publicado por Compose es `127.0.0.1:3001`; Cloudflare Tunnel debe apuntar a `http://127.0.0.1:3001`.

## Variables y credenciales

- Mantener `.env` para los secretos de aplicación (Gateway, GitHub, Better Auth y correo), y crear `.env.api`, `.env.postgres`, `.env.migrate`, `.env.test-migrate`, `.env.backup` y `.env.restore` a partir de sus plantillas `.example`; proteger cada archivo como `root:root`, modo `0600`.
- Generar contraseñas URL-safe largas para el administrador inicial y los roles migrator/runtime/backup/restore. Guardar cada una solo en los archivos del servicio correspondiente. `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `BACKUP_*_DATABASE_URL` y `RESTORE_DATABASE_URL` usan usuarios separados; API solo recibe su URL runtime y los secretos de aplicación que necesita.
- PostgreSQL crea ambas bases solo al inicializar un volumen vacío. Conserva `fragments-postgres-data`; no borres el volumen para reiniciar configuración. El rol runtime no puede crear tablas; Prisma usa el rol migrator.
- PostgreSQL solo publica `127.0.0.1:5432` en el host; no hay puerto público. Para QA desde Windows, abrir un túnel SSH a `127.0.0.1:5432` y usar exclusivamente `fragments_test_runtime` con `.env.test`.
- Configurar `BETTER_AUTH_SECRET` con al menos 32 bytes aleatorios, `BETTER_AUTH_URL` y `PUBLIC_APP_URL` con el hostname HTTPS definitivo y `AI_GATEWAY_*` con las tarifas/modelo ya aprobados.
- `GITHUB_TOKEN` puede omitirse para repositorios públicos.
- No añadir `VITE_*` con secretos. El frontend se sirve desde el mismo origen y solo envía solicitudes a `/api`.
- `.env.bootstrap` debe contener solo `DATABASE_URL` del rol runtime y las variables de auth/provisioning. Debe vaciarse inmediatamente después del provisioning.

## Arranque

Desde `/opt/fragments`, tras crear la configuración privada y conservar el backup de emergencia de SQLite anterior:

```sh
docker compose -f deploy/production/docker-compose.yml build --pull
docker compose -f deploy/production/docker-compose.yml up -d
docker compose -f deploy/production/docker-compose.yml ps
```

Compose espera a PostgreSQL saludable, ejecuta `prisma migrate deploy` por separado en `fragments_prod` y `fragments_test`, y luego inicia la API con el rol runtime de producción. PostgreSQL está en una red interna `fragments-db-private`, separada de la red web/API; el volumen persistente es `fragments-postgres-data`.

## Entorno funcional y Ego Lite

El perfil Compose `qa` inicia una API aislada que solo usa `fragments_test` y la web de prueba en `127.0.0.1:3002`; el API no publica un puerto y la red privada de QA está separada de la web/API productiva. Copia `.env.test-api.example` como `.env.test-api`, crea un secreto Better Auth de pruebas y una cuenta docente sintética. No uses credenciales productivas.

```sh
docker compose -f deploy/production/docker-compose.yml --profile qa run --rm bootstrap-test
docker compose -f deploy/production/docker-compose.yml --profile qa up -d api-test web-test
curl --fail http://127.0.0.1:3002/health
```

Desde la estación de QA abre un túnel SSH a `127.0.0.1:3002` y usa Ego Lite en `http://localhost:3002`. Las pruebas funcionales se ejecutan contra `fragments_test`; CI mantiene además su propio PostgreSQL efímero. El Compose raíz `docker-compose.prod.yml` incluye esta configuración canónica.

Primero instalar el contenido de `systemd/` en `/etc/systemd/system/` y crear `/var/backups/fragments` con propietario `root:root` y modo `0700`. Después ejecutar un backup manual y habilitar el timer.

El servicio `bootstrap` usa solo variables de auth y de la cuenta docente. Provisiona la cuenta en el volumen de producción con el módulo ya compilado; no habilita registro público en el API.

## Backups y recuperación

El servicio `backup` usa usuarios de solo lectura y `pg_dump` en formato archive para ambas bases, valida cada dump con `pg_restore --list`, calcula SHA-256, guarda archivos con modo `0600` y elimina únicamente `fragments-*.dump` vencidos según la retención de 14 días. systemd lo programa diariamente. La ubicación está en la misma VPS; aún no equivale a un backup fuera del host.

Para validar la recuperación sin tocar las bases activas, ejecutar `docker compose -f deploy/production/docker-compose.yml --profile maintenance run --rm restore-verify`. El servicio restaura los dumps más recientes de ambas bases a bases temporales, verifica tablas de Better Auth y Prisma y las elimina al terminar.

Para recuperar, crear un volumen PostgreSQL nuevo y aislado, restaurar el archive con el rol migrator, comprobar tablas y conteos esperados con credenciales de solo lectura y ejecutar pruebas de humo antes de conmutar. Mantener la base activa intacta hasta verificar la restauración. No restaurar encima de la base activa ni modificar volúmenes vecinos.

## Releases seguros por tag

El único workflow de release se activa con `push` de una tag anotada `vMAJOR.MINOR.PATCH`. CI de pull request es un workflow separado, de solo lectura y sin acceso a producción. La validación del release exige repositorio correcto, evento de creación de tag, formato semántico estricto, objeto de tag anotada, SHA exacto del commit, ascendencia en `main` y que el archivo del workflow de la tag sea idéntico al de `main` actual.

GitHub Actions usa runners hospedados ARM64 y construye las imágenes desde el SHA comprobado. El paquete y su manifiesto vinculan repositorio, ID del repositorio, tag, objeto de tag, SHA, run de Actions, plataforma y SHA-256 del archivo. GitHub firma una atestación del artefacto. El job que publica el GitHub Release está detrás del entorno protegido `fragments-production`; su aprobación es el control humano previo a que el agente local vea el paquete. No hay llave SSH, token de producción ni secreto en GitHub.

En la VPS, `fragments-release-poll.timer` consulta los Releases públicos cada cinco minutos con la cuenta sin login `fragments-release`. Esa cuenta no recibe `sudo`, Docker, LXD ni acceso a otros servicios; solo puede crear un archivo de solicitud fijo. `fragments-release-apply.path` despierta un servicio root endurecido, que valida de nuevo el release, la ejecución aprobada, la tag y el SHA contra GitHub, la atestación, el paquete ARM64 y las etiquetas de ambas imágenes. El socket Docker solo queda disponible a ese servicio fijo. Se recrean únicamente `api` y `web` de Fragments.

Antes del primer corte desde SQLite, F14 conserva una sola copia SQLite de emergencia con permisos privados y comprueba su integridad; no importa sus filas ni la mantiene como respaldo permanente. Después, `fragments-backup.service` solo respalda PostgreSQL y F14 solo admite rollback de imágenes cuyo API anterior también use PostgreSQL. F14 verifica permisos, formato archive y SHA-256 del dump antes de cada release. También confirma que el volumen PostgreSQL y los contenedores vecinos no cambien. La etapa `migrate` aplica Prisma con el rol migrator antes de recrear API/web. Si falla el primer corte desde SQLite, el ledger marca `recovery_required` para recuperación operativa; no intenta arrancar SQLite contra PostgreSQL. En releases PostgreSQL posteriores, si falla el healthcheck, F14 revierte imágenes sin restaurar la base, por lo que las migraciones deben ser compatibles con rollback de código. El ledger registra tag, objeto, SHA, imágenes, backup y resultado; rechaza duplicados terminales y conserva fallos no terminales para revalidar la misma tag.

#### Reintento tras fallo remoto de GitHub

Los timeouts o códigos no cero de `git fetch` y `gh attestation trusted-root` quedan en reintento no terminal cada cinco minutos; no mutan Docker ni requieren una tag nueva. Para corregir red/configuración/acceso con seguridad:

```sh
sudo systemctl stop fragments-release-poll.timer fragments-release-apply.path
sudo systemctl is-active fragments-release-apply.service  # esperar hasta que indique inactive
# Corregir red/configuración/acceso sin mostrar ni copiar secretos
sudo systemctl start fragments-release-apply.path fragments-release-poll.timer
```

No detengas a la fuerza un apply activo: dejarlo terminar evita interrumpir una transacción. Si no termina, o el ledger queda en `recovery_required`, conserva el ledger y solicita diagnóstico operativo; no reinicies poll/apply ni ejecutes Docker hasta clasificar el estado. Si el evento `release_retry` persiste por un problema remoto, inspecciona solo `release_id`, `tag` y `code`; tras corregir la causa, el siguiente poll revalida la misma tag. No elimines el release ni crees otra tag.
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

Para revertir intencionalmente el código de un release conocido, o reintentar un rollback que dejó un ledger `rollback_failed` y cuyo estado Docker fue diagnosticado como seguro, entra por SSH con el procedimiento operativo vigente. Este rollback solo aplica a releases posteriores al corte cuyo API previo use PostgreSQL. No ejecutes este comando con `recovery_required`, con una transacción `deploying` sin reconciliar, ni con imágenes/volumen/vecinos desconocidos. Primero pausa nuevas activaciones y espera que apply termine:

Antes de corregir configuración o ejecutar el rollback manual, detén el timer y el path para impedir activaciones nuevas, pero deja que el oneshot en curso termine:

```sh
sudo systemctl stop fragments-release-poll.timer fragments-release-apply.path
sudo systemctl is-active fragments-release-apply.service  # esperar hasta que indique inactive
```

No mates un apply activo. Espera hasta que informe `inactive`; si no termina, conserva el ledger y solicita diagnóstico operativo. Ejecuta el comando manual solo cuando la última entrada del ledger (sin buscar releases anteriores) sea `deployed` o `rollback_failed`, las imágenes `.Image` coincidan exactamente con `targetImageIds`, y volumen/vecinos coincidan con el baseline, y ambos contenedores estén sanos antes de ejecutar el rollback. Para `recovery_required`, estado `deploying` sin reconciliar o imagen mixta/desconocida, no lo ejecutes: conserva el ledger y solicita intervención.

```sh
sudo /usr/bin/python3 /usr/local/libexec/fragments-release-agent.py --rollback-latest
```

El comando usa las imágenes anteriores registradas, valida salud y deja PostgreSQL sin cambios. Si el endpoint o el ledger indican que el rollback también falló, detén `fragments-release-poll.timer` y `fragments-release-apply.path`, deja terminar apply y confirma que `systemctl is-active fragments-release-apply.service` devuelva `inactive`, conserva el ledger y solicita recuperación operativa; no restaures PostgreSQL automáticamente. Para pausar releases sin desplegar, detén `fragments-release-poll.timer` y `fragments-release-apply.path`; deja terminar apply y confirma que el servicio esté `inactive`; no detengas el runner compartido ni otros servicios.

## Túnel

El túnel remoto existente `gavanti-srv` conserva sus hostnames anteriores y publica `fragments.gavanti.org` con origen `http://127.0.0.1:3001`. Cloudflare creó el CNAME al túnel y termina HTTPS en el borde; la conexión al origen queda limitada al loopback del host.

En la verificación de F08, los destinos existentes `pits.gavanti.org` (`127.0.0.1:8080`) y `pits-dev.gavanti.org` (`127.0.0.1:8081`) permanecieron en la configuración. Se observó que el primero devuelve 502 porque no había listener local en 8080; no se redirigió el hostname de producción al puerto de desarrollo ni se modificó ningún servicio de Pits.
