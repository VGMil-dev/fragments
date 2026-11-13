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
- Contracts lint disponible `tsc --noEmit -p tsconfig.json`: 0. API y web no declaran script lint. `turbo lint` se intentó; el linker default de pnpm no funciona en el volumen exFAT y el modo hoisted también falla al crear symlinks a paquetes workspace. No se modificó configuración versionada para ocultar esa limitación.
- `git diff --check`: limpio antes del commit.

## QA visual Ego Lite

- Skill `ego-browser` 2.2.0 leída y guía instalada ejecutada. TaskSpace 26, con API simulada mediante fixture explícito; no representa una identidad real ni llama GitHub.
- Escritorio: sección «Cuenta y acceso» y panel docente legibles. Captura privada: `task-list/F15.1/screenshots/desktop.png`.
- 390 × 844: el panel y el formulario de contraseña se mantienen dentro del ancho. Capturas privadas: `task-list/F15.1/screenshots/mobile-390.png`, `task-list/F15.1/screenshots/mobile-link-form-390.png`.
- No se realizó OAuth real, no se pidió contraseña/consentimiento a una persona y no se usó producción.

## Git y limitaciones

- SHA de commit de implementación: pendiente.
- PR y check GitHub `verify`: pendientes de publicación de la rama. `AGENTS.md` prohíbe hacer push; no se publicará desde Git ni se intentará eludir esa regla.
- `main` no se modifica; no se creó tag ni se desplegó. Producción continúa en `v0.4.1`; F15 sigue abierta hasta integrar, publicar una versión con aprobación y verificar una sesión real docente/estudiante.
- No hubo cambios a SQLite, Pits, PostgreSQL, Cloudflare ni a `env`.
