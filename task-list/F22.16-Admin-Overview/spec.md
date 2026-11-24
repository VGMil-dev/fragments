# Especificación F22.16

- Añadir una vista `/admin` de solo lectura que consuma los clientes existentes de diagnósticos y cola; el acceso a datos sigue protegido por Better Auth/admin backend.
- Mostrar conteos reales de cola (pendientes, leases, leases vencidos, fallidos, completados) y la hora de muestra devuelta por API.
- Resumir errores HTTP 5xx dentro de la muestra limitada de solicitudes; si se listan eventos, solo mostrar campos ya allowlisted: UTC, familia de ruta, método, status, duración y requestId.
- Ofrecer enlaces a cola, diagnósticos y feeds existentes. Etiquetar con claridad que los diagnósticos son la muestra reciente devuelta, no un historial temporal completo.
- Representar carga, error (incluye 401/403), muestra vacía y datos disponibles; nunca sustituir estados fallidos por ceros.
- No añadir endpoints, tablas, migraciones, contratos, acciones privilegiadas, datos fake en runtime, métricas/costos no disponibles, ni leer secretos o contenido académico privado.
- Probar UI con APIs fake etiquetadas y validar typecheck/build. El arquitecto integrará la ruta `/admin` y la navegación compartida.
