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

## Sincronización e integración — 2026-11-13

- PR #20 integró la política actual de Git en `main` mediante merge normal. `origin/main` verificado: `07d94b905fc01c6c18d37f1c8d653e27c568da1f`.
- Se integró ese `origin/main` en `codex/f15-teacher-github-link` mediante merge normal, sin reescritura: `c6bd80927ce29333e39ef648aaaedc9368fdd20f`.
- La rama contiene los commits `510b157a49e4a1093b5bbfc64ace7e489a9bf587`, `6cb0a80cecf3660559270cce3dc3d1ea6b189a8c`, `0560cdbafd9e5b515561b192d922193371e88471` y el merge anterior. Su diff contra `origin/main` está limitado a los archivos F15.1 listados arriba y a `task-list/TASKS.md`; no incluye `env`, bases de datos, capturas ni artefactos generados. `git diff --check` pasó.
- Verificación Turbo fresca en NTFS sobre el árbol de código integrado: tests 4/4 tareas (API 114, web 74, contratos 19); typecheck 4/4; lint 1/1 disponible; build 3/3. El build mantiene el warning conocido del bundle web de 520.11 kB. Instalación offline/frozen: 308 paquetes de caché, cero descargas.
- `.github/workflows/release.yml` tiene el mismo blob SHA (`75a7c86bb008940730a61d2ac5492577d52f528f`) en `origin/main` y en la rama. La tag local/remota `v0.4.2` no existe en esta comprobación.
- Siguiente paso de integración: publicar la rama mediante push normal, abrir PR a `main`, revisar el diff remoto y esperar el check obligatorio `verify`. No se ha hecho push todavía; PR y CI están pendientes.
- No se realizó OAuth real ni se tocó producción. Producción continúa en `v0.4.1`; no se creó tag ni se desplegó. F15.1 no se declara completada hasta integrar y validar una sesión OAuth real con intervención del propietario. No hubo cambios a SQLite, Pits, PostgreSQL, Cloudflare ni a `env`.
