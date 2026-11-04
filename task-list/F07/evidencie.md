# F07 — Evidence / evidencie

Estado: PARCIAL; integración del planner para F02 y QA visual local completados. F05/F06 y validación completa de despliegue/proveedores siguen pendientes.
Owner: PLANNER.

## Integración de rutas y UX

- `apps/web/src/App.tsx`: conecta Galería, Mentor y Review con rutas e historial; CTA de la landing entra a Galería; navegación enfoca el contenido y admite salto accesible.
- `apps/web/vite.config.ts`: proxy de `/api` hacia `127.0.0.1:3000` para desarrollo.
- `apps/web/src/styles/student-workspace.css`: estilos del espacio estudiante.
- `pnpm-lock.yaml`: import de `@fragments/contracts` alineado al workspace.
- F02 ya figura completada en `task-list/TASKS.md`; F04 se mantiene abierta por alcance restante descrito en `task-list/F04/evidencie.md`.

## QA Ego Lite

Se inició API con SQLite temporal local y Vite (`127.0.0.1:3000`, `127.0.0.1:5173`); no se hicieron llamadas a servicios externos ni se leyó/imprimió `.env`. Se cerraron los servidores y el task space al finalizar.

- Navegación landing→Galería, vacía al no haber catálogo opt-in.
- Mentor: crear propuesta, ejecutar evaluador fake rotulado, crear entrega, bajar README y PDF efímeros.
- Review: acepta SHA de 40 caracteres y muestra error recuperable genérico porque F05 aún no expone el endpoint.
- Teclado: foco visible y contenido enfocado al cambiar ruta.
- Viewports: 390px y 1440px.

Capturas y SHA-256:

- `task-list/F07/screenshots/f02-gallery-390.png` — `b7cf822deb19e8141722ab47a6c5d78611464a29b946d2ba0c66a885eb1df695`
- `task-list/F07/screenshots/f02-gallery-1440.png` — `0fb17ee79d24232005aa39c4fad3f5aa7bfa64c82357d5f1e52fc596beb9d24d`
- `task-list/F07/screenshots/f02-mentor-result-390.png` — `a66cf3893d43a64de2e38d2261f4bfcb1e83ed2ef1d586a75e51c5ca2fcaab07`
- `task-list/F07/screenshots/f02-review-unavailable-390.png` — `99799d8a200719a2afa89c2e780062255696947fd762102dc720742057139367`
- `task-list/F07/screenshots/f02-keyboard-focus-390.png` — `9df51e197e3776cdb12104b8348e703823831f9fc8992cbfadf407530142b613`

## Verificación fresca

- `pnpm build` — exit 0; contracts, API y web.
- `pnpm typecheck` — exit 0; packages del workspace.
- `pnpm test` — exit 0; contracts 16/16 y API 28/28.
- `pnpm lint` — exit 0.
- `pnpm exec vitest run apps/web/src` — exit 0; 11 archivos, 40 pruebas.
- `git diff --check` — exit 0.

## Pendiente

- F05: endpoints Review, almacenamiento/cola SQLite, reader GitHub real, AI Gateway y fixtures Promptfoo.
- F06: integrar panel/rutas/contrato de Inspector tras alinear alcance compartido.
- Completar F04 según su evidencia: catálogo opt-in/coincidencias y borradores versionados.
- Repetir QA integrado cuando F05/F06 estén conectados; no se probó proveedor remoto ni despliegue Docker de extremo a extremo en este cierre.
- Commit de integración F02: `86ee816` (`feat(f02): conecta flujo estudiantil`).
- Este commit registra la evidencia parcial de F07; la tarea global sigue abierta.
