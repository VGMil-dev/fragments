# F08 — Especificación

## Criterios de aceptación

- [ ] El artefacto desplegado declara el SHA de release solicitado y corre sobre `linux/arm64`.
- [ ] API y web arrancan con reinicio automático, límites, healthchecks y red privada entre contenedores.
- [ ] El origen publicado solo escucha en loopback; el subdominio usa el Cloudflare Tunnel existente sin perder rutas de Pits.
- [ ] Better Auth está habilitado, el alta pública continúa desactivada y existe una cuenta docente provisionada.
- [ ] SQLite usa un volumen persistente local ext4; hay backups consistentes con integridad verificada y retención documentada.
- [ ] La página, `/health`, login/sesión docente y rutas Inspector devuelven los estados esperados.
- [ ] Las pruebas no imprimen secretos ni provocan llamadas al Gateway.
- [ ] `task-list/F08/evidencie.md` registra salida fresca, rutas y hash de commit.

## Fuera de alcance

- Cambios al código funcional de Mentor, Review o Inspector.
- Pruebas de carga, acceso a repositorios privados, evaluación con IA real o cambios de políticas de OCI.
