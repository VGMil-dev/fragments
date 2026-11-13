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
- `pnpm test`: Turbo 4/4 tareas exitosas: API 29 archivos/122 pruebas, web 20 archivos/79 pruebas y contratos 1 archivo/19 pruebas. Incluye callbacks OAuth simulados de estudiante/docente, correo coincidente sin enlace, preservación del rol y regresión que bloquea `githubLogin` falsificado.
- Nuevas regresiones: sesión Better Auth expirada y conservación de propuesta/publicación cuando cambian email y login. Prueba dirigida (`pnpm --filter @fragments/api exec vitest run src/auth/better-auth.test.ts src/features/mentor/academic-repository.test.ts`): 2 archivos, 14 pruebas pasan. La primera ejecución roja mostró que el fixture de expiración debía usar el formato de fecha ISO de SQLite; el caso corregido pasa.
- Al añadir estas regresiones también se exige lectura de sesión sin cookie cache para `studentAccess`, `teacherId` y `userId`, evitando que estado de sesión cacheado desplace la expiración/revocación vigente en base de datos.
- Diagnóstico del callback: Better Auth 1.7.17 aplica `parseAdditionalUserInputFromProviderProfile`; `input: false` elimina `githubLogin` también del `mapProfileToUser`. Como `academic-repository` exige un login válido para publicar entradas y listarlas en roster, ese resultado habría permitido sesión pero omitido esas áreas.
- Corrección: `githubLogin` se acepta en el schema interno, mientras los hooks de base de datos solo admiten el campo cuando el contexto es el callback Better Auth validado `/callback/:id`; altas/actualizaciones normales que intentan fijarlo se rechazan. La regresión confirma que el callback OAuth simulado persiste login, sesión y asociación estable; correo personal, elegibilidad del roster y segundo callback reutilizando `user.id`/`accountId` sin duplicados. El callback normal no refresca el nombre por defecto; la propiedad nunca depende de ese atributo.
- Regresión docente: el titular ya autenticado vincula vía `linkSocial` una cuenta GitHub con correo personal diferente; el callback conserva `isTeacher`, la cuenta `credential` y el mismo `user.id`; el reingreso GitHub devuelve esa misma cuenta docente. `allowDifferentEmails` permite el enlace explícito, mientras `disableImplicitLinking: true` permanece activo. Otra prueba completa callback estudiantil con correo coincidente no vinculado y demuestra `account_not_linked`, sin cuenta GitHub ni usuario duplicado.
- `pnpm typecheck`: Turbo 4/4 exitosas.
- `pnpm lint`: Turbo 1/1 tarea disponible (contratos) exit 0; API/web no tienen script lint.
- `pnpm build`: Turbo 3/3 exitosas; Vite advierte chunk principal 522.68 kB sobre umbral 500 kB.
- `git diff --check`: exit 0.
- Commit de regresión OAuth: `6842ee5cfc3a07c4df96fbea32c1340de727d955`.
- Commit de metadata confiable para galería/roster: `be7a61c2a1acfcda6ac59e75acecc693dae581b3`.
- Commit de vinculación/reingreso docente y rechazo de asociación implícita: `baaae1d00d9da47414160386be479fffdf2bfa81`.
- Hallazgo QA: tras iniciar sesión con contraseña, el panel docente autenticaba correctamente pero no cargaba el estado «Cuenta y acceso». Se corrigió el flujo para cargar conjuntamente workspace y estado de cuenta; prueba nueva `carga el estado de cuenta al iniciar sesión desde el formulario`. Commit: `4e9b7d6`.
- Hallazgo de revisión independiente: perfiles de releases previos podían conservar `githubLogin = NULL`, y el roster/galería omitían esas identidades aunque la cuenta social estuviera asociada. Better Auth 1.7.17 no sobrescribe perfiles existentes por defecto. La prueba primero falla con login obsoleto; después prepara una fila legado vacía y comprueba que el callback refresca el login y reconoce la misma identidad, sin reemplazar email local. Commit: `6546cca9e6e0ce403b626c24ef06e60d59a82533`.
- El enlace explícito docente actualiza el login desde el callback validado y conserva email institucional, nombre local, cuenta credential y rol. Una segunda cuenta docente no puede tomar un `accountId` GitHub ya vinculado; la prueba confirma que la asociación original y ambos roles quedan intactos.
- Endurecimiento final: `databaseHooks.user.update.before` ahora construye un allow-list dinámico que elimina toda clave propuesta excepto `githubLogin` validado. Las pruebas rechazan state OAuth incorrecto y replay sin crear usuarios, y comprueban que email, verificación de correo, nombre, imagen y rol docente no cambian. Commit: `947ac5b`.
- La prueba final amplía el snapshot docente para comparar explícitamente `role` y `isTeacher` antes y después del callback. Commit: `b2d8047f18bb45b7e17e7f1ad1ac9df18963fddd`.
- Verificación fresca tras ese ajuste: `pnpm test` API 122/web 79/contratos 19 (Turbo 4/4); `pnpm typecheck` Turbo 4/4; `pnpm lint` 1/1 tarea disponible; `pnpm build` 3/3. Vite conserva advertencia preexistente de chunk principal de ~522.70 kB.
- QA Ego Lite en la sesión autorizada «Fragments» (ID 10), build local y cuenta docente sintética aislada: escritorio y viewport móvil 390 px; tras login aparecen «Cuenta y acceso», el método de inicio de sesión y estado GitHub; `innerWidth` y `scrollWidth` son ambos 390 px. No hubo overflow horizontal. Esto no prueba OAuth real ni despliegue productivo.

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

