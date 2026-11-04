# F03 — Specification

**Objetivo:** API HTTP S0 y base de persistencia segura.

## Entrada y salida
- HTTP JSON validado con esquemas `@fragments/contracts` y envelope `ApiResult` uniforme.
- `GET /health` informa estado del proceso y readiness de SQLite sin exponer configuración.
- SQLite en modo WAL con migraciones versionadas; database path solo desde servidor.
- Tabla de jobs con estado, intentos, idempotencia, lease/heartbeat y recuperación de leases vencidos.
- Login/sesión docente mínima preparada para desarrollo; secreto de sesión solo servidor y auth no habilitada si falta.
- Fake drivers para pruebas, sin Gateway ni GitHub.

## Criterios GIVEN / WHEN / THEN
- [ ] GIVEN proceso iniciado con base válida, WHEN `GET /health`, THEN devuelve estado saludable y no incluye secretos.
- [ ] GIVEN entrada HTTP inválida, WHEN llega a una ruta, THEN responde con envelope uniforme y sin reflejar valores sensibles.
- [ ] GIVEN dos workers reclaman un job, WHEN se ejecuta la transacción de lease, THEN un solo worker posee el lease vigente.
- [ ] GIVEN un job cuyo lease venció, WHEN la cola recupera vencidos, THEN puede reclamarse de nuevo de forma idempotente.
- [ ] GIVEN falta `SESSION_SECRET`, WHEN se habilita auth, THEN el proceso falla de forma segura sin emitir sesión.
- [ ] GIVEN el compose de desarrollo, WHEN se levanta, THEN API y SQLite readiness responden; volúmenes conservan datos al reinicio.
- [ ] GIVEN imagen para arquitectura ARM64, WHEN se construye, THEN Dockerfile mantiene runtime y build compatibles sin ejecutar código de estudiante.

## Pruebas y límites
- Test de rutas, migraciones, transacciones de lease, auth y configuración redactada.
- Docker Compose local/producción en archivos separados o perfiles claros.
- No ejecutar código ajeno ni contactar servicios externos; no añadir Redis salvo evidencia de necesidad.
