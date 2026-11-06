# F08 — Evidencia

Estado: COMPLETADA. La autorización de despliegue llegó el 2026-11-05; se continúa en la rama `codex/fragments-mvp` con el tag local `v0.1.0-mvp` verificado contra el SHA solicitado.

## Preflight

- `git status --short --branch` → `## codex/fragments-mvp`, sin cambios iniciales.
- `git show -s --format=%H v0.1.0-mvp` → `4553ae204160f95dfcb0886fe9741566441f3cbc`.
- Perfil SSH `servidor` → conectó por clave; la huella ED25519 coincidió con `known_hosts`.
- La VPS se verificó como Ubuntu 26.04 LTS, ARM64, 2 vCPU, 11 GiB RAM, 187 GB disponibles en ext4, Docker 29.9.2 y Compose 5.6.1.
- Servicios Pits y PostgreSQL existentes permanecieron activos; el puerto 8081 del servicio Pits está ligado a loopback.
- El túnel `cloudflared` usa configuración remota. Se reutilizó el túnel saludable `gavanti-srv` y la zona `gavanti.org`; no se rotó token ni se tocó el conector.
- Se comprobó presencia/formato de variables en `.env` sin imprimir valores. No se copió `.env` al repositorio ni se enviaron solicitudes a AI Gateway o GitHub.

## Implementación

- Se añadieron `deploy/production/docker-compose.yml`, imágenes API/web ARM64, configuración Nginx, backup SQLite y unidades systemd; `.env` y `.env.bootstrap` están ignorados por Git.
- Commits de preparación runtime desde `f94ee88` hasta `95c12de`; evidencia intermedia en `c7a8c93` y `55d6162` (rama `codex/fragments-mvp`, sin cambios ajenos al task).
- Se generaron secretos específicos para producción. El `.env` remoto está protegido como `root:root 0600`; el registro local de acceso inicial está cifrado con DPAPI y ACL restringida. No se registran valores.
- VPS: `/opt/fragments`, volumen Docker `fragments-data` y `/var/backups/fragments` (directorio `root:root 0700`). Backup y servicio de mantenimiento instalados; temporizador systemd diario a las 03:15 UTC, retención de 14 días.
- Imágenes construidas nativamente en ARM64: `fragments-api:0.1.0-mvp-arm64` y `fragments-web:0.1.0-mvp-arm64`; etiqueta de revisión Compose observada: `4553ae204160f95dfcb0886fe9741566441f3cbc`.
- API y web usan la red privada `fragments-private`; el API no publica puerto al host y el web publica solamente `127.0.0.1:3001`. No se reinició ni modificó Pits.
- Primer arranque web falló por los temporales FastCGI de Nginx en filesystem de solo lectura; se corrigieron las rutas temporales a `/tmp`, se reconstruyó la imagen y ambos contenedores quedaron saludables.
- Cuenta docente provisionada mediante flujo de bootstrap de un solo uso; luego se eliminó del servidor el archivo temporal de bootstrap.
- Cloudflare agregó `fragments.gavanti.org` como hostname publicado en el túnel existente, origen `http://127.0.0.1:3001`; creó el CNAME apuntando al UUID de ese túnel. Las cinco rutas que ya existían permanecieron iguales.
- Se actualizaron `BETTER_AUTH_URL` y `PUBLIC_APP_URL` en los `.env` local y remoto, sin imprimir valores secretos. Se recreó solo `fragments-api-1` (un `restart` simple conserva el entorno viejo); la API cargó el hostname HTTPS nuevo. Web y Pits no se recrearon.

## Verificación local y en VPS (2026-11-06 UTC)

