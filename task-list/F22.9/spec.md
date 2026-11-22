# Especificación F22.9 — Mensajes de acceso para solicitudes y cola

Para `AdminRequestsScreen` y `AdminQueueSummaryScreen`:

- `AUTH_REQUIRED`: mensaje estático que indica iniciar sesión con cuenta administradora.
- `FORBIDDEN`: mensaje estático que indica permisos de administración insuficientes y sugiere solicitar acceso o usar una cuenta administradora.
- Cualquier otro código o rechazo usa el mensaje genérico existente.
- No renderizar texto arbitrario del servidor.
- Mantener el botón `Reintentar`.
- En solicitudes, reintentar conserva offset y filtro seleccionados.
- No cambiar endpoint, API, tipos/contracts, permisos, rutas compartidas ni migraciones.

## Verificación

- Pruebas UI focales para ambas pantallas con respuestas sintéticas.
- Typecheck de web y `git diff --check`.
