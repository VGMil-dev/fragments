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

- En curso. No registrar secretos, cookies, credenciales ni contenido de bases de datos en este archivo.

## Verificación y cierre

- Pendiente de build ARM64, despliegue, backup de prueba, smoke checks, ruta Cloudflare y commit final.
