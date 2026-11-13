# Especificación F15.2

## Identidad y sesión

- La autorización estudiantil exige sesión Better Auth y una asociación `account.providerId=github` con `accountId` estable, no vacío.
- `user.id` conserva la propiedad de propuestas y revisiones. Correo y `githubLogin` son atributos, no identificadores de propiedad.
- `githubLogin` y `profileUrl` pueden faltar sin invalidar una sesión GitHub válida; la UI muestra una identidad neutral en ese caso.
- Better Auth conserva `disableImplicitLinking: true`. Colisiones existentes se explican como un conflicto de identidad; no se unen por correo.
- `/api/me` informa estados seguros y no personales: `session_required`, `role_not_student`, `github_account_not_linked`, `invalid_github_identity`.
- Un error HTTP, respuesta inválida o indisponibilidad temporal muestra un estado recuperable y acción de reintento, no un rechazo de elegibilidad.

## Rutas y permisos

- `/api/teacher/mentor-control` llega al handler de Mentor y consulta estado/configuración para un docente autenticado.
- Anónimo recibe 401; estudiante autenticado recibe 403; docente recibe 200. Ningún inicio GitHub cambia roles.
- Los endpoints académicos conservan su autorización por rol y respuestas de 401/403/404.
- La sección Cuenta y acceso docente sigue exigiendo sesión docente, confirmación reciente de contraseña y `linkSocial` explícito.

## Datos y UI

- Las propuestas y revisiones existentes permanecen asociadas al mismo `user.id` al cambiar correo o login GitHub.
- OAuth solicita solo los permisos GitHub ya definidos (`read:user`, `user:email`), no acceso a repositorios.
- Mensajes en español distinguen sesión ausente, conflicto de enlace, rol y error temporal sin mostrar correos, IDs, tokens o cookies.

## Criterios GIVEN / WHEN / THEN

- GIVEN una sesión con asociación GitHub estable y email personal, WHEN `/api/me` responde, THEN la identidad se autoriza aunque `githubLogin` esté ausente.
- GIVEN el mismo usuario con cambios sintéticos de correo y login, WHEN consulta sus propuestas, THEN `owner_user_id` conserva el mismo usuario.
- GIVEN cuenta autenticada sin GitHub asociado, WHEN consulta `/api/me`, THEN recibe `github_account_not_linked` sin datos personales.
- GIVEN proveedor GitHub con ID vacío, WHEN se valida el perfil, THEN el acceso se deniega como `invalid_github_identity`.
- GIVEN fallo temporal de `/api/me`, WHEN se carga la pantalla OAuth, THEN aparece un error recuperable con botón de reintento.
- GIVEN request anónimo, estudiante y docente, WHEN consultan el control de Mentor, THEN obtienen respectivamente 401, 403 y 200.
- GIVEN una cuenta docente vinculada explícitamente, WHEN se reinicia sesión por GitHub, THEN mantiene el mismo usuario y rol; esta condición requiere prueba real humana en producción.

## Matriz del plan de aceptación F15.2

- Automatizable localmente: cuenta personal sin dominio institucional, asociación estable con `accountId`, cambios sintéticos de email/login, propiedad por `user.id`, cuenta sin proveedor asociado, ID GitHub vacío, sesión expirada, backend temporalmente no disponible, rutas 401/403/200, `disableImplicitLinking`, y ausencia de permisos de repositorios.
- Revisión de código y fixtures: errores de conflicto `account_not_linked`, navegación por rol emitido por servidor, ownership de galería e historial y ausencia de datos personales en respuestas de `/api/me`.
- Requiere identidad real/consentimiento humano: OAuth de estudiante por el botón normal, vinculación docente con contraseña y consentimiento GitHub, cierre de sesión y reingreso docente por GitHub, y revisión de permisos con esas sesiones reales.
- Requiere publicación protegida F14: confirmar la UI/rutas corregidas en producción, versión/SHA, integridad SQLite y sesión real en la versión publicada. No inferir estos resultados de tests locales ni de una respuesta de OAuth aislada.
