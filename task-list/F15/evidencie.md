# F15 — Evidencia

## Estado y referencias

- Estado: implementación y QA sintético local verificados. **OAuth real no verificado; no declarar lista para producción** hasta instalar credenciales de forma segura y completar login con GitHub en una versión aislada de F15.
- Rama `codex/f15-github-gallery`, basada en `origin/main` `704fe08c1932cdabed1303884eadf612625e94e7`.
- Commit F15 inicial: `c43aacb8d8cc474d5c45f3acbb59d192b2148ee3` (`feat(F15): identidad GitHub y galería académica`). Evidencia inicial: `5de917da5872f21300b206b06ac75901d699967d` (`docs(F15): registrar evidencia de verificación`).
- Commit de validación local: `65b404eb481a83977cd26b823e4f0fc7a5b5642a` (`test(F15): validar OAuth URL y preservación académica`); el SHA queda registrado también en `task-list/TASKS.md`.
- Better Auth `1.7.17`. Los cambios de esta validación usan fake provider y datos sintéticos; no representan autenticación OAuth real.
- Se trabajó en clon aislado `.worktrees/F15`. No se modificó `main`, no hubo merge, push, tag, despliegue, reinicio ni recreación de contenedores.

## Configuración de producción y OAuth

- Inspección SSH de solo lectura a `129.38.112.90` (`gavanti`, usuario `ubuntu`), con host key verificada. El archivo lógico persistente es `/opt/fragments/deploy/production/.env`, propietario `root:root`, modo `0600`.
- `BETTER_AUTH_URL` está configurado como `https://fragments.gavanti.org`. Docker Compose carga ese `.env` en el servicio `api` mediante `env_file`; `PUBLIC_APP_URL` también se inspeccionó sin imprimir valores.
- `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` **no están configurados** en ese archivo ni en el contenedor API actual. El contenedor corre revisión `50e2ace697afc125bb3bfdd9a705f0e383796a83`, anterior a F15.
- El callback efectivo generado por Better Auth con fake provider y origen público configurado fue `https://fragments.gavanti.org/api/auth/callback/github`. Esto verifica el URI construido por la app, no la URL registrada en una OAuth App ni un login externo.
- Las credenciales sí se proporcionaron en el adjunto de este chat. Se extrajeron en memoria y se intentó transferirlas por stdin SSH con host key fijada, sin incluir valores en argumentos ni logs; la conexión expiró antes de confirmar cualquier escritura. No se reportan instaladas en VPS y no se reinició producción.
- OAuth GitHub real: **pendiente/bloqueado** hasta contar con un canal seguro de inyección y probar F15 aislada. No se atribuye ninguna prueba fixture a OAuth real.

## Pruebas automatizadas frescas

Ejecutadas desde cada paquete con los binarios ya disponibles en el checkout; se interrumpió un intento paralelo de `pnpm` porque quiso instalar el layout de workspace en el volumen exFAT. No descargó paquetes ni cambió lockfile; las ejecuciones finales usaron `.bin` directamente.

- API: `..\\..\\node_modules\\.bin\\vitest.cmd run` — **28 archivos, 109 pruebas pasaron**.
- Web: `..\\..\\node_modules\\.bin\\vitest.cmd run` — **15 archivos, 57 pruebas pasaron**.
- Contracts: `..\\..\\node_modules\\.bin\\vitest.cmd run` — **1 archivo, 19 pruebas pasaron**.
- API: `..\\..\\node_modules\\.bin\\tsc.cmd --noEmit -p tsconfig.json` — exit 0.
- Web: `..\\..\\node_modules\\.bin\\tsc.cmd --noEmit -p tsconfig.json` — exit 0.
- Contracts typecheck: `..\\..\\node_modules\\.bin\\tsc.cmd --noEmit -p tsconfig.test.json` — exit 0.
- Contracts lint disponible: `..\\..\\node_modules\\.bin\\tsc.cmd --noEmit -p tsconfig.json` — exit 0. No hay script lint de API/web en sus package.json.
- Contracts build: `..\\..\\node_modules\\.bin\\tsc.cmd -p tsconfig.json` — exit 0.
- API build: `..\\..\\node_modules\\.bin\\tsc.cmd -p tsconfig.json` — exit 0.
- Web build: `..\\..\\node_modules\\.bin\\vite.cmd build` — exit 0. Vite reporta `index-BsLwJgRh.js` de **514.83 kB minificado**, sobre umbral de 500 kB. Es advertencia de tamaño; compilación y navegación visual completaron, no se observó fallo funcional atribuible al bundle. Se recomienda optimizar división de chunks por separado.
- `git diff --check` — sin errores en el checkout aislado.

## Migración SQLite temporal

- `apps/api/src/db/migrate.test.ts`, base SQLite `:memory:` creada con el esquema anterior (incluye `user`, `session`, `proposals`, `proposal_revisions`, `mentor_evaluations` e historial de control).
- La migración preserva el JSON y hash de una propuesta histórica, su revisión, evaluación y sesión; la propuesta permanece sin `owner_user_id` y sin publicación. Segunda ejecución idempotente: conteos permanecen en 1 para propuesta, revisión, evaluación y sesión, y 0 publicaciones. Prueba incluida en API: 109/109 pasó.
- No se abrió ni escribió en la base de producción.

## Integridad académica y autorizaciones

- Pruebas de integración API (`apps/api/src/features/mentor/http.test.ts`): publica evaluación elegible automáticamente, mantiene la última revisión elegible; para docente comprueba estudiante anónimo 401 y estudiante autenticado sin rol docente 403; incluye lista separada de proyectos históricos y reclamo solo con cookie original.
- Las publicaciones usan clave única propuesta/revisión; la lectura une publicación, revisión/evaluación y versión de contexto persistida; el handler valida que los identificadores correspondan. Las pruebas F15 pasan y el fixture visual presenta una tarjeta de proyecto con revisiones 2 y 1, cada una con su contexto/rúbrica `Propuesta inicial (v1)`.
- La propuesta histórica sintética sin propietario aparece solo bajo “Proyectos históricos sin propietario GitHub acreditado”; no aparece en la lista de estudiantes ni en galería/publicaciones. Se conserva privada sin prueba de propiedad/elegibilidad.

## QA visual Ego Lite (fixture local sintético)

