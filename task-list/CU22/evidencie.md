# Evidencia CU-22 — en curso

Se amplió la prueba de integración existente «accepts one explicit retry for a transient failure and reuses the same idempotent job» para enviar dos solicitudes retry simultáneas. Comprueba 202 para ambas, mismo ID/estado, un solo intento fallido antes del worker y exactamente un segundo intento completado después de procesar una vez.

Local: `pnpm --filter @fragments/api exec vitest run src/features/review/worker-http.test.ts` se omitió (suite requiere `DATABASE_URL`; Docker local no está disponible). Typecheck pendiente de registrar. CI debe ejecutar la integración contra `fragments_test`.

Sin proveedor real, sin solicitudes pagadas y sin escrituras productivas. CU-22 permanece NO COMPROBADO hasta CI; recorrido autenticado Ego Lite y verificación de snapshot/SHA de una Review real están pendientes.
