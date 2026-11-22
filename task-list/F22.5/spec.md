# Especificación F22.5 — Directorio read-only de docentes

## Servicio API

- `parseAdminTeachersQuery` permite solo `limit` y `cursor`, sin repetidos ni claves desconocidas.
- `limit` por defecto 20, entero decimal canónico de 1 a 50; cualquier valor fuera de rango devuelve inválido.
- Cursor base64url contiene exactamente `{accountId, createdAt}`; se valida forma, longitud y fecha UTC canónica antes de consultar.
- Repository filtra `isTeacher: true` y excluye `admin` como token en cualquier posición del CSV de `role`, en línea con `role.split(",").includes("admin")` de Better Auth. El filtro cubre el token único, primero, intermedio y final; roles que no contienen ese token permanecen elegibles.
- Orden estable `createdAt DESC, id DESC`; lee hasta `limit + 1` filas con keyset sobre los mismos campos.
- El DTO contiene solamente `accountId`, `displayName`, `email`, `createdAt` y `nextCursor`.
- El handler local atiende `GET /api/admin/teachers`, valida admin, valida query, obtiene actor y escribe `admin.teachers.list` antes de pedir el directorio. Fallo de identidad/sink es 503 y no se consulta el store; las denegaciones no hacen auditoría ni lectura.
- El método no GET ni paths distintos queda sin manejar. Las respuestas incluyen `no-store` y redacción de errores.

## Panel web aislado

- `AdminTeachersPanel` recibe un API inyectado; no agrega navegación/ruta compartida.
- Muestra solamente los cuatro campos autorizados, páginas con cursor, estado de carga, vacío y error recuperable.
- Solo dispone de actualización y navegación; no incluye acciones de mutación. Al fallar una página posterior, `Reintentar` conserva su cursor y se mantiene `Anterior` para volver a la página previa.
- Cliente GET usa `credentials: same-origin`, `cache: no-store`, ruta fija y valida estructura exacta, rechazando propiedades adicionales.

## Pruebas

- Fixtures API: filtro/selección/order/cursor de Prisma fake, parse estricto, DTO sin extensiones, admin/teacher/anónimo, auditoría-before-read y fallo cerrado.
- Fixtures web: request same-origin, schema de respuesta exacto, tabla read-only, estados recuperables y paginación.
- No usar producción, base de datos, OAuth, GitHub ni proveedores IA.
