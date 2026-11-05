# F03 — Specification

**Objetivo:** API HTTP S0 y base de persistencia segura.

## Entrada y salida
- HTTP JSON validado en la ruta de sesión docente y envelope `ApiResult` uniforme de `@fragments/contracts`; los contratos congelados no contienen DTO de login, así que su esquema de entrada queda local a HTTP.
- `GET /health` informa estado del proceso y readiness de SQLite sin exponer configuración.
- SQLite en modo WAL con migraciones versionadas; database path solo desde servidor.
- Tabla de jobs con estado, intentos, idempotencia, lease/heartbeat y recuperación de leases vencidos.
- Login/sesión docente mínima preparada mediante servicio y verificador inyectable; secreto de sesión solo servidor y auth no habilitada si falta.
- Fake drivers para pruebas, sin Gateway ni GitHub.

## Criterios GIVEN / WHEN / THEN
- [x] GIVEN proceso iniciado con base válida, WHEN `GET /health`, THEN devuelve estado saludable y no incluye secretos.
- [x] GIVEN entrada HTTP inválida, WHEN llega a una ruta, THEN responde con envelope uniforme y sin reflejar valores sensibles.
- [x] GIVEN dos workers reclaman un job, WHEN se ejecuta la transacción de lease, THEN un solo worker posee el lease vigente.
- [x] GIVEN un job cuyo lease venció, WHEN la cola recupera vencidos, THEN puede reclamarse de nuevo de forma idempotente.
- [x] GIVEN falta `BETTER_AUTH_SECRET`, WHEN se habilita auth, THEN el proceso falla de forma segura sin emitir sesión (auth docente sustituida por F06/Better Auth).
- [x] GIVEN el compose de desarrollo, WHEN se levanta, THEN API y SQLite readiness responden; volúmenes conservan datos al reinicio.
- [x] GIVEN imagen para arquitectura ARM64, WHEN se construye, THEN Dockerfile mantiene runtime y build compatibles sin ejecutar código de estudiante.

## Pruebas y límites
- Test de rutas, migraciones, transacciones de lease, auth y configuración redactada.
- Docker Compose local/producción en archivos separados o perfiles claros.
- No ejecutar código ajeno ni contactar servicios externos; no añadir Redis salvo evidencia de necesidad.

La app principal falla de forma cerrada si `AUTH_ENABLED=true` hasta cablear un adaptador real de credenciales. La integración probada usa un verificador fake identificado como fixture.
