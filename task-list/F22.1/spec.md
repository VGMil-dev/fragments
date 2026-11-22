# Especificación F22.1 — Diagnósticos de solicitudes API

## Rutas y permisos

- `GET /api/admin/diagnostics/requests?limit=N` devuelve hasta 50 eventos recientes.
- La lectura requiere rol Better Auth `admin` explícito. Un teacher, student o sesión anónima recibe 403/401 y cero eventos.
- La ruta no acepta identidad, filtro libre de URL ni campos de autorización del cliente.
- Root integrator conectará el handler en `apps/api/src/http/app.ts` y agregará la capacidad explícita admin al servicio Better Auth. No exponer un endpoint admin mediante `teacherId`.

## Evento seguro

Campos permitidos: `requestId`, `occurredAt` UTC, método HTTP de allowlist, `routeFamily` de allowlist, status code y `durationMs` no negativo. El servidor genera `requestId`; no confiar en un header enviado por cliente.

Nunca almacenar o mostrar URL/query crudos, IP, User-Agent, identidad, cookies, Authorization, headers, body, código, prompts, errores internos o datos de usuario. El buffer tiene máximo 100 eventos; `limit` se acota entre 1 y 50. El evento se emite a stdout tras completar la respuesta y se conserva en memoria para lectura rápida.

## UI

`AdminDiagnosticsScreen` recibe los eventos del API y presenta fecha, método, familia de ruta, status, duración y request ID; estados de carga, vacío y error; actualización manual; teclado y tokens F16. La pantalla puede integrarse desde ruta compartida por el arquitecto, no incorpora otros shells ni acciones.

## Verificación

- Unit tests cubren allowlists, redacción, límite/orden del buffer y status/duración reales.
- HTTP tests comprueban admin 200, teacher 403, anónimo 401 y límite/forma.
- Web tests cubren vista de datos reales del endpoint fakeado, vacío, error y actualización.
- No invocar bases productivas, proveedores AI, GitHub externo ni VPS.
