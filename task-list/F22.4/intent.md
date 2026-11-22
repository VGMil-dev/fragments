# F22.4 — Feed efímero de auditoría admin

## Problema

F22.2 y F22.3 ya emiten a stdout eventos reales de lecturas administrativas. La consola solo muestra requests generales y no tiene un feed operativo de estos eventos auditados.

## Objetivo

Proveer a la integración arquitectónica un sink de auditoría que conserve un feed breve en memoria de eventos realmente escritos por F22.2/F22.3 y permita su lectura de forma segura.

## Límites

- No persistir en PostgreSQL ni prometer historial previo o después de reiniciar API.
- Aceptar únicamente eventos existentes `admin.classroom_requests.read` y `admin.queue_summary.read`.
- El sink operativo de stdout sigue siendo el destino existente y debe confirmar escritura antes de publicar el resumen en memoria.
- La proyección del feed solo contiene UUID `requestId` generado por middleware, evento, hora UTC y `actorType: admin`; nunca `adminActorId`, datos de estudiantes, ruta, query, cuerpo ni payload.
- La integración de la ruta/UI protegida, autorización Better Auth y auditoría previa a lectura pertenece al arquitecto.
