# Evidencia F15.1 — Vinculación explícita docente

## Implementación

- Rama `codex/f15-teacher-github-link`, iniciada desde `origin/main` `d71e7100a7830b40a8189910725c195406bc44d2`.
- Archivos de código: `apps/api/src/auth/better-auth.ts`, `apps/api/src/auth/teacher-account-http.ts`, `apps/api/src/auth/teacher-account-http.test.ts`, `apps/api/src/http/app.ts`, `apps/web/src/App.tsx`, `apps/web/src/features/auth/StudentLoginScreen.tsx`, `apps/web/src/features/auth/OAuthCompletionScreen.tsx`, `apps/web/src/features/auth/OAuthCompletionScreen.test.tsx`, `apps/web/src/features/mentor-control/MentorControlWorkspace.tsx`, `apps/web/src/features/mentor-control/MentorControlWorkspace.test.tsx`, `apps/web/src/features/mentor-control/mentor-control.css`.
- `disableImplicitLinking` sigue en `true`; `link-social` HTTP se deshabilita en Better Auth y el router bloquea POST público. La API de enlace solo se invoca tras validar sesión docente, contraseña y origen confiable.
- El estado OAuth guarda la asociación para el usuario docente actual. El API no escribe la cuenta antes del callback. La UI revisa el estado real al volver y el login posterior enruta por la sesión Better Auth existente.

## Verificación fresca — 2026-11-13

- `apps/api`: `vitest run` — 29 archivos, 114 pruebas aprobadas. Incluye sesión anónima/estudiantil, origen no confiable, contraseña incorrecta, rate limit, flujo OAuth de inicio y cuenta ya asociada.
- `apps/web`: `vitest run` — 19 archivos, 74 pruebas aprobadas. Incluye estado de reautenticación, confirmación del resultado real y rutas de sesión docente/estudiantil.
- `packages/contracts`: `vitest run` — 1 archivo, 19 pruebas aprobadas.
- API `tsc --noEmit -p tsconfig.json`: 0.
- Web `tsc -p tsconfig.json`: 0.
- API build `tsc -p tsconfig.json`: 0.
- Web `vite build`: exitoso; Vite conserva warning del chunk principal de 520.11 kB (umbral 500 kB).
- Contracts lint disponible `tsc --noEmit -p tsconfig.json`: 0. API y web no declaran script lint. El primer intento de `turbo lint` en D: exFAT no pudo enlazar paquetes de workspace; la repetición completa de lint en C: NTFS pasó, sin modificar configuración versionada.
- `git diff --check`: limpio antes del commit.

## Repetición en NTFS — 2026-11-13

- Se creó worktree temporal detached desde `6cb0a80cecf3660559270cce3dc3d1ea6b189a8c` en C: NTFS; se instaló desde caché con `pnpm install --offline --frozen-lockfile --ignore-scripts` (308 paquetes reutilizados, 0 descargados). El worktree temporal se retiró después de las pruebas.
- `pnpm test`: Turbo 4/4 tareas exitosas; API 29 archivos/114 pruebas, web 19 archivos/74 pruebas, contratos 1 archivo/19 pruebas.
- `pnpm typecheck`: Turbo 4/4 tareas exitosas (API, web, contratos y dependencia de contratos).
- `pnpm lint`: Turbo 1/1 tarea exitosa (lint disponible de contratos).
- `pnpm build`: Turbo 3/3 tareas exitosas (API, web, contratos); mismo warning de chunk web de 520.11 kB.
- Turbo avisó `failed to run git diff for dirty hash` al usar el caché compartido; no falló ninguna tarea. No se modificó configuración Git global.

## QA visual Ego Lite

- Skill `ego-browser` 2.2.0 leída y guía instalada ejecutada. TaskSpace 26, con API simulada mediante fixture explícito; no representa una identidad real ni llama GitHub.
- Escritorio: sección «Cuenta y acceso» y panel docente legibles. Captura privada: `task-list/F15.1/screenshots/desktop.png`.
- 390 × 844: el panel y el formulario de contraseña se mantienen dentro del ancho. Capturas privadas: `task-list/F15.1/screenshots/mobile-390.png`, `task-list/F15.1/screenshots/mobile-link-form-390.png`.
- No se realizó OAuth real, no se pidió contraseña/consentimiento a una persona y no se usó producción.

