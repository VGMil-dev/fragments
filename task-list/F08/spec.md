# F08 — Especificación

## Criterios de aceptación

- [x] El artefacto desplegado declara el SHA de release solicitado y corre sobre `linux/arm64`.
- [x] API y web arrancan con reinicio automático, límites, healthchecks y red privada entre contenedores.
- [x] El origen publicado solo escucha en loopback; el subdominio usa el Cloudflare Tunnel existente y conserva la lista de rutas de Pits.
- [x] Better Auth está habilitado, el alta pública continúa desactivada y existe una cuenta docente provisionada.
- [x] SQLite usa un volumen persistente local ext4; hay backups consistentes con integridad verificada y retención documentada.
- [x] La página, `/health`, login/sesión docente y rutas Inspector devuelven los estados esperados públicamente.
- [x] Las pruebas no imprimieron secretos ni provocaron llamadas al Gateway.
- [x] `task-list/F08/evidencie.md` registra salida fresca, rutas y hash de commit.

## Fuera de alcance

- Cambios al código funcional de Mentor, Review o Inspector.
- Pruebas de carga, acceso a repositorios privados, evaluación con IA real o cambios de políticas de OCI.