- Servidor local en `127.0.0.1`; Better Auth local con cuentas sintéticas, base SQLite en memoria y una cuenta GitHub simulada. **No es login GitHub real**.
- Escritorio: login docente, listado de estudiante y proyecto, historial de dos revisiones, acción de retirada y sección histórica sin propietario. La cuenta de estudiante autenticada fue rechazada con mensaje de acceso docente requerido.
- Móvil 390 × 844: login docente, proyectos y permisos; para pantalla de proyectos y denegación, `innerWidth`, `documentElement.scrollWidth` y `body.scrollWidth` dieron 390; sin desbordamiento horizontal.
- Capturas privadas excluidas de Git: `evidence/teacher-projects-desktop.png`, `evidence/teacher-projects-mobile-390.png`, `evidence/teacher-login-mobile-390.png`, `evidence/teacher-access-denied-mobile-390.png`, además de `evidence/student-login-desktop-full.png` y `evidence/student-login-mobile.png`.

## Compatibilidad F13/F14

- `origin/codex/f13-version-indicator` es ancestro de `codex/f14-release-requirements`; F14 agrega documentación de requisitos/auditoría sobre F13.
- F14 no es ancestro de F15, que sigue basada en `origin/main`; no se integró ninguna rama.
- F13/F14 y F15 tocan `apps/web/src/App.tsx` y `apps/web/src/styles/student-workspace.css`; esos cambios requieren integración manual para conservar el pie BuildVersion y los accesos F15. Los demás archivos funcionales F15 tienen poco solapamiento con F13/F14.
- Sin merge, push, tag ni despliegue. Repetir suite después de integración F13/F14.

## Capturas privadas

`task-list/F15/evidence/` está excluida de Git; máximo 20 archivos y solo datos sintéticos.

## Integración y preflight de release — 2026-11-12

- `main` volvió a verificarse en `f72ff8e6c64efb1a3f99f50e676fd6ceb029691a`. La rama F15 estaba limpia antes de integrar y contiene `c43aacb8d8cc474d5c45f3acbb59d192b2148ee3`, `5de917da5872f21300b206b06ac75901d699967d`, `65b404eb481a83977cd26b823e4f0fc7a5b5642a` y `7b509317628ab8fc521fb374f5c8aca488982bd2`.
- Se actualizó `refs/remotes/origin/main` por fetch normal y se integró en F15 mediante merge, sin reescritura. `App.tsx` tuvo conflicto de imports; la resolución conserva los tipos/rutas F15, `BuildVersion` F13 y pie de versión para rutas estudiantiles/docentes. El merge normal local `831d6092a30e94c179c3b0cf1c1be584c6f4659d` integra F15 con F13/F14. La rama está publicada y el PR #10 se integró mediante merge normal en GitHub `main` como `dcaf5ae261561fe9e4367ee0b9b561e4b4a48e2f`.
- Verificación fresca tras la integración: API 28 archivos/109 tests; web 17 archivos/67 tests; contratos 1 archivo/19 tests. Typecheck API/web/contratos y lint de contratos terminaron con salida 0. Builds API/contratos/web exitosos; Vite advierte chunk JS de 515.74 kB (>500 kB). `git diff --check` sin errores.
- La rama local se abrió con Ego Lite v2.2.0 usando fixture sintético. Landing muestra `dev`; panel docente muestra usuario/propuestas/rúbricas sintéticos; abrir el mismo panel desde un origen sin cookie muestra login y no datos. A 390 px `innerWidth`, `documentElement.scrollWidth` y `body.scrollWidth` son 390. La pantalla estudiantil informa que OAuth no está configurado; no se intentó login real.
- El callback base persistente y el contenedor API corresponden a `https://fragments.gavanti.org`; callback esperado por Better Auth: `https://fragments.gavanti.org/api/auth/callback/github`. El preflight ejecutado antes de instalar credenciales encontró `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` ausentes tanto del `.env` activo como de la API. Las credenciales están en el adjunto original de F15; dos intentos de envío por SSH estricto a `/opt/fragments/deploy/production/.env` terminaron en timeout de conexión antes de confirmar el cambio. No se reportan instaladas ni se reinició la API.
- Para conservación, se creó backup SQLite consistente `fragments-f15-preflight-20261112T205500Z.sqlite` en `/var/backups/fragments`, `root:root 0600`, directorio `0700`; `PRAGMA integrity_check=ok`. En copia temporal aislada, migración runtime de esquema 9 a 10 terminó con integridad `ok`, preservó digest de todas las columnas históricas de propuestas, revisiones, evaluaciones y versiones de rúbrica; propuestas antiguas siguen sin dueño y no se generaron publicaciones históricas. La base productiva no recibió la migración.
- GitHub `fragments-production`: reviewer requerido `VGMil-dev`, `prevent_self_review=false`, `can_admins_bypass=false`, política `v*.*.*`; settings leídos de nuevo por API. Es aprobación manual obligatoria con menor independencia entre publicación y aprobación, autorizada por el propietario para este release. No hay atestación ni sesión OAuth real todavía.
- Se confirmó que `v0.4.0` no existe en refs ni releases. No se creó tag ni se publicó release o despliegue; el código sí se integró en GitHub `main` mediante PR #10. `env` y datos académicos originales permanecieron intactos. El release permanece bloqueado hasta confirmar instalación privada de OAuth y luego completar login real, revisión manual y el resto del piloto.


## Integración en GitHub — cierre de código

- PR #10: https://github.com/VGMil-dev/fragments/pull/10; merge normal a main el 2026-11-12. SHA del merge de código F15: dcaf5ae261561fe9e4367ee0b9b561e4b4a48e2f. PR #11 incorporó la evidencia; `main` quedó entonces en `272bca247658e80061831061695bba6cadaafb12`.
- GitHub Actions CI, run 43318272031, job verify: SUCCESS sobre el head 66eaa52af106f2368147ba82af18a9a038f55c8b. Incluyó test del release agent, instalación locked, suites, typecheck, lint y build. GitHub anotó advertencia de fin de soporte de Node.js 20 para las acciones pinneadas; no falló el job.
- No se creó v0.4.0, no se solicitó approval de producción y no hubo despliegue. Preflight confirmó que las credenciales OAuth no constan en el .env/runtime productivo. La conexión SSH estricta expiró antes de confirmar ninguna escritura; los valores siguen sin solicitarse de nuevo. Login OAuth real permanece sin verificar. Release detenido por este control crítico.
## Diagnóstico SSH y bloqueo de publicación — 2026-11-12

