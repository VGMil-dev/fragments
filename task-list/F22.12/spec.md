# Especificación F22.12 — Feed de eventos Mentor

## Evento permitido

- `mentor_evaluation_completed` o `mentor_evaluation_failed`.
- Etapas concretas de Mentor desde una allowlist de dominio.
- Resultado, código de error genérico allowlisted, duración acotada y fecha UTC canónica.
- Sin propuesta/estudiante/aula/usuario/request IDs, puntuaciones, criterios, texto libre, excepciones, tokens, cabeceras, cookies o detalles de modelo/proveedor.

## Retención

- Buffer en proceso con máximo 100 eventos; página admin de máximo 50.
- Evento inválido se rechaza o proyecta a valores seguros; jamás serializar el objeto de entrada completo.
- Fallo de sink no altera la respuesta ni el resultado académico de la petición.

## Rutas

- `GET /api/admin/mentor-events?limit=50`: solo admin Better Auth; validar `limit` entre 1 y 50; escribir `admin.mentor_events.read` en el audit log antes de leer; auth/audit no disponibles fallan cerrado.
- `/admin/mentor-events`: vista administrativa de solo lectura con estados de carga, vacío, error/403 y reintento, accesible y responsive.

## Verificación

- Pruebas API/UI con fakes para éxito, fallo, redacción, límites, auditoría antes de lectura, 401/403 y fallo cerrado.
- Una prueba compuesta con proveedor Mentor fake confirma evaluación HTTP → buffer operativo → GET admin autorizado, auditoría antes de lectura y respuesta redactada.
- Typecheck, pruebas focales y `git diff --check`; CI requerido en PR.
- Pruebas usan únicamente evaluador Mentor fake; sin requests a Gateway, sin producción y sin escrituras de datos académicos.
- La existencia de eventos productivos no se infiere a partir de pruebas fake.
