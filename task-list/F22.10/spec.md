# Especificación F22.10 — Proyección segura de eventos Review

- Aceptar solo `review.attempt.finished`, `review.queue.poll_failed` y `review.lease.recovered`.
- Aceptar únicamente las etapas, códigos de error y estados finales enumerados por el dominio Review.
- Enviar solo `event`, UUID v4 de `reviewId`/`jobId` (o `null`), `stage`, `errorCode`, `durationMs`, `attempt`, `finalStatus` y el resumen de gateway con campos permitidos.
- El resumen gateway conserva solo códigos conocidos de allowlists exactas, estados HTTP válidos, UUID de generación y espera máxima de 24 horas; valores desconocidos o malformados se representan como `null`.
- Ignorar propiedades runtime adicionales, incluidas cadenas que pudieran contener prompts, datos privados o tokens.
- El writer es inyectable para pruebas; los fallos síncronos o promesas rechazadas no escapan al worker. El writer predeterminado escribe una línea JSON en stdout con callback y manejo local de errores del stream.
- No modificar persistencia, jobs, rutas compartidas, contratos, interfaz ni configuración externa.

## Verificación

- Prueba unitaria con writer fake: allowlist, saneamiento de valores y tolerancia a fallo del sink.
- Suite API, build/typecheck API y `git diff --check`.
- Ninguna prueba requiere credenciales, DB, proveedor IA o despliegue.
