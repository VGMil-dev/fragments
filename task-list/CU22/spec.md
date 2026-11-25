# Especificación CU-22 — idempotencia de reintento

## Aceptación

- Preparar Review fallida con `retryClass=transient` y `errorCode=GITHUB_RATE_LIMITED` en PostgreSQL aislado.
- Enviar dos `POST /api/reviews/:id/retry` concurrentes.
- Ambos reciben el mismo ID y estado queued; el historial sigue con el intento 1 antes de que el worker corra.
- Ejecutar worker fake una sola vez; estado completed, intento 2 finalizado y exactamente dos registros de intento en total.
- Reintento manual por resultado IA ambiguo sigue bloqueado en prueba existente; no se modifica scoring/proveedor.

## Límites

Fixtures PostgreSQL efímeras y fake; ninguna llamada IA real, a GitHub ni a producción. Ego Lite del caso sigue pendiente.
