# F15.1 — Especificación

## API

- `GET /api/teacher/account`: sesión docente/admin requerida; devuelve solo si hay cuenta `credential` y si GitHub está conectado.
- `POST /api/teacher/account/github/link`: exige origen confiable, JSON estricto con contraseña, sesión docente y confirmación de contraseña reciente; valida de nuevo la sesión/rol, limita intentos y crea el estado OAuth de Better Auth. Devuelve URL únicamente de `https://github.com/login/oauth/authorize` y cookies de estado; no crea una asociación antes del callback.
- `/api/auth/link-social` queda bloqueado para clientes; el servidor llama la API interna de Better Auth solo después de la reautenticación.

## UI

- El área docente incorpora «Cuenta y acceso», estado de GitHub y una acción de vinculación.
- Antes de salir hacia GitHub solicita la contraseña actual; limpia el campo al enviar y permite cancelar.
- Al regresar, consulta de nuevo el estado almacenado para confirmar la vinculación antes de mostrar éxito.
- El login GitHub vuelve a `/auth/complete`; esa ruta consulta la sesión Better Auth y redirige a docentes/admin al espacio docente existente, o a estudiantes solo si `/api/me` confirma un perfil GitHub habilitado.

## Datos y permisos

- Better Auth es responsable de validar el `state`, el usuario existente y la vinculación de cuenta.
- `disableImplicitLinking: true` permanece activo. No se actualiza `isTeacher`, rol, correo, ni campos de la identidad con datos enviados por el cliente.
- Una identidad GitHub ya vinculada a otro usuario no se reasigna; los conflictos del callback siguen sujetos a la protección de Better Auth.

## Aceptación (GIVEN / WHEN / THEN)

- GIVEN una sesión anónima o estudiantil, WHEN consulta o inicia la vinculación, THEN recibe 401/403 y no se modifica ninguna cuenta.
- GIVEN un origen no confiable o una contraseña errónea, WHEN solicita vincular, THEN se rechaza sin emitir estado OAuth y sin asociación; intentos repetidos se limitan.
- GIVEN una sesión docente, contraseña correcta y GitHub no asociado, WHEN solicita vincular, THEN recibe autorización GitHub con cookies OAuth protegidas y aún no existe fila de cuenta GitHub hasta el callback.
- GIVEN la cuenta docente ya asociada, WHEN intenta repetir la vinculación, THEN recibe conflicto y permanece intacta.
- GIVEN un callback GitHub, WHEN la UI vuelve, THEN anuncia éxito únicamente si el API confirma `githubConnected` para la sesión docente.
- GIVEN un login posterior de una identidad vinculada, WHEN Better Auth resuelve la sesión, THEN la ruta final usa el rol del usuario existente y no permite que GitHub añada rol docente.
- GIVEN viewport 390 px o escritorio, WHEN se abre «Cuenta y acceso», THEN el estado y formulario siguen siendo legibles sin desbordamiento horizontal.