- El adjunto OAuth original del chat está disponible y contiene los datos esperados; no se solicitaron otra vez. No se copiaron ni imprimieron.
- `known_hosts` para `129.38.112.90` conserva la clave ED25519 con huella `SHA256:zzF20RQw2amdh66Pxm89w3oUCuhieg0nToMxJlGnNlQ`, coincidente con la huella previamente confiable. La verificación se mantuvo estricta.
- DNS de `fragments.gavanti.org` resolvió a direcciones Cloudflare `104.21.14.126` y `172.67.203.91`; son proxys y no identifican el IP de origen de la VPS. El sitio público de Fragments respondió HTTP 200.
- Desde la estación, pruebas TCP acotadas contra `129.38.112.90` agotaron el tiempo en 22, 80 y 443. OpenSSH explícito con la llave autorizada y `StrictHostKeyChecking=yes` mostró `Connecting to 129.38.112.90 port 22` y luego `connect ... timed out`. El fallo sucede antes de completar TCP/TLS SSH, intercambio de clave de host o autenticación; no demuestra un problema de llave ni permite decidir entre VM/IP/NSG/ruta de red.
- La estación tiene ruta por defecto y acceso HTTPS público (GitHub y Cloudflare). No se pudo verificar estado de VM/VNIC/NSG, servicios Docker/systemd del agente pull, PostgreSQL ni integridad SQLite actual desde VPS.
- Lectura pública: Fragments web HTTP 200; `pits.gavanti.org` HTTP 502 y `pits-dev.gavanti.org` HTTP 302. No se modificó Pits, PostgreSQL, red Oracle ni SSH. El 502 de Pits es una condición observada, ajena a este cambio, y debe considerarse antes del piloto compartido.
- La copia SQLite preflight anterior conserva su resultado documentado de integridad y migración aislada; no es un backup nuevo para este release. No hubo migración productiva ni nueva copia de release.
- Intervención indispensable fuera de esta estación: en OCI, confirmar primero que la instancia está `RUNNING` y que su VNIC aún posee `129.38.112.90`; si cambió, recuperar el IP correcto. Confirmar la ruta de subred y que NSG/security list permita TCP 22 únicamente desde el IP de salida autorizado de esta estación. No abrir SSH a `0.0.0.0/0`. No se cambió ninguna regla porque el timeout no identifica cuál capa falla.
- `origin/main` antes de esta actualización se verificó como `272bca247658e80061831061695bba6cadaafb12`; `v0.4.0` no existe y GitHub reporta cero releases. No se creó tag, no se pidió aprobación de producción ni se desplegó. La instalación de OAuth, backup previo al release, validación del agente pull y piloto siguen pendientes; no crear/publicar la tag hasta recuperar acceso y completar esos controles.

## Seguimiento v0.4.1 — 2026-11-13

- Las credenciales OAuth están presentes en el `.env` persistente de producción con permisos privados y Compose las transmite a API; no se revelaron valores. No se completó un login real Better Auth ni se valida una sesión autenticada.
- GitHub publicó `v0.4.1`, pero el agente pull rechazó continuar porque no pudo verificar la atestación con su configuración GitHub aislada sin token/bundle. No se cargaron imágenes, migraron datos ni desplegó F15. Producción continúa en el build anterior, así que galería, rutas de estudiante y panel docente nuevos no se han verificado en producción.
- SQLite está íntegra y conserva los conteos antes del release; no se ejecutó migración. Pits público sigue con HTTP 502, mientras Pits development y PostgreSQL local reportan healthy; no fueron modificados. Ver `task-list/F14/evidencie.md` para la evidencia técnica completa y el bloqueo del despliegue.

## Release productivo y QA F15 — 2026-11-13

- F14 aplicó el release publicado y aprobado `v0.4.1`, SHA `12b6e39fbb64016ab0f56ea104fe9b384da688fa`. API/web ARM64 healthy; la migración v10 se aplicó; las tablas históricas conservan hashes por columnas originales. Ver `task-list/F14/evidencie.md` para comandos y hashes de backup.
- OAuth está configurado en `.env` persistente privado y Compose entrega ambas credenciales no vacías al nuevo contenedor API. El flujo iniciado desde el botón normal de GitHub llegó a Better Auth y retornó a `/student/login?error=account_not_linked`. La sesión Better Auth se verificó como inexistente; por tanto OAuth real **no** se considera completado. La política `disableImplicitLinking` se conserva; no se enlazó ninguna cuenta ni se cambió la base.
- Sin sesión, `GET /api/gallery` y endpoints `/api/teacher/students`, `/api/teacher/historical-projects`, `/api/teacher/mentor-control` devolvieron 401. Las rutas web muestran inicio de sesión docente/alumno y no publican información privada. No se probó la galería ni el panel con una sesión autenticada.
- Landing pública carga `v0.4.1` con SHA completo en tooltip/título y etiqueta accesible; el SHA corto todavía no se muestra como texto visible. La UI de landing y login no tuvo overflow horizontal en viewport 390 px. No se crearon propuestas, publicaciones ni evaluaciones IA.
- Bloqueos F15: necesita un usuario GitHub de prueba autorizado que no colisione con una cuenta existente, o intervención de propietario para decidir el procedimiento seguro de vinculación. Además, mostrar el SHA corto junto a la versión exige compilar/publicar una nueva versión; no se creó otra tag ni se alteró `v0.4.1`.
- PR #18 prepara el SHA corto visible y pasó `verify` en run `43376762673`; hasta integrarlo y publicar una nueva versión autorizada, producción continúa mostrando solo `v0.4.1` con SHA completo en la etiqueta accesible.
- PR #18 se integró normalmente en `main` como `ffb647706782c8bf3942e7793b117ec3d870d527`; el run actualizado `43376992320` pasó `verify`. La producción permanece en `v0.4.1` porque no se autorizó ni publicó otra tag.

## Diagnóstico F15.2 — 2026-11-13

