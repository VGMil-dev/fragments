# CU-33 — Especificación

## Alcance

- Si una API administrativa devuelve `AUTH_REQUIRED` o `FORBIDDEN`, cualquiera de las diez rutas del panel no muestra la navegación de administración.
- Los errores de red/servidor no se interpretan como falta de rol; se conserva la navegación para permitir reintentar.
- Si las lecturas están autorizadas, se conserva la navegación actual.
- El backend sigue siendo la autoridad de acceso; no se exponen datos adicionales ni se cambia ningún endpoint.

## Verificación

- Vitest focal para el componente de navegación y cada familia de pantallas: acceso denegado, error recuperable y navegación autorizada.
- Suite web, typecheck y build.
- Producción/Ego Lite quedan pendientes hasta que los Spaces existentes estén disponibles y se despliegue mediante F14.