### Revalidación productiva y CI del PR — 2026-11-13

- Se verificó otra vez la huella SSH ED25519 confiable (`SHA256:zzF20RQw2amdh66Pxm89w3oUCuhieg0nToMxJlGnNlQ`) y se mantuvo `StrictHostKeyChecking=yes`. La consulta requirió `sudo -n docker` porque el usuario `ubuntu` no accede directamente al socket Docker; no se cambió ningún grupo ni permiso.
- API/web están `healthy` con imagen `sha-b7810f9bfb41c00a7db1f998badb3770fe710185`; polling, apply.path y backup timers `active`; `/health` local HTTP 200 con SQLite `ready`.
- Web pública Fragments HTTP 200; Pits público HTTP 502. Contenedores de desarrollo Pits y PostgreSQL `healthy`; no se modificaron.
- PR #25 sigue draft. Check requerido `verify`, run `43475876169`, pasó en head `da9b187b75c7894502cdd917258c1b50a0424b71`; incluye metadata Turbo y todas las suites/tipos/lint/build. El cambio de cabeza posterior para esta evidencia volverá a requerir check.

## Pendiente

- QA visual local final con Ego Lite completado en escritorio y 390 px. No se usó Playwright ni otro navegador. Ego Lite notificó que existe una actualización; no se instaló.
- PR #25 [fix(F15.2): identidad GitHub personal y rutas docentes](https://github.com/VGMil-dev/fragments/pull/25), integrado por merge normal. El run final `verify` es `43487043259`, exitoso para el head `a01c271cb542920cca4f7f72c9fb0edda59fc917`; también pasó `43486793229` para el head de código `b2d8047f18bb45b7e17e7f1ad1ac9df18963fddd`.
- `verify` run `43485475730` terminó exitosamente para el head exacto `6546cca9e6e0ce403b626c24ef06e60d59a82533`; todos los pasos completaron, incluidos metadata Turbo y test/typecheck/lint/build. Se ejecutó sobre la rama del PR #25 y la base `main` `b7810f9bfb41c00a7db1f998badb3770fe710185`.
- Diff de PR consultado en GitHub: 22 archivos; no contiene `.env`, bases de datos, capturas privadas ni artefactos generados.
- Revisión independiente final sobre `b2d8047`: security, OAuth diagnosis y adversarial dan PASS acotado para seguridad/callbacks simulados, sin bypass de perfil, rol o asociación. El OAuth real sigue sin demostrarse.
- SHA de merge de PR #25 y HEAD verificado de `main`: `ecaa45a3f6cd8c0bb11d675c9cd63c4bf82b276b`.
- Candidata siguiente preparada: `v0.4.4` desde `ecaa45a3f6cd8c0bb11d675c9cd63c4bf82b276b`. La consulta `git ls-remote --tags origin v0.4.4` no devolvió tag; no se creó ni publicó ninguna tag. Incluye F15.2 y el indicador de versión F13. El release requiere autorización específica, preflight F14, aprobación protegida y OAuth real.
- No hubo despliegue ni cambios en la infraestructura. La producción permanece en `v0.4.3` según la última lectura; no se tocó SQLite ni servicios vecinos. OAuth real de docente/estudiante queda pendiente antes del release y cierre de F15.2.
- Revalidar backup, bundle F14 y checks; publicar nueva tag SemVer solo bajo autorización F15/addendum y aprobación protegida obligatoria.
- Después del despliegue, pedir al alumno una acción real en Ego Lite para comprobar OAuth personal, `/api/me`, galería y propiedad sin crear proyectos. Pedir al propietario su intervención para contraseña/consentimiento de enlace docente y reingreso.
- Verificación independiente PASS final aún no emitida.
- Verificación independiente nueva: Seguridad, PASS acotado para identidad/rutas/sesiones; Detective OAuth, PASS acotado local y BLOCKED productivo; Pez Dorado, INCONCLUSIVE global por falta de PR/despliegue y OAuth real. Revisaron el mismo diff antes de los dos commits `6179b79` y `003028a`; el follow-up de identidad inválida se cubre con test local, y falta nueva revisión de la rama en PR y CI.