- Producción actual confirmada en `v0.4.3`, commit `b7810f9bfb41c00a7db1f998badb3770fe710185`; API/web ARM64 `healthy`, imagen revision `sha-b7810f9...`. No se cambió producción durante esta auditoría.
- La pantalla del alumno se muestra después de que Better Auth encontró una sesión y `/api/me` no confirmó acceso. El código no valida dominio ni correo institucional. Antes del hotfix, `/api/me` también rechazaba una asociación GitHub estable si `githubLogin` faltaba. El screenshot no permite identificar cuál condición afectó a esa cuenta real.
- 404 docente: `academicHandler` captura `/api/teacher/*` antes de `mentorControlHandler` y devuelve su 404 genérico. La nueva prueba integrada reprodujo `GET /api/teacher/mentor-control` de docente con 404 donde se esperaba 200. El código local deja pasar la ruta al handler correcto y verifica 401 anónimo, 403 estudiante y 200 docente.
- Se agregó estado seguro `/api/me` con razones `session_required`, `role_not_student`, `github_account_not_linked`, `invalid_github_identity`; no expone correos o identificadores de proveedor. Fallo HTTP temporal ahora ofrece reintento.
- Revisiones independientes (Detective OAuth, Auditor de Seguridad, Pez Dorado) concordaron en que no existe filtro institucional. Identidad estable procede de `account.accountId`; propiedad usa `user.id`/`owner_user_id`. OAuth real del alumno y docente aún sin PASS.
- SSH host key verificada contra conocida; consultas de solo lectura: `http://127.0.0.1:3001/health` HTTP 200, SQLite `ready`; timers `fragments-release-poll.timer`, `fragments-release-apply.path`, `fragments-backup.timer` activos; API/web healthcheck saludables. Pits público sigue HTTP 502; contenedores de desarrollo Pits y PostgreSQL están saludables, sin cambios.
- Suites locales en rama F15.2: API 29 archivos/116 pruebas; web 20/76; contracts 1/19. Typecheck 4/4; lint disponible 1/1; build 3/3. Vite advierte bundle principal 522.25 kB (>500 kB). Ver salida fresca en `task-list/F15.2/evidencie.md`.
- Estado F15 sigue abierto hasta integrar, desplegar y comprobar OAuth real de un estudiante personal, panel docente y link/reingreso docente; luego revisar galería, propiedad y SQLite de producción.

## Despliegue F15.2 — v0.4.4 — 2026-11-13

- La tag anotada `v0.4.4` apunta al SHA integrado `5cb799c58075ac3eabf1766370af66d3d5cd4e1b`. GitHub Actions run `43489422906` completó `verify-build`, `attest-package` y `publish-approved-release`; la aprobación protegida fue realizada por el propietario. `verify-build` pasó test/typecheck/lint/build, metadata exacta, imágenes ARM64 y publicación de los artefactos de atestación offline.
- El agente pull F14 registró `release_request_queued release_id=444640259 tag=v0.4.4` y `release_deployed` desde el SHA exacto. API y web ejecutan `sha-5cb799c58075ac3eabf1766370af66d3d5cd4e1b`, ambas `healthy`; `/health` local HTTP 200. `fragments-release-poll.timer`, `fragments-release-apply.path` y `fragments-backup.timer` permanecen activos; los servicios poll/apply terminaron con `Result=success`.
- Backup previo a aplicación: `fragments-2026-11-13T19-20-14-249Z.sqlite`, registrado por F14 con SHA-256 `2ef0ab4a0b6a340218dbb13728a27537ef30b95c7a2d89e4281d39f09faace7c`, permisos privados. Lectura de solo lectura posterior: backup y DB activa `PRAGMA integrity_check=ok` y `foreign_key_check=ok`; ambas contienen 261 propuestas, 261 revisiones, 212 evaluaciones, 2 versiones de control y migraciones 1–10. No hay migración nueva entre la versión desplegada previa y este candidato; no se modificó ni restauró SQLite.
- Ego Lite confirmó en la web pública y área docente `v0.4.4 · 5cb799c`; `innerWidth` y `scrollWidth` fueron 390 en móvil, sin overflow. El GET autenticado `/api/teacher/mentor-control` y `/api/teacher/account` devolvieron 200. La sesión docente consultada en `/api/me` recibió `role_not_student`, coherente con su rol; no se imprimieron identificadores personales ni contenido del panel.
- Estado de cuenta docente al momento de la QA: `credentialConnected=true`, `githubConnected=false`; el control de Ego Lite se entregó al propietario para confirmación de contraseña y consentimiento de GitHub. El enlace y reingreso docente reales quedan pendientes de su confirmación y verificación posterior.
- OAuth de estudiante personal real, sesión `/api/me`, galería/propiedad con esa identidad siguen sin ejecutar. Pruebas existentes y revisiones independientes cubren callbacks simulados y código: auditoría de seguridad PASS acotado; detective OAuth PASS para código/pruebas locales y BLOCKED para OAuth real; revisión adversarial PASS local e INCONCLUSIVE global. No hay PASS independiente final de F15.
- Pits público continúa en HTTP 502, incidencia previa e independiente que no se modificó; contenedores locales Pits development y PostgreSQL estaban `healthy`. No se modificaron Pits, PostgreSQL, Cloudflare, `env`, credenciales ni otros servicios.
- F15, F15.1 y F15.2 permanecen incompletas hasta verificar el consentimiento/vinculación docente y el OAuth real de estudiante, además de reingreso docente con el mismo usuario/rol y permisos de galería/propiedad. La observación de cuenta docente se actualizará tras recuperar el control de Ego Lite.
- Después del release, requests anónimos sin cookies a `/api/me/proposals`, `/api/gallery`, `/api/teacher/mentor-control` y `/api/teacher/account` respondieron HTTP 401; `/api/me` respondió 200 con `authenticated=false`, `session_required`. No se consultaron datos de cuentas o proyectos.
- Revisiones independientes post-release: PASS acotado para tag/run, bundle público y controles anónimos; INCONCLUSIVE para OAuth real, permisos con sesión autenticada y verificación independiente de SQLite. Sin PASS final; quedan las interacciones reales de estudiante y docente.

### Reingreso docente OAuth real — 2026-11-13, producción `v0.4.4`

- Ego Lite devolvió desde el consentimiento del propietario a `/teacher/mentor-control?githubLink=success`. La página mostró «GitHub quedó vinculado a esta cuenta docente.»; `GET /api/teacher/account` HTTP 200 informó `credentialConnected=true` y `githubConnected=true` (solo se registran booleanos).
- `GET /api/teacher/mentor-control` HTTP 200 y la UI mostró «Cuenta y acceso» y «Control de Mentor».
- La sesión Better Auth anterior tenía `isTeacher=true`. Se cerró con `POST /api/auth/sign-out` HTTP 200 y la sesión quedó ausente. Luego se inició el flujo desde el botón normal «Iniciar sesión con GitHub» de `/student/login`; no se invocó directamente el callback ni se reutilizó `state`.
- Tras la redirección OAuth, `GET /api/auth/get-session` HTTP 200 confirmó sesión autenticada y docente. Se comparó de forma privada el fingerprint efímero de `user.id` anterior y posterior: coincidió. No se guardó el ID ni su fingerprint en Git o en evidencia.
- `GET /api/me` HTTP 200 respondió `authenticated=false`, `reason=role_not_student`, resultado esperado para esta identidad docente; el rol permitió de nuevo el control de Mentor. La UI mostraba `v0.4.4` y el SHA de release `5cb799c`.
- No se cambió la contraseña, rol, proveedor, SQLite ni datos académicos durante esta verificación. No se mostró ni conservó correo, ID GitHub, token o cookie.
- F15.1 queda validada en producción para vinculación explícita y reingreso docente. F15/F15.2 siguen abiertas hasta completar OAuth de un estudiante autorizado con su cuenta GitHub personal y revisar sus permisos; no se creó ninguna propuesta de prueba.

