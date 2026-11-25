# CU-33 — Especificación

## Alcance

- Si una API administrativa devuelve `AUTH_REQUIRED` o `FORBIDDEN`, `/admin` y `/admin/ai-diagnostics` no muestran la navegación de administración.
- Los errores de red/servidor no se interpretan como falta de rol; se conserva la navegación para permitir reintentar.
- Si las lecturas están autorizadas, se conserva la navegación actual. Las demás pantallas quedan fuera de este incremento.
- El backend sigue siendo la autoridad de acceso; no se exponen datos adicionales ni se cambia ningún endpoint.

## Verificación

- Vitest focal para `AdminOverviewScreen` y `AdminAiDiagnosticsScreen`: acceso denegado y error recuperable; el resumen también comprueba la navegación autorizada.
- Suite web, typecheck y build.
- Producción/Ego Lite quedan pendientes hasta que los Spaces existentes estén disponibles y se despliegue mediante F14.
