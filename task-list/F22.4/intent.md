# F22.4 — Feed efímero de auditoría admin

## Problema

F22.2 y F22.3 ya emiten a stdout eventos reales de lecturas administrativas. La consola solo muestra requests generales y no tiene un feed operativo de estos eventos auditados.

## Objetivo

Conservar un feed breve en memoria de eventos realmente escritos por F22.2/F22.3 y exponerlo en una vista administrativa de solo lectura con autenticación Better Auth, auditoría previa a cada lectura y redacción de identidad en la proyección.

## Límites

- No persistir en PostgreSQL ni prometer historial previo o después de reiniciar API.
- Aceptar únicamente eventos existentes `admin.classroom_requests.read`, `admin.queue_summary.read` y `admin.audit_log.read`.
- El sink operativo de stdout sigue siendo el destino existente y debe confirmar escritura antes de publicar el resumen en memoria.
- La proyección del feed solo contiene UUID `requestId` generado por middleware, evento, hora UTC y `actorType: admin`; nunca `adminActorId`, datos de estudiantes, ruta, query, cuerpo ni payload.
- La ruta requiere admin Better Auth y registra `admin.audit_log.read` antes de consultar el buffer. La respuesta omite el propio `requestId` para no mostrarse hasta la próxima lectura.
- La UI explica que el buffer solo conserva eventos desde el arranque del API; no simula historial ni inspecciona el stdout del host.
- El arquitecto integra writer, ruta, diagnósticos y UI sin contratos, migraciones, operaciones productivas ni acceso al host.