### OAuth estudiantil real — 2026-11-13, producción `v0.4.4`

- Un estudiante autorizado inició sesión desde el botón normal «Iniciar sesión con GitHub» en `/student/login` y regresó a `/student/gallery` en Ego Lite. No se usó una URL callback directa ni se compartieron credenciales.
- `GET /api/auth/get-session`: HTTP 200 con sesión autenticada. `GET /api/me`: HTTP 200, `authenticated=true`; el servidor aceptó la identidad GitHub asociada como estudiante. La interfaz mostró la galería, sin mensajes de error.
- `GET /api/me/proposals`: HTTP 200, cero propuestas propias. `GET /api/gallery`: HTTP 200, cero publicaciones visibles. No se abrió contenido de registros ni se creó una propuesta de prueba.
- Con esa misma sesión, `GET /api/teacher/mentor-control` y `GET /api/teacher/account` respondieron HTTP 403. La sesión estudiantil no obtuvo acceso docente.
- La cuenta GitHub quedó bajo control del estudiante; en evidencia no se conserva nombre, correo, ID de proveedor, token ni cookie. No hubo cambios en datos académicos.
- F15.2 queda verificada en producción para inicio GitHub estudiantil, sesión reconocida y separación de permisos. La galería está vacía y no hay propuesta propia: la persistencia de ownership, evaluación y publicación automática no se pudo recorrer en producción sin crear datos sintéticos ni provocar evaluación facturable.
- F15 sigue abierta hasta que exista un flujo académico auténtico autorizado para validar la creación, propiedad y publicación en galería. No se declara el recorrido completo ni un PASS independiente global con la galería vacía.

## Preparación de aceptación del primer proyecto auténtico — 2026-11-13

- Protocolo preparado en `task-list/F15/protocolo-aceptacion-piloto.md`; distingue guardado/propiedad/roles sin IA y evaluación/publicación con autorización, consentimiento y presupuesto previo. No manda un POST de edición o evaluación desde el segundo estudiante contra un proyecto auténtico en producción: eso podría alterar datos o generar cargos si hubiera una regresión.
- Código y tests revisados: `apps/api/src/features/mentor/http.ts` deriva propietario de `student.id`; lista privada usa `owner_user_id`; acceso a revisión filtra por propietario y responde 404. `academic-http.ts` requiere rol docente para roster/proyectos (401 anónimo, 403 estudiante) y la vista académica consulta proyectos del docente autenticado. La galería se deriva de publicaciones ligadas a evaluación, revisión y contexto/rúbrica.
- Nueva regresión en `apps/api/src/features/mentor/http.test.ts`, test «keeps a saved proposal private to its student and does not evaluate or publish it»: propietario ve su propuesta, segundo estudiante no la ve ni accede a la historia, evaluación o edición (404), borrador no aparece en galería y `evaluationCalls=0`.
- Verificación fresca sin IA externa: `pnpm --filter @fragments/api exec vitest run src/features/mentor/http.test.ts src/features/mentor/academic-repository.test.ts src/features/mentor/control-http.test.ts src/http/app.test.ts` — 4 archivos, 24 tests pasaron (exit 0; 4.07 s). La suite usa SQLite `:memory:` y evaluadores etiquetados fake/local; no contacta AI Gateway ni despliegues.
- Tests existentes incluidos verifican: identidad de propietario no aceptada del cliente; edición/historia bloqueadas entre titulares; docente anónimo 401/estudiante 403/docente 200; roster docente y proyecto 200 con borrador `published=false`; galería vacía tras guardar y publicación solo después de evaluación fake; contenido de email ausente de respuesta de galería.
- Producción: no se guardó ninguna propuesta ni se ejecutó IA. En la sesión autenticada real ya comprobada, propuestas propias=0 y galería=0; no había un proyecto auténtico que permitiera probar esas transiciones en vivo. El preflight de presupuesto no se ejecutó porque no existe todavía autorización ni consentimiento para evaluación.
- Verificador independiente `adversarial_review`, actualización 2026-11-13: OAuth estudiantil y separación de roles tienen PASS productivo según la evidencia provista; nueva regresión y controles fake/local PASS acotado; acceso docente al borrador sin evaluar PASS local acotado. Veredicto global F15: INCONCLUSIVE, porque no hay proyecto auténtico productivo y no se han comprobado allí ownership, evaluación persistida ni publicación. El verificador no accedió a producción ni ejecutó IA.
- Commit de protocolo y prueba de aislamiento: `30bac2c` (`test(F15): protege propuestas antes de IA`).
- Regresión docente indicada por el revisor: `bb5b3f4` (`test(F15): cubre borrador en vista docente`).
- Actualización independiente: la última revisión corrió `src/features/mentor/http.test.ts`, 1 archivo/10 pruebas PASS; revisión acotada sin producción/IA.

## Piloto auténtico F15 — 2026-11-13

### Identidad y propuesta

- Se usó Ego Lite con una sesión estudiantil GitHub ya autenticada. `/api/me` confirmó una identidad estudiantil reconocida; la lista inicial de propuestas propias y `/api/gallery` devolvieron cero.
- El estudiante creó una propuesta auténtica desde la interfaz de Fragments. No se incluyó su texto, nombre, correo, identificador, cookie ni respuesta completa en esta evidencia.
- La UI confirmó el guardado. Tras recargar, `/api/me/proposals` devolvió una propuesta propia persistida; la galería seguía en cero antes de la evaluación. La referencia privada se mantuvo solo en memoria durante QA.
- Se verificó antes de la evaluación que no existía revisión persistida (GET de evaluación 404). No se observó publicación prematura.

### Evaluación, publicación y privacidad

