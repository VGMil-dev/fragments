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

## Túnel

El túnel remoto existente `gavanti-srv` conserva sus hostnames anteriores y publica `fragments.gavanti.org` con origen `http://127.0.0.1:3001`. Cloudflare creó el CNAME al túnel y termina HTTPS en el borde; la conexión al origen queda limitada al loopback del host.

En la verificación de F08, los destinos existentes `pits.gavanti.org` (`127.0.0.1:8080`) y `pits-dev.gavanti.org` (`127.0.0.1:8081`) permanecieron en la configuración. Se observó que el primero devuelve 502 porque no había listener local en 8080; no se redirigió el hostname de producción al puerto de desarrollo ni se modificó ningún servicio de Pits.