## Integración en main — 2026-11-13

- PR #20 integró la política actual de Git en `main` mediante merge normal. `origin/main` verificado: `07d94b905fc01c6c18d37f1c8d653e27c568da1f`.
- Se integró ese `origin/main` en `codex/f15-teacher-github-link` mediante merge normal, sin reescritura: `c6bd80927ce29333e39ef648aaaedc9368fdd20f`.
- La rama integró los commits `510b157a49e4a1093b5bbfc64ace7e489a9bf587`, `6cb0a80cecf3660559270cce3dc3d1ea6b189a8c`, `0560cdbafd9e5b515561b192d922193371e88471` y el merge anterior; el último commit de la rama/PR #21 fue `b89e96606c80634aa0afaa79a0ca3099635e797e`. El PR incluyó 16 archivos F15.1 y no incluyó `env`, bases de datos, capturas ni artefactos generados. `git diff --check` pasó.
- Verificación Turbo fresca en NTFS sobre el árbol de código integrado: tests 4/4 tareas (API 114, web 74, contratos 19); typecheck 4/4; lint 1/1 disponible; build 3/3. El build mantiene el warning conocido del bundle web de 520.11 kB. Instalación offline/frozen: 308 paquetes de caché, cero descargas.
- `.github/workflows/release.yml` tiene el mismo blob SHA (`75a7c86bb008940730a61d2ac5492577d52f528f`) en `origin/main` y en la rama. La tag local/remota `v0.4.2` no existe en esta comprobación.
- PR #21 [feat(F15.1): vinculación segura de GitHub para docentes](https://github.com/VGMil-dev/fragments/pull/21) se fusionó mediante merge normal en `38ff1bd3014d1775d3ecbf03ec80dab938657845`. El check requerido `verify` pasó en run `43447571009` para el head `b89e96606c80634aa0afaa79a0ca3099635e797e`. Solo dejó una advertencia no bloqueante de migración de actions Node.js 20 a 24. Ruleset activo de `main`: requiere PR, check `verify`, resolución de hilos, permite solo merge commit y no tiene bypass actors; revisión humana obligatoria configurada en 0.
- En la revisión del diff se confirmó que `disableImplicitLinking` continúa en `true`, `/link-social` está deshabilitado, el inicio de enlace vuelve a validar sesión docente y contraseña, limita intentos y comprueba proveedor/URL de autorización GitHub; el rol se toma de Better Auth. Esta revisión y las pruebas automatizadas no sustituyen una prueba OAuth real.
- Preflight de solo lectura en VPS: fingerprint ED25519 del host coincide con la huella previamente confiable; API y web devolvieron HTTP 200; ambos contenedores siguen en el SHA de producción `12b6e39fbb64016ab0f56ea104fe9b384da688fa` (`v0.4.1`). Timers del agente pull, apply.path y backup aparecen activos. El snapshot más reciente listado, `2026-11-13T05-53-47-732Z.sqlite`, devolvió `PRAGMA integrity_check=ok` y conserva `root:root 0600`. No se modificó VPS ni base de datos.
- `origin/main` tras PR #21: `38ff1bd3014d1775d3ecbf03ec80dab938657845`. Main contiene `BuildVersion`, que muestra versión y los primeros siete caracteres del SHA, y conserva el workflow F14 con trigger de tags, verificación exacta, entorno `fragments-production` y atestación Sigstore offline. `v0.4.2` no existe localmente ni en remoto.
- No se realizó OAuth real ni se tocó producción. Producción continúa en `v0.4.1`; no se creó tag ni se desplegó. F15.1 no se declara completada hasta integrar y validar una sesión OAuth real con intervención del propietario. No hubo cambios a SQLite, Pits, PostgreSQL, Cloudflare ni a `env`.