- Aprobación del propietario y consentimiento del estudiante se aportaron explícitamente para una evaluación real inicial. Antes del dispatch se revisaron los presupuestos vigentes de Vercel y GitHub; el detalle está en la sección de costos.
- La UI Mentor no permitió reabrir/seleccionar la propuesta guardada después de recargar: mostraba un formulario nuevo. Para evitar crear una segunda propuesta o enviar una evaluación distinta, se confirmó la referencia ya guardada y se hizo exactamente una solicitud al endpoint autenticado oficial de Fragments `POST /api/proposals/:id/review`. No se falsificó el evaluador ni se alteró el estado.
- El POST respondió 200; el GET posterior de la misma evaluación respondió 200 con el resultado persistido. No hubo reintentos ni solicitudes duplicadas. Resultado académico: factible/elegible, con hallazgos y orientaciones. La revisión histórica quedó asociada a versión de propuesta 1 y contexto de rúbrica 2, rubric `mentor-control-v2`.
- El proveedor reportado fue `alibaba/qwen3.7-flash`. Logs de AI Gateway muestran una solicitud 200, aproximadamente 1.2k tokens de entrada y 787 de salida; el costo de esa fila aparece como `$0.0001` redondeado. El panel MTD mostraba `$0.03`; esos valores son la precisión disponible del panel, no un cálculo exacto de facturación.
- Antes de evaluar, `/api/gallery` tenía cero elementos; luego tuvo una publicación elegible y el detalle respondió 200. Las claves del contrato público no incluían correo, nota, comentarios privados, instrucciones docentes ni token. Tras recargar, la evaluación persistía y la galería seguía con un elemento.
- Desde la sesión estudiantil, `/api/teacher/mentor-control` y `/api/teacher/students` respondieron 403. No se inició sesión docente ni se abrió su vista del proyecto auténtico en esta corrida. Tampoco se usó una segunda cuenta estudiantil para probar aislamiento productivo; quedan pendientes las verificaciones directas de B y docente.

### Presupuestos y Codespaces

- Vercel AI Gateway: se verificaron límites de equipo y clave de `$5`, ambos sin renovación; el gasto MTD previo mostrado era `$0.03` y había crédito visible de `$14.49`. El costo máximo preflight de una solicitud con los topes del producto era menor a `$0.001`. No se cambió configuración ni límite.
- GitHub personal: plan Free; la cuota observada era 120 core-hours/mes y 15 GB-month. El presupuesto de sobreconsumo de Codespaces estaba en `$0` con “Usage blocked”, por lo que el uso de pago quedaba bloqueado. No se habilitó facturación ni se aumentaron límites. La pantalla de uso final no se volvió a consultar después de parar el Codespace; no afirmar un asiento final de coste facturado.
- Se creó el Codespace `scaling space adventure` y se detuvo desde GitHub al terminar. La vista de GitHub confirmó el estado `stopped`. No se verificó el tipo exacto de máquina ni se exportó un reporte final de horas de uso.

### Repositorio privado y retos

- Se creó el repositorio privado `MilordV/catalogo-proyectos-accesible`, manteniendo intacto el portafolio anterior. Es propiedad de la cuenta estudiantil; no se añadieron secretos ni datos personales. La visibilidad privada se confirmó en GitHub.
- Se publicó la rama `codex/f15-catalogo-accesible`; GitHub mostró cuatro commits contando el commit inicial del README. Los tres commits de esta misión son `4495eff` (catálogo), `c498acf` (tests) y `47dce0c` (retos/procedencia). El último SHA completo visible fue `47dce0c7c50e8fbe3da423f1c0fbed0bbf26464d`.
- El prototipo Angular usa seis registros sintéticos, búsqueda, filtro por tema, ficha expandible y recuperación del estado vacío. La procedencia asistida por IA está declarada en README y `docs/retos.md`; no se atribuye código generado al estudiante.
- Node `v24.22.2`, npm `11.19.1`. `npm test -- --watch=false`: 1 archivo, 3 pruebas aprobadas. `npm run build`: generación de bundle completada. Ego Lite verificó en el navegador la búsqueda (dos coincidencias de “angular”), el filtro combinado sin resultados y la recuperación de los seis proyectos. No se hizo revisión móvil completa.

### Veredicto del piloto

- PASS: OAuth estudiantil de producción, identidad reconocida, guardado/persistencia propia, borrador no publicado antes de IA, una evaluación auténtica persistida, publicación elegible tras evaluar, contrato público sin campos privados, denegación estudiantil de rutas docentes, repositorio privado, rama y Codespace detenido.
- INCONCLUSIVE: vista docente autenticada del proyecto, aislamiento productivo con otra cuenta, comprobación productiva de integridad SQLite y atribución del SHA productivo. El resultado no sustituye la QA sintética existente.
- F15 global permanece INCONCLUSIVE, no cerrado ni listo para release. No se publicó PR del repositorio académico ni se creó tag, release o despliegue de Fragments. El desvío de la UI para evaluar la propuesta guardada debe convertirse en una mejora de producto con prueba de regresión.

### Registro de evidencia de esta misión

- Commit local del registro ampliado: `c14e1e9a080ec5eb6e1f7eb0233b7c814ef63581` (`docs(F15): registra piloto auténtico`).
- `git diff --check` terminó sin errores antes del commit. Se actualizaron intent, spec, evidencia y estado de F15; la rama de trabajo quedó un commit por delante de `origin/codex/f15-first-project-acceptance`.

### Corrección de recuperación en Mentor — 2026-11-13

- Se reprodujo el síntoma en la sesión autorizada: tras guardar y recargar Mentor, aparecía un formulario nuevo y no había lista para volver a abrir la propuesta propia. La persistencia y la evaluación seguían disponibles en el servidor.
- `949c7d2c789597fec56d317bc8fd7d08255920b1` (`fix(mentor): recupera propuestas guardadas`) añade la consulta de `/api/me/proposals`, una lista de propuestas propias, selección para reabrir, recuperación GET de la evaluación persistida y actualización PUT con `expectedVersion`. No se cambió `packages/contracts` ni el servidor.
- Regresión: tests de `student-api` validan lectura de propuestas propias y actualización por versión; tests de Mentor verifican listado/selección, recuperación de evaluación y ruta de edición existente.
- Verificación después del cambio: `pnpm --filter @fragments/web test` — 20 archivos/84 tests PASS; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS con advertencia existente de bundle JS 524.58 kB (>500 kB); `git diff --check` PASS.
- La corrección se publicó en el PR #33; no se ha fusionado ni desplegado. No se verificó visualmente en Ego Lite ni en producción después del cambio. No se atribuye un resultado productivo al código local.