## Release productivo v0.4.4 — 2026-11-13

- La tag anotada `v0.4.4` apunta exactamente a `5cb799c58075ac3eabf1766370af66d3d5cd4e1b` y está integrada en `main`. Run F14 `43489422906` pasó `verify-build`, `attest-package` y `publish-approved-release`; incluyó el check de metadata del bundle, build ARM64 y atestación offline. El propietario completó la revisión protegida `fragments-production`; no se usó bypass.
- El agente pull aceptó el release `444640259` y el ledger registra `v0.4.4`, SHA exacto, estado `deployed` y backup `fragments-2026-11-13T19-20-14-249Z.sqlite` con integridad `ok`. El servicio apply terminó `Result=success`; API/web usan imágenes `sha-5cb799c58075ac3eabf1766370af66d3d5cd4e1b`, `healthy`; health endpoint HTTP 200. Timers de polling, apply.path y backup activos.
- La base productiva y backup, leídos en modo SQLite `ro`, reportan `integrity_check=ok` y `foreign_key_check=ok`. Ambos tienen 261 propuestas, 261 revisiones, 212 evaluaciones, 2 versiones `mentor_control` y las migraciones 1–10; los conteos históricos coinciden con evidencia anterior. El diff del release no cambia migraciones SQLite.
- QA Ego Lite pública: versión/SHA visibles `v0.4.4 · 5cb799c`; escritorio 1366 px y móvil 390 px sin overflow. En sesión docente, `/api/teacher/mentor-control` 200, `/api/teacher/account` 200 y `/api/me` devolvió `role_not_student` (resultado esperado para el rol docente). La sección «Cuenta y acceso» está visible.
- Estado docente observado antes del handoff: `credentialConnected=true`, `githubConnected=false`. El navegador se cedió al propietario para completar la confirmación reciente de contraseña y el consentimiento OAuth. Todavía no se verificaron el callback real, logout/relogin con GitHub ni conservación del mismo `user.id`/rol en producción.
- OAuth estudiantil real y permisos de galería/propiedad con una identidad GitHub personal siguen pendientes. Los tests, CI y revisiones independientes son evidencia de código/proveedor simulado, no sustituyen esas sesiones. Auditoría de seguridad: PASS acotado al código; detective OAuth: PASS local/BLOCKED real; revisión adversarial: PASS local/INCONCLUSIVE global. No se declara F15.2 completada.
- Fragments público respondió HTTP 200 antes del release; Pits público estaba en HTTP 502 mientras sus contenedores locales de desarrollo y PostgreSQL estaban saludables. No se cambiaron Pits, PostgreSQL, Cloudflare ni otros servicios.

