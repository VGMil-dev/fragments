# Especificación F22.11 — Muestra operativa Review

- Al emitir una notificación Review, el API proyecta una forma segura una vez, la registra en memoria y escribe esa misma proyección a stdout.
- La proyección incluye timestamp UTC, tipo de evento, IDs v4 de Review/job, etapa, código de error allowlist, resultado, intento/duración y resumen de Gateway sanitizado. Sin payloads, identidad de estudiantes, prompts o mensajes crudos.
- La muestra conserva hasta 100 eventos más recientes por proceso; el endpoint devuelve 1–50 y la respuesta del cliente exige forma estricta.
- `GET /api/admin/review-events?limit=1..50` requiere Better Auth admin y registra `admin.review_events.read` antes de leer; respuestas anónimas 401, docente 403, sink/auditoría indisponible 503 y query inválida 400.
- La pantalla `/admin/review-events` presenta hora UTC, etapa, estado, intento/duración y correlación; describe el límite volátil y permite reintentar carga.
- La lectura queda visible en el feed de auditoría administrativa.
- No cambiar tablas, migraciones, almacenamiento ni contratos compartidos. No inspeccionar o leer stdout del host.

## Verificación

- Pruebas API con eventos fake: buffer/límites/copia, autorización, audit-before-read, sink fail-closed, filtros de query.
- Pruebas web con respuestas fake: allowlist del cliente, redacción de errores HTTP, estados, refresh y timestamp.
- Suite API y web, typecheck/build y `git diff --check`.
- Acceso admin/Ego Lite productivo y eventos reales se registran aparte como NO COMPROBADOS si no existe esa sesión.
- Prueba de integración con worker/evaluador fake: completar un Review, registrar el evento en el mismo buffer que consulta el endpoint admin y comprobar el allowlist y la auditoría antes de leer. La base de test exige hostname loopback y `fragments_test`, valida `current_database()` antes de escribir y limpia solo IDs creados por el fixture.