- `pnpm build` → correcto, 3 paquetes.
- `pnpm typecheck` → correcto, 4 tareas.
- `pnpm test` → correcto, API 78/78 y contratos 18/18.
- `pnpm lint` → correcto.
- `node --check deploy/production/backup.mjs` → correcto.
- `docker compose -f deploy/production/docker-compose.yml config --quiet` → correcto.
- En VPS, Compose reportó `fragments-api-1` y `fragments-web-1` en `running (healthy)`; etiquetas de imagen declararon la revisión indicada arriba.
- `GET http://127.0.0.1:3001/` → 200; `GET http://127.0.0.1:3001/health` → 200.
- `ss -ltn` → `127.0.0.1:3001` únicamente para el puerto web; el API solo aparece como `3000/tcp` privado.
- Login de prueba: sign-in 200 y sesión docente autenticada 200; Inspector sin sesión 401 y con sesión más identificador inexistente 404.
- Tras reiniciar solo el contenedor API, health siguió 200 y el usuario persistió en SQLite.
- Backup de prueba `/var/backups/fragments/fragments-2026-11-06T01-30-55-779Z.sqlite`, 188416 bytes, SHA-256 `62b5ccfa1e21a9dd9bac6c7604370354c55d5bb657503ad4694e178f78520255`; restore aislado devolvió `PRAGMA integrity_check=ok` y conservó el registro docente.
- Estado fresco: `fragments-backup.timer` `enabled` y `active`; siguiente ejecución observada 2026-11-06 03:16 UTC. Se observaron ambos contenedores saludables y el backup de prueba presente. Backup con permisos de archivo 0600 verificado en la prueba previa.
- Revalidación posterior: `docker image inspect` confirmó `linux/arm64` para ambas imágenes; `.env` remoto `root:root 0600`; directorio de backups `root:root 0700`; volumen SQLite `fragments-data` en `/var/lib/docker/volumes/fragments-data/_data`. El timer declara `OnCalendar=*-*-* 03:15:00 UTC`, `Persistent=true` y `RandomizedDelaySec=15m` (por eso la hora de activación varía); permanece habilitado y activo.
- Tras completar 2FA, se reanudó y cerró la misma TaskSpace de Ego Lite; el hostname y el DNS quedaron verificados en el panel del túnel.
- La prueba no llamó al AI Gateway ni a GitHub.
- Prueba pública por ego(lite), viewport 1908×943: `https://fragments.gavanti.org/` abrió la landing con TLS; `GET /health` → 200.
- Inicio de sesión público en `/teacher/inspector`, con la cuenta docente provisionada: `GET /api/auth/get-session` → 200, sesión autenticada y docente; el botón de cierre de sesión se mostró y no hubo alerta. Valores de credenciales no se imprimieron.
- Inspector público antes del login: `GET /api/inspector/release-smoke-not-found/challenges` → 401. Tras el login docente, la misma ruta → 404 por identificador inexistente, confirmando que la sesión autoriza la ruta.
- `curl.exe` desde la estación de trabajo: `https://fragments.gavanti.org/health` → 200 y `ssl_verify_result=0`; resolución DNS pública produjo respuestas AAAA de Cloudflare.
- Revisión de rutas Cloudflare antes/después: `pits.gavanti.org` sigue en `http://127.0.0.1:8080`, `pits-dev.gavanti.org` sigue en `http://127.0.0.1:8081`; ningún hostname existente fue editado. Hallazgo de cierre: `pits.gavanti.org` devuelve 502 y el host no tiene listener en 8080, mientras `127.0.0.1:8081` devuelve 200 y `pits-dev.gavanti.org` responde 302. No se cambió Pits ni se apuntó producción al puerto de desarrollo.
- Tras la actualización pública, ambos contenedores Fragments quedaron `healthy`, el timer `fragments-backup.timer` continúa `enabled`/`active`, `.env` remoto conserva modo `0600`, y el backup probado modo `0600`.
- El `.env.bootstrap` del servidor se eliminó al terminar el provisioning. Su copia local protegida sigue presente e ignorada por Git; la limpieza después de la prueba de login fue rechazada por la revisión automática de la herramienta. No se expuso ni se registró su contenido. El registro DPAPI cifrado permanece en `C:\Users\vgmil\.codex\secrets\fragments-initial-access.dpapi`.

## Verificación y cierre

- Commit local de cierre de despliegue y evidencia: `9204cd85662daf68b7fabdff20c5d15ec4d37e7c` (`docs(F08): documenta ruta publica y pruebas finales`). `task-list/TASKS.md` se marca completada en el commit de cierre documental siguiente. No se hizo push. El problema observado en el destino Pits de producción queda documentado, sin cambios fuera de F08.
