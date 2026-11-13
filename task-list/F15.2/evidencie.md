# F15.2 — Evidencia

## Estado

Implementación local en rama `codex/f15-2-oauth-roles`, basada en `origin/main` `b7810f9bfb41c00a7db1f998badb3770fe710185`. No declarar F15 completa hasta pasar la verificación OAuth real estudiantil y docente en producción.

Commits de implementación: `6179b79` (`fix(f15.2): estabiliza identidad y permisos OAuth`) y `003028a` (`fix(auth): informa identidad GitHub inválida`). Autoría local usa el mismo noreply verificado en el historial del repositorio.

## Diagnóstico con evidencia

- En `apps/api/src/http/app.ts`, `academicHandler` se ejecuta antes de `mentorControlHandler`.
- `apps/api/src/features/mentor/academic-http.ts` tenía un catch-all `/api/teacher/*` que terminaba en 404 «No se encontró la ruta docente»; el endpoint Mentor nunca alcanzaba su handler. Prueba integrada roja antes del arreglo: `GET /api/teacher/mentor-control` de docente devolvió 404 esperado 200.
- La pantalla de la captura se muestra luego de obtener una sesión Better Auth y de que `/api/me` no confirme un perfil. El código no consulta correo ni dominio; exigía, sin embargo, que `githubLogin` estuviera presente además de la asociación estable. Prueba integrada roja con correo sintético personal, `accountId` GitHub estable y login visible nulo: `/api/me` devolvió `authenticated:false`.
- La captura por sí sola no permite concluir por qué esa sesión real no calificó. F15.2 añade razones no personales para determinarlo al repetir la prueba; no registra PII.
- Revisión independiente Security Auditor y Detective OAuth coincidieron en la causa del 404 y límites del diagnóstico del alumno. El Pez Dorado dejó el OAuth real como FAIL/INCONCLUSIVE hasta prueba productiva.

## Cambios locales

- `apps/api/src/http/app.ts` se probará a través de la composición existente; el handler académico dejará pasar la ruta Mentor al handler correspondiente.
- `apps/api/src/features/mentor/control-http.ts` distinguirá anónimo 401 de rol insuficiente 403.
- `/api/me` usará sesión + asociación GitHub estable, aceptará login público nulo y devolverá motivos de rechazo seguros.
- `OAuthCompletionScreen` distinguirá sesión, asociación, identidad, rol y caída temporal; la caída ofrece reintento. `StudentLoginScreen` también permite reintentar el estado inicial.
- El perfil del estudiante muestra «Cuenta GitHub» si el dato público no está disponible.
- `disableImplicitLinking` permanece activo; el rol y la propiedad siguen saliendo del servidor.

## Verificación local fresca

- `pnpm install --offline --frozen-lockfile --ignore-scripts`: 308 paquetes reutilizados, 0 descargados; sin scripts.
- Pruebas rojas previas al arreglo: rutas docente 404 en vez de 200; perfil con cuenta estable y login ausente devuelto como no autenticado; UI no distinguía 503.
- `pnpm --filter @fragments/contracts build`: exitoso.
- `pnpm test`: Turbo 4/4 tareas exitosas: API 29 archivos/118 pruebas, web 20 archivos/78 pruebas y contratos 1 archivo/19 pruebas.
- Nuevas regresiones: sesión Better Auth expirada y conservación de propuesta/publicación cuando cambian email y login. Prueba dirigida (`pnpm --filter @fragments/api exec vitest run src/auth/better-auth.test.ts src/features/mentor/academic-repository.test.ts`): 2 archivos, 14 pruebas pasan. La primera ejecución roja mostró que el fixture de expiración debía usar el formato de fecha ISO de SQLite; el caso corregido pasa.
- Al añadir estas regresiones también se exige lectura de sesión sin cookie cache para `studentAccess`, `teacherId` y `userId`, evitando que estado de sesión cacheado desplace la expiración/revocación vigente en base de datos.
- `pnpm typecheck`: Turbo 4/4 exitosas.
- `pnpm lint`: Turbo 1/1 tarea disponible (contratos) exit 0; API/web no tienen script lint.
- `pnpm build`: Turbo 3/3 exitosas; Vite advierte chunk principal 522.68 kB sobre umbral 500 kB.
- `git diff --check`: exit 0.

