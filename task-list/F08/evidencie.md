# F08 — Evidencia

Estado: EN PROGRESO. La autorización de despliegue llegó el 2026-11-05; se continúa en la rama `codex/fragments-mvp` con el tag local `v0.1.0-mvp` verificado contra el SHA solicitado.

## Preflight

- `git status --short --branch` → `## codex/fragments-mvp`, sin cambios iniciales.
- `git show -s --format=%H v0.1.0-mvp` → `4553ae204160f95dfcb0886fe9741566441f3cbc`.
- Perfil SSH `servidor` → conectó por clave; la huella ED25519 coincidió con `known_hosts`.
- La VPS se verificó como Ubuntu 26.04 LTS, ARM64, 2 vCPU, 11 GiB RAM, 187 GB disponibles en ext4, Docker 29.9.2 y Compose 5.6.1.
- Servicios Pits y PostgreSQL existentes permanecieron activos; el puerto 8081 del servicio Pits está ligado a loopback.
- El túnel `cloudflared` usa token-file/configuración remota. La cuenta Cloudflare solicitó el paso de seguridad 2FA; la ruta DNS/hostname de Fragments está pendiente de esa intervención.
- Se comprobó presencia/formato de variables en `.env` sin imprimir valores. No se copió `.env` al repositorio ni se enviaron solicitudes a AI Gateway o GitHub.

## Implementación

- Se añadieron `deploy/production/docker-compose.yml`, imágenes API/web ARM64, configuración Nginx, backup SQLite y unidades systemd; `.env` y `.env.bootstrap` están ignorados por Git.
- Commit de preparación: `f94ee88`; correcciones incrementales hasta `95c12de` (revisión del estado: solo rama `codex/fragments-mvp`, árbol limpio).
- Se generaron secretos específicos para producción. El `.env` remoto está protegido como `root:root 0600`; el registro local de acceso inicial está cifrado con DPAPI y ACL restringida. No se registran valores.
- VPS: `/opt/fragments`, volumen Docker `fragments-data` y `/var/backups/fragments` (directorio `root:root 0700`). Backup y servicio de mantenimiento instalados; temporizador systemd diario a las 03:15 UTC, retención de 14 días.
- Imágenes construidas nativamente en ARM64: `fragments-api:0.1.0-mvp-arm64` y `fragments-web:0.1.0-mvp-arm64`; etiqueta de revisión Compose observada: `4553ae204160f95dfcb0886fe9741566441f3cbc`.
- API y web usan la red privada `fragments-private`; el API no publica puerto al host y el web publica solamente `127.0.0.1:3001`. No se reinició ni modificó Pits.
- Primer arranque web falló por los temporales FastCGI de Nginx en filesystem de solo lectura; se corrigieron las rutas temporales a `/tmp`, se reconstruyó la imagen y ambos contenedores quedaron saludables.
- Cuenta docente provisionada mediante flujo de bootstrap de un solo uso; luego se eliminó del servidor el archivo temporal de bootstrap.
- Dominio público aún pendiente del paso de seguridad Cloudflare (2FA); no se ha modificado ninguna ruta existente del túnel.

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
- La prueba no llamó al AI Gateway ni a GitHub.

## Verificación y cierre

- Pendiente: 2FA por el titular, hostname nuevo en el túnel existente, actualización de URLs Better Auth, prueba pública HTTPS/login y commit de cierre con evidencia. La ruta sigue sin exposición pública hasta completar el hostname.
