# Especificación F22.8 — Estados de acceso admin

Para `/admin/teachers` y `/admin/diagnostics`:

- `AUTH_REQUIRED`: indicar que hace falta iniciar sesión con una cuenta administradora.
- `FORBIDDEN`: indicar que la cuenta actual no tiene permisos de administración y sugerir solicitar acceso o usar una cuenta administradora.
- Cualquier otro código o rechazo de transporte conserva el mensaje genérico existente.
- No mostrar el texto arbitrario del error del servidor.
- Conservar el botón `Reintentar`; cada superficie vuelve a invocar su API existente.
- No cambiar autenticación/autorización, API, contratos, rutas, esquema ni migraciones.

## Verificación

- Vitest focal para las dos pantallas, typecheck web y `git diff --check`.
