# Especificación F22.17

## Operación

- Script explícito `provision:admin-existing-teacher`; no se ejecuta al arrancar la API ni en el release.
- Requiere `FRAGMENTS_ADMIN_EMAIL` y `FRAGMENTS_ADMIN_CONFIRM_EMAIL` iguales tras normalización de correo.
- Busca por correo sin distinguir mayúsculas y exige exactamente una cuenta existente con `isTeacher=true`.
- Añade el token `admin` a `user.role`, conserva otros roles válidos y `isTeacher`; cambio condicional por id, rol observado y `isTeacher=true`; verifica lectura posterior.
- Si ya es admin, no cambia la fila. Nunca crea usuario ni cambia `isTeacher`, credenciales, cuenta, sesión o datos de terceros.
- Solo después de verificar admin, Better Auth solicita recovery con el callback de reset existente. El comando requiere que el sender Resend confirme HTTP 2xx; imprime solo estado y, si existe, el ID del mensaje.
- Compose agrega un servicio `bootstrap-admin` manual bajo perfil aislado, con solo DB runtime, Better Auth y variables Resend necesarias; nunca forma parte de `up` normal.

## Resultado de aceptación productiva · 2026-11-24

- Merge #267 y red egress #268; release F14 `v0.5.71` aplicada en el SHA exacto y salud ok/ready.
- Promoción de cuenta existente, preservación de `isTeacher`, aceptación Resend y render del formulario `/teacher/reset-password`: PASS.
- Login autenticado, rol observable desde una sesión y acceso a `/admin` y `/teacher/dashboard`: NO COMPROBADOS; requieren que el propietario use el correo para establecer la contraseña definitiva.

## Pruebas

Casos fake: confirmaciones diferentes/ausentes, correo inválido, cero/múltiples cuentas, usuario no docente, promoción, idempotencia, carrera/lectura posterior inconsistente. Sender Resend: solo 2xx se considera aceptación y no se exponen cuerpo/token/credencial. Sin base productiva ni llamada real a Resend en CI.

## Aceptación productiva

Tras merge y F14 autorizados: comprobar exclusivamente la cuenta indicada y preservar `isTeacher`; confirmar proveedor aceptó recovery; Ego Lite confirma login, rol admin y dashboard `/admin` sin cerrar sesiones preexistentes. Se comprobó que la UI docente y el formulario de recovery cargan en Ego Lite, pero no el login ni el dashboard autenticado. No marcar la aceptación productiva completa hasta que el propietario establezca la contraseña y se verifique el acceso; ver `evidencie.md`.