### Lecturas anónimas post-despliegue — 2026-11-13

- Requests `GET` directos a la API pública se hicieron sin cookies ni credenciales. `/api/me` devolvió HTTP 200 con `authenticated=false` y razón `session_required`; `/api/me/proposals`, `/api/gallery`, `/api/teacher/mentor-control` y `/api/teacher/account` devolvieron HTTP 401 (`AUTH_REQUIRED` en las rutas con ese contrato). No se leyeron propuestas, galería ni perfiles.
- Estas respuestas acreditan el rechazo de acceso anónimo en la versión desplegada; no sustituyen la prueba con sesión real de estudiante o el flujo docente vinculado.

### Revisión independiente post-release — 2026-11-13

- Detective OAuth: PASS acotado para bundle público (`v0.4.4` y SHA corto/full) y respuestas anónimas; no inició OAuth real. Confirmó que falta estudiante personal autorizado y que el docente debe vincular, cerrar sesión y volver a entrar por GitHub.
- Auditor de Seguridad: PASS acotado para rechazo anónimo y tag/run; INCONCLUSIVE para autorización con sesión real. No accedió a Ego Lite, cookies, cuentas ni filas de usuario.
- Revisor adversarial: PASS para tag anotada/peeled SHA, run F14, aprobación visible y metadata pública; INCONCLUSIVE global. No pudo revalidar por su cuenta la SQLite/ledger ni la representación visual en navegador, y no hay OAuth real.
- Veredicto independiente global: INCONCLUSIVE. F15 no cumple sus criterios de cierre hasta OAuth estudiantil real, link y reingreso docente, permisos de sesiones autenticadas, y PASS final. Main en el momento de revisión: `c83e8d3b9f47a7117bce133c5f5d23c46c846152`; producción sigue en la tag/SHA `v0.4.4` / `5cb799c58075ac3eabf1766370af66d3d5cd4e1b`.

### Reingreso docente OAuth real — 2026-11-13, producción `v0.4.4`

- Ego Lite devolvió desde el consentimiento del propietario a `/teacher/mentor-control?githubLink=success`. La página mostró «GitHub quedó vinculado a esta cuenta docente.»; `GET /api/teacher/account` HTTP 200 informó `credentialConnected=true` y `githubConnected=true` (solo se registran booleanos).
- `GET /api/teacher/mentor-control` HTTP 200 y la UI mostró «Cuenta y acceso» y «Control de Mentor».
- La sesión Better Auth anterior tenía `isTeacher=true`. Se cerró con `POST /api/auth/sign-out` HTTP 200 y la sesión quedó ausente. Luego se inició el flujo desde el botón normal «Iniciar sesión con GitHub» de `/student/login`; no se invocó directamente el callback ni se reutilizó `state`.
- Tras la redirección OAuth, `GET /api/auth/get-session` HTTP 200 confirmó sesión autenticada y docente. Se comparó de forma privada el fingerprint efímero de `user.id` anterior y posterior: coincidió. No se guardó el ID ni su fingerprint en Git o en evidencia.
- `GET /api/me` HTTP 200 respondió `authenticated=false`, `reason=role_not_student`, resultado esperado para esta identidad docente; el rol permitió de nuevo el control de Mentor. La UI mostraba `v0.4.4` y el SHA de release `5cb799c`.
- No se cambió la contraseña, rol, proveedor, SQLite ni datos académicos durante esta verificación. No se mostró ni conservó correo, ID GitHub, token o cookie.
- F15.1 queda validada en producción para vinculación explícita y reingreso docente. F15/F15.2 siguen abiertas hasta completar OAuth de un estudiante autorizado con su cuenta GitHub personal y revisar sus permisos; no se creó ninguna propuesta de prueba.