## Validación de v0.4.3 y diagnóstico F15.2 — 2026-11-13

- La web pública sirve `v0.4.3 · b7810f9`; contenedores API/web están saludables en el SHA exacto. El indicador mobile 390 px no desborda.
- La sesión docente presente en Ego Lite devuelve `credentialConnected=true`, `githubConnected=false`. No se realizó vinculación, no se usó contraseña ni consentimiento personal.
- En producción, `GET /api/teacher/account` respondió 200, pero al abrir el panel el GET a `/api/teacher/mentor-control` respondió 404. Causa en código: `academicHandler` tenía un catch-all más amplio y terminaba el request antes del handler de Mentor. F15.2 añade regresión integrada y corrige orden/alcance; la vinculación real queda pendiente hasta desplegar la corrección.
- La configuración segura en código se conserva: `disableImplicitLinking=true`, contraseña reciente y `linkSocial` explícito; ningún rol se deriva del email.

### Aclaración de vigencia de la lectura Ego Lite

La observación `credentialConnected=true`, `githubConnected=false` que se anotó arriba proviene de una sesión anterior y no se repitió durante F15.2. No demuestra el estado actual de una cuenta docente ni sustituye la lectura posterior al despliegue de la corrección de rutas.

## v0.4.4 en producción — 2026-11-13

- La versión `v0.4.4` quedó desplegada por el agente F14 desde `5cb799c58075ac3eabf1766370af66d3d5cd4e1b`; run `43489422906` terminó exitoso después de la aprobación protegida del propietario. API/web y la ruta docente están saludables; el GET autenticado `/api/teacher/mentor-control` devolvió 200.
- En Ego Lite, `/api/teacher/account` devolvió `credentialConnected=true`, `githubConnected=false`, y la UI mostró «Cuenta y acceso». Por tanto, el feature está presente y la asociación real todavía no está demostrada. Se cedió el control al propietario para contraseña reciente y consentimiento GitHub; no se leyó ni introdujo contraseña ni se autorizó en su nombre.
- La vinculación, cierre de sesión y reingreso GitHub conservando el mismo usuario docente y rol quedan pendientes de una interacción real y su verificación posterior. La revisión de seguridad del código es PASS acotado; no equivale a OAuth productivo.

### Reingreso docente OAuth real — 2026-11-13, producción `v0.4.4`

- Ego Lite devolvió desde el consentimiento del propietario a `/teacher/mentor-control?githubLink=success`. La página mostró «GitHub quedó vinculado a esta cuenta docente.»; `GET /api/teacher/account` HTTP 200 informó `credentialConnected=true` y `githubConnected=true` (solo se registran booleanos).
- `GET /api/teacher/mentor-control` HTTP 200 y la UI mostró «Cuenta y acceso» y «Control de Mentor».
- La sesión Better Auth anterior tenía `isTeacher=true`. Se cerró con `POST /api/auth/sign-out` HTTP 200 y la sesión quedó ausente. Luego se inició el flujo desde el botón normal «Iniciar sesión con GitHub» de `/student/login`; no se invocó directamente el callback ni se reutilizó `state`.
- Tras la redirección OAuth, `GET /api/auth/get-session` HTTP 200 confirmó sesión autenticada y docente. Se comparó de forma privada el fingerprint efímero de `user.id` anterior y posterior: coincidió. No se guardó el ID ni su fingerprint en Git o en evidencia.
- `GET /api/me` HTTP 200 respondió `authenticated=false`, `reason=role_not_student`, resultado esperado para esta identidad docente; el rol permitió de nuevo el control de Mentor. La UI mostraba `v0.4.4` y el SHA de release `5cb799c`.
- No se cambió la contraseña, rol, proveedor, SQLite ni datos académicos durante esta verificación. No se mostró ni conservó correo, ID GitHub, token o cookie.
- F15.1 queda validada en producción para vinculación explícita y reingreso docente. F15/F15.2 siguen abiertas hasta completar OAuth de un estudiante autorizado con su cuenta GitHub personal y revisar sus permisos; no se creó ninguna propuesta de prueba.