## Contraste con el plan adjunto F15.2

- Alineado: no hay validación institucional; el email personal es sintético en tests y la autorización se decide con sesión/rol y asociación GitHub estable; `user.id` conserva propiedad; no se solicitan scopes de repositorios; se mantienen `disableImplicitLinking`, contraseña reciente y `linkSocial`; las rutas docentes se prueban en el handler HTTP compuesto y conservan 401/403.
- Cubierto localmente con proveedores/datos de prueba: identidad estable pese a cambios de email/login, ausencia de `githubLogin`, cuenta sin asociación, ID estable inválido, sesión expirada, error temporal con reintento, redirección de docente y ownership de propuesta/galería.
- No equivalente a OAuth real: las pruebas crean asociaciones sintéticas en SQLite y/o generan URL de autorización con fake Client ID; no completan consentimiento ni callback de GitHub. Tampoco prueban en producción una colisión real, ni el cierre/reingreso docente con GitHub.
- La captura original no demuestra que el rechazo obedeciera a correo institucional: el código no consulta dominio; la corrección evita sugerir esa causa y el mensaje informa conflicto de enlace de forma segura.

## Producción, lectura solamente

- SSH validado con host key conocida ED25519 `SHA256:zzF20RQw2amdh66Pxm89w3oUCuhieg0nToMxJlGnNlQ`; `StrictHostKeyChecking=yes` y llave privada autorizada, sin mostrarla.
- API/web siguen en imagen `sha-b7810f9bfb41c00a7db1f998badb3770fe710185`, ambas `healthy`; timers de polling, apply.path y backup `active`.
- Health por `http://127.0.0.1:3001/health`: HTTP 200, SQLite `ready`.
- Request anónimo a `/api/teacher/mentor-control`: HTTP 401. Esto no prueba el panel docente; el 404 autenticado previo sigue pendiente de nueva release.
- Dominio Fragments HTTP 200. Pits público HTTP 502; Pits desarrollo y PostgreSQL mostraron `healthy` en `docker ps`. No se modificó ningún servicio vecino.
- No se alteró producción, SQLite, tags, cuentas o permisos; no se consultaron secretos ni sesiones de estudiante.

## Pendiente

- QA Ego Lite desktop/390 px contra los estados locales. La ronda desktop quedó sin ejecutar: la API de cambio de viewport usada no existe en Ego Lite 0.6.2.7. El CLI notificó una actualización disponible; la guía exige aprobación antes de actualizar, por lo que no se modificó la instalación. La ronda mobile anterior verificó ausencia de overflow y el estado recuperable local; requiere repetición final.
- Auditar el diff completo y correr `git diff --check` final.
- Integrar mediante PR `verify` y merge normal.
- Revalidar backup, bundle F14 y checks; publicar nueva tag SemVer solo bajo autorización F15/addendum y aprobación protegida obligatoria.
- Después del despliegue, pedir al alumno una acción real en Ego Lite para comprobar OAuth personal, `/api/me`, galería y propiedad sin crear proyectos. Pedir al propietario su intervención para contraseña/consentimiento de enlace docente y reingreso.
- Verificación independiente PASS final aún no emitida.
- Verificación independiente nueva: Seguridad, PASS acotado para identidad/rutas/sesiones; Detective OAuth, PASS acotado local y BLOCKED productivo; Pez Dorado, INCONCLUSIVE global por falta de PR/despliegue y OAuth real. Revisaron el mismo diff antes de los dos commits `6179b79` y `003028a`; el follow-up de identidad inválida se cubre con test local, y falta nueva revisión de la rama en PR y CI.
