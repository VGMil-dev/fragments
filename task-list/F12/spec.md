# F12 — Especificación

## Entradas
- Rama Trainer `codex/v0.3.0-trainer`, HEAD `05ba030`.
- Rama Mentor `codex/mentor-control`, HEAD `81b185d`; implementación F11 `15491a9`.
- Base común `8ae8b5537c1f136d422ba122566d668c741687e5`.

## Salida
Rama local `codex/v0.3.0-integration`, con merges ordinarios, F10/F10.1 y F11 preservadas, y migraciones v1–v9 únicas.

## Aceptación
- GIVEN SQLite limpia WHEN inicia la API THEN están presentes Trainer y Mentor y nueve migraciones.
- GIVEN base F10.1 en v8 WHEN migra THEN agrega Mentor en v9 sin perder bancos, intentos o historial.
- GIVEN esquema compatible con v0.2.0 WHEN migra THEN conserva Review/Mentor/Inspector y agrega las superficies nuevas.
- GIVEN la rúbrica publicada WHEN Mentor evalúa THEN conserva cálculo de servidor verified=100%, not_verified=ceil(50%), failed=0.
- GIVEN acceso docente ausente WHEN se solicita control Mentor o Inspector THEN backend requiere sesión docente.
- Las pruebas usan fake providers; no contactan AI Gateway, GitHub, Moodle ni producción.