### PR y control de revisión — 2026-11-13

- Se publicó `codex/f15-first-project-acceptance` y se abrió el PR [#33](https://github.com/VGMil-dev/fragments/pull/33) hacia `main`, head inicial `b9e52e69ef388eef4bc87003ddbed577397fd337`.
- GitHub Actions `Fragments CI`, run `43541725815`, concluyó `success`. La API informó `mergeable=true` antes de pedir revisión.
- La revisión de aprobación del mismo usuario que creó el PR fue rechazada por GitHub con HTTP 422: `Review Can not approve your own pull request`. No se utilizó bypass, no se fusionó y no se desplegó. El PR permanece abierto y necesita revisión independiente conforme a la protección del repositorio.

### Revisión de seguridad y regresiones — 2026-11-13

- Revisión independiente de solo lectura del HEAD `5f0aa82` encontró dos P2: inspiración conservaba una propuesta seleccionada previa y error al cargar se presentaba como lista vacía. Sin hallazgos de autorización/ownership en los endpoints nuevos; la edición sigue usando `expectedVersion` y reabrir recupera evaluación por GET.
- Se corrigieron ambas condiciones: elegir inspiración limpia la propuesta seleccionada; el fallo de lectura se muestra explícitamente con botón de reintento. Se añadió regresión de UI para impedir confundir error con lista vacía y validar reintento.
- Verificación local después del arreglo: `pnpm --filter @fragments/web test -- src/features/mentor/mentor-screen.test.tsx` — 20 archivos/85 tests PASS; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS (bundle JS 524.95 kB, advertencia preexistente de umbral 500 kB); `git diff --check` PASS.
- Estas correcciones aún no están publicadas ni en CI; PR #33 todavía no se ha fusionado. No hubo actividad de navegador ni de producción en esta revisión.

### Merge, release y QA productivo F15 — 2026-11-14

- Revisión independiente de seguridad/regresiones sobre `c4467b4ba8c13495774c0db3b20f32b5b81de90f`: PASS con límite estático. Confirmó resueltos los dos P2 previos, sin nuevos bloqueos de ownership, privacidad o evaluación duplicada; señaló que el recorrido de inspiración no tiene prueba de integración dedicada.
- `verify` del PR #33, run `43559062514`, terminó SUCCESS sobre `c4467b4`. Se revalidaron las reglas activas de `main`: check requerido `verify`, cero aprobaciones requeridas, método merge habilitado, sin bypass. No hubo conversaciones ni comentarios de revisión sin resolver. Merge normal del PR #33; merge SHA y nuevo `main`: `a3309864f8ec0db38afef145f5f0bb60c22aabb2`.
- F14: tag anotada nueva `v0.4.5`, objeto `c38905475e34ea0a15685e60768e81320428d836`, apunta al SHA anterior de `main`. Run `43559211195` terminó SUCCESS: validación de tag/ascendencia, tests, typecheck, lint, build, metadata ARM64 y atestación. La publicación requirió aprobación de `VGMil-dev` en `fragments-production`; se aprobó por el entorno requerido y no se usó bypass. Release publicado con manifiesto, imágenes y bundle offline.
- Producción mediante Ego Lite: web y panel docente muestran `v0.4.5` con SHA completo `a3309864f8ec0db38afef145f5f0bb60c22aabb2`; `/health` respondió HTTP 200 con estado de base `ready`. La vista docente autenticada mostró el proyecto auténtico, una revisión publicada, el contexto académico y sus controles docentes. No se extrajeron ni registraron títulos o texto del proyecto en esta evidencia.
- Se cerró la sesión docente mediante el botón normal del Inspector; después `/api/me` devolvió `authenticated=false`, `session_required`. Tras la autenticación GitHub del estudiante, `/api/me` respondió 200, `authenticated=true`, `githubLogin=MilordV`.
- En Mentor, la lista autenticada mostró exactamente una propuesta guardada en versión 1. Al abrirla, el título/formulario se restauró y la evaluación existente se mostró; `GET /api/proposals/:id/review` devolvió 200 con `proposalVersion=1` y el mismo `proposalId`. Las solicitudes observadas al endpoint fueron GET; no hubo POST de evaluación.
- Se conservó evidencia previa redactada mediante huellas SHA-256 locales de identificador y contenido, sin escribir estos valores ni el texto privado a los logs/evidencia del repositorio. Se añadió solo un punto final al título como edición académica mínima autorizada. El guardado confirmó éxito; la lectura posterior de `/api/me/proposals` devolvió exactamente una propuesta, versión 2, con identificador estable y contenido actualizado. Tras recargar se mantuvieron el mismo identificador, versión 2 y una propuesta; la UI reabrió los campos editados.
- No se repitió ni ejecutó evaluación. La lectura GET de evaluación para la versión 2 devolvió 404; la evaluación persistida para la versión 1 había respondido 200 antes de editar. Durante reapertura y edición no se observó ningún POST `/review`. `/api/gallery` siguió devolviendo un solo elemento y su detalle mantuvo `projectVersion=1`; no se publicó contenido adicional.
- No había una segunda cuenta estudiantil autorizada en esta sesión; no se creó ni se usó una cuenta ajena. El aislamiento productivo entre estudiantes queda sin verificar.
- Límite crítico SQLite: `/health` confirma `database=ready`, pero no ejecuté ni obtuve evidencia directa de `PRAGMA integrity_check` en la base productiva o una copia consistente posterior a este release. Una conexión SSH de solo lectura con host key estricta y modo no interactivo fue rechazada por `publickey`; no se probaron otras credenciales ni se infiere integridad del healthcheck. Se necesita acceso de solo lectura al reporte/backup verificado del agente F14 o una vía operacional autorizada que devuelva únicamente el resultado de integridad.
- Veredicto independiente actualizado: **INCONCLUSIVE global**. El verificador calificó como PASS documental los flujos de release/SHA, OAuth estudiantil, reapertura/evaluación histórica, edición sin duplicado, publicación y vista docente. Calificó aislamiento entre estudiantes y SQLite como INCONCLUSIVE, y recomendó mantener F15 abierta. No accedió a producción ni ejecutó IA.
- Estado actualizado: recuperación, reapertura, identidad, edición, estabilidad de identificador, preservación de evaluación histórica y galería — PASS. Vista docente autenticada — PASS. SQLite integrity_check y aislamiento con cuenta B autorizada — INCONCLUSIVE. F15 no está completa.

### Investigación de los dos bloqueos finales — 2026-11-14

- Runbook local F14 leído: `D:\Servidor\.agents\skills\servidor-ops\SKILL.md` y `references/connectivity.md`. Define el alias SSH `servidor`, usuario `ubuntu`, `IdentitiesOnly yes` y una `IdentityFile` localizada en `D:\Servidor`. La IP no se copia a esta evidencia.
- En el entorno actual no existe `C:\Users\vgmil\.ssh\config`, no está definida la función PowerShell `servidor` y `ssh.exe` no está en `PATH` (el binario del sistema sí existe). El servicio `ssh-agent` está ejecutándose, pero `ssh-add -l` informa que no hay identidades cargadas. Esto es compatible con el intento previo `Permission denied (publickey)` sin identidad seleccionada; no demuestra qué identidades ofreció el cliente ni cuáles acepta el servidor.
- El archivo de identidad referido por el runbook existe en `D:\Servidor`, pero su ACL actual concede `FullControl` al principal `Todos`. El runbook exige restringirlo a la cuenta actual, SYSTEM y Administradores. Por la instrucción de no cambiar permisos ni credenciales, no usé esa llave, no la cargué en el agente y no alteré ACL alguna. La host key conocida de la VPS sigue registrada con comprobación estricta en la evidencia previa.
- No se encontró en los archivos locales de F14/F15 un reporte, ledger o backup con resultado posterior a `v0.4.5`. La última lectura directa registrada es la de `v0.4.4`: `integrity_check=ok`, cero violaciones FK, migraciones 1–10, 261 propuestas, 261 revisiones, 212 evaluaciones y 2 versiones de control antes del piloto F15. Ese resultado no demuestra la integridad posterior a `v0.4.5` ni incluye el proyecto/edit reciente. No ejecuté SQL sobre producción porque no hay una ruta de lectura autorizada utilizable sin modificar permisos.
- SQLite v0.4.5: **BLOCKED por falta de acceso operacional seguro al reporte existente**. No se ejecutaron `PRAGMA integrity_check;` ni `PRAGMA foreign_key_check;`, ni se consultaron migraciones/conteos actuales. No se infiere integridad desde `/health`.
- Segunda identidad: la sesión y documentación de QA contienen solo la cuenta propietaria `MilordV` y la cuenta docente; no se encontró una segunda cuenta estudiantil de prueba autorizada. No se inspeccionaron otros perfiles, cuentas ni proyectos en producción. No se crearon identidades.
- Evidencia local complementaria: `apps/api/src/features/mentor/http.test.ts` incluye el caso `keeps a saved proposal private to its student and does not evaluate or publish it` y el caso de edición que exige la sesión GitHub coincidente y responde 404 a la edición por otro propietario. Son fixtures fake/locales, no sustituyen la prueba productiva solicitada.
- Aislamiento productivo con B: **BLOCKED por ausencia de una segunda identidad autorizada disponible**. No reutilicé la sesión de `MilordV`.
- No se modificaron SSH, usuarios, ACL, contenedores, SQLite ni credenciales; no se creó release. Estado F15 continúa INCONCLUSIVE con los dos criterios finales separados como BLOCKED.
- Veredicto independiente actualizado de ambos criterios: **INCONCLUSIVE global**. SQLite posterior a `v0.4.5`: BLOCKED/INCONCLUSIVE por ausencia de PRAGMA o reporte accesible; aislamiento B: BLOCKED/INCONCLUSIVE por falta de identidad. Los PASS académicos previos se conservan como documentales; el verificador no accedió a producción.

### Diagnóstico de acceso F14 y ACL — 2026-11-14

- Se leyó `D:\Servidor\.agents\skills\servidor-ops\SKILL.md` y `references\connectivity.md`. La configuración documentada autoriza el alias `servidor` hacia `129.38.112.90`, usuario `ubuntu`, `IdentitiesOnly yes` e identidad `D:/Servidor/ssh-key-2026-10-25.key`. Huella confiable registrada: host key ED25519 `SHA256:zzF20RQw2amdh66Pxm89w3oUCuhieg0nToMxJlGnNlQ`.
- El volumen `D:` se identificó como **exFAT** (`Get-Volume`: Fixed, OperationalStatus OK). `Get-Acl` e `icacls` muestran propietario `Todos` y un único permiso Allow FullControl para `S-1-1-0` (Everyone), no heredado. exFAT no soporta las ACL de seguridad NTFS requeridas por OpenSSH.
- Preflight en memoria, sin leer el contenido de la identidad: sesión `VGMIL-PORT\vgmil`; la propuesta de ACL con esa cuenta, SYSTEM y Administrators daba tres ACE, conservaba el propietario y eliminaba Everyone. `ssh-keygen -lf` pudo leer la identidad y devolvió huella pública `SHA256:yJoigG6V7EOGz11l9v6MyhWRKsr23pHLKfyHGnE/Us8`.
- Se intentó aplicar únicamente esos permisos mediante `Set-Acl` e `icacls`, manteniendo primero los permisos de la cuenta actual y agregando SYSTEM/Administrators antes de retirar Everyone. Aunque las herramientas informaron procesamiento exitoso, la verificación posterior confirmó que no persistió ningún cambio: ACL efectiva sigue siendo propietario `Todos`, un ACE `Everyone: FullControl`, DACL sin protección. Se detuvo la operación sin probar conexión SSH. No se cambiaron owner, credenciales, archivos de clave, agente, configuración SSH, servidor ni servicios.
- Diagnóstico: **no se puede restringir ni confiar la identidad en su ubicación actual porque D: es exFAT**. La huella de identidad no se comparó con `authorized_keys` del servidor; no se afirma que corresponda o no. No se intentó conexión, así que autenticación/huella de host no se revalidaron en esta sesión.
- No se encontró evidencia existente posterior a `v0.4.5`; no se ejecutaron comandos remotos ni SQL. `integrity_check`, `foreign_key_check`, migraciones y conteos posteriores al release siguen **BLOCKED**. La evidencia histórica `v0.4.4` no se reutiliza como prueba.
- La revisión de archivos y sesiones autorizadas no halló una segunda identidad estudiantil de prueba; aislamiento con cuenta B sigue **BLOCKED**. Se mantienen solo como evidencia complementaria los tests locales fake ya listados arriba; no se repitieron.
- Veredicto independiente solicitado para este diagnóstico y el aislamiento: pendiente de actualizar. Estado global F15: **INCONCLUSIVE**, no cerrar mientras ambos criterios críticos sigan sin evidencia.
