# Especificación F22.7 — Estados de acceso del feed

- Si la lectura del feed falla con `AUTH_REQUIRED`, la pantalla explica que no existe una sesión válida y que se requiere una cuenta con rol de administración.
- Si falla con `FORBIDDEN`, la pantalla explica que la cuenta actual no tiene el rol de administración y sugiere solicitarlo o volver a acceder con una cuenta administradora.
- No se imprime el mensaje arbitrario enviado por el servidor.
- Otros errores conservan un mensaje genérico recuperable.
- El botón de reintento continúa disponible; la API, su autorización y la muestra de eventos no cambian.

## Verificación

- Prueba focal con respuesta sintética 401/403 y verificación de no exposición de detalles privados.
- Typecheck web y `git diff --check`.
