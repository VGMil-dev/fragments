# Especificación — INC-REVIEW-2026-11-16

## Entradas

- Registros de trabajos Review, configuración desplegada y snapshot SQLite preservado.
- Repositorio/API, lector GitHub, Repomix, adaptador Gateway/ledger, Better Auth y Nginx.

## Salidas

- Error operacional normalizado por etapa, intento y duración, sin excepciones ni contenido del repositorio.
- Historial durable de intentos Review y reintentos manuales con compare-and-transition bajo transacción SQLite.
- Endpoint explícito `POST /api/reviews/:id/retry`; conserva `idempotency_key` e ID de trabajo, reusa resultado completado y limita intentos.
- Log Nginx JSON sin URL, query, Referer, IP, agente de usuario o valores de verificación.
- Better Auth toma la IP solo de `X-Real-IP`, que Nginx sobrescribe desde el proxy Cloudflare del túnel; límites de autenticación permanecen activos.

## Criterios de aceptación

- GIVEN una misma entrada completada, WHEN se vuelve a solicitar, THEN se devuelve el resultado existente y no se crea evaluación/cobro nuevo.
- GIVEN un trabajo fallido clasificado transitorio, WHEN estudiante solicita retry, THEN exactamente una transición atómica lo devuelve a cola, respetando backoff y máximo de intentos.
- GIVEN un error permanente o ambiguo después del despacho IA, WHEN solicita retry, THEN no se vuelve a despachar automáticamente y se devuelve una respuesta pública genérica.
- GIVEN solicitudes concurrentes de retry, WHEN compiten por el mismo trabajo fallido, THEN solo una transición cambia el estado y existe un solo siguiente intento.
- GIVEN cualquier fallo interno, WHEN se registra, THEN el evento contiene `reviewId`, `jobId`, etapa, código normalizado, duración, número de intento y estado final; nunca mensaje de excepción, request body, token, cookie o datos de repositorio.
- GIVEN una callback OAuth con query, WHEN Nginx registra acceso, THEN los logs no guardan query, Referer, dirección IP ni ruta con código de verificación.
- GIVEN Nginx configura el origen, WHEN cliente envía un `X-Real-IP` falso, THEN Nginx lo sustituye por el valor de `CF-Connecting-IP` recibido desde el túnel; Better Auth no usa una cadena `X-Forwarded-For` no confiable.
- GIVEN config propuesta, WHEN `nginx -t` y la suite autorizada se ejecutan, THEN Nginx valida y las regresiones pasan en dos rondas independientes limpias.

## Recuperación de los seis trabajos

Mantener IDs y payloads en la copia protegida. Clasificar como `legacy_unclassified/manual` hasta contar con evidencia de etapa. Después de desplegar la corrección, pedir a cada estudiante verificar repositorio/commit y aceptar una re-ejecución manual individual; no reenviar trabajos en lote ni reprocesar errores ambiguos de IA sin reconciliar ledger.
