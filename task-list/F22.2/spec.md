# Especificación F22.2 — Lectura de solicitudes académicas

## API feature-local

- `GET /api/admin/classroom-requests?limit=50&offset=0&status=pending` (status opcional; enum cerrado).
- Solo rol admin explícito: 401 anónimo, 403 rol no admin y sin datos.
- Cada lectura admin completada requiere callback de auditoría inyectado con request ID generado por servidor, evento `admin.classroom_requests.read`, timestamp UTC y admin actor ID; el actor ID nunca forma parte del DTO. Si no se puede resolver actor o escribir auditoría, responder error sin registros.
- Respuesta paginada: aula/título/área/período, estado actual, origen (`join_code` o `teacher_assignment`), fecha de solicitud y decisión. Nunca seleccionar ni serializar datos del estudiante, correo, contexto del aula, IDs/credenciales de actores.
- Limitar `limit` a 50 y offset a rango acotado. Ordenar fecha descendente con desempate estable.
- Solo lectura sobre el modelo existente. No migraciones ni writes.
- El sink stdout estructurado no garantiza retención; retención/rotación depende de la plataforma del proceso y permanece sin verificar. Sin persistencia en base para F22.2.

## UI feature-local

Tabla de estado observables con filtros por estado, actualización y paginación; carga/vacío/error/reintento accesibles. El cliente solo acepta campos allowlist.

## Integración

El arquitecto conecta el handler en `apps/api/src/http/app.ts`, rol Better Auth y ruta/nav web. No modificar archivos compartidos desde este slice.

## Verificación

Unit/HTTP tests con fake store etiquetado verifican 401/403, filtros, orden/paginación, exclusión de identidad y estado. Web tests con fake API verifican estados, filtros y paginación. Typechecks focalizados y `git diff --check`.
