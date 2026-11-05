# F02 — Evidence / evidencie

Estado: COMPLETADO EN WEB; endpoints Review dependen de F05 y muestran estado de error recuperable hasta su integración.
Owner: W2; integración de rutas y UX: PLANNER.

## Alcance integrado

- `apps/web/src/features/gallery/`, `mentor/`, `review/` y `submissions/`: flujo estudiantil composable, formularios validados con contratos compartidos, datos fake identificados, estados loading/vacío/error/éxito y descargas Markdown/PDF.
- `apps/web/src/lib/api/`: cliente tipado, timeout/cancelación, parseo de respuestas y manejo genérico de errores.
- `apps/web/src/App.tsx`: rutas `/student/gallery`, `/student/mentor` y `/student/review`, navegación de historial, CTAs de entrada y foco al contenido al cambiar de ruta.
- `apps/web/vite.config.ts`: proxy local `/api` a API local en desarrollo.
- `apps/web/src/styles/student-workspace.css`, `apps/web/src/styles/main.css`: diseño responsivo y foco visible.
- `pnpm-lock.yaml`: importer web enlazado al contrato workspace autorizado.

## Verificación

- `pnpm build` — exit 0; build de contracts, API y web.
- `pnpm typecheck` — exit 0; contracts, API y web.
- `pnpm test` — exit 0; contracts 16/16 y API 28/28.
- `pnpm lint` — exit 0.
- `pnpm exec vitest run apps/web/src` — exit 0; 11 archivos, 40 pruebas aprobadas.
- `git diff --check` — exit 0.
- Ego Lite, QA visual 390/1440: CTA de landing abre Galería; recorrido Mentor guarda una propuesta, evalúa con `fake/local-heuristic-v1`, genera entrega y descarga README/PDF; Review acepta SHA completo y presenta error recuperable del API ausente; navegación por teclado muestra foco y permite saltar al contenido.

## Capturas

Guardadas en `task-list/F07/screenshots/` (SHA-256):

- `f02-gallery-390.png` — `b7cf822deb19e8141722ab47a6c5d78611464a29b946d2ba0c66a885eb1df695`
- `f02-gallery-1440.png` — `0fb17ee79d24232005aa39c4fad3f5aa7bfa64c82357d5f1e52fc596beb9d24d`
- `f02-mentor-result-390.png` — `a66cf3893d43a64de2e38d2261f4bfcb1e83ed2ef1d586a75e51c5ca2fcaab07`
- `f02-review-unavailable-390.png` — `99799d8a200719a2afa89c2e780062255696947fd762102dc720742057139367`
- `f02-keyboard-focus-390.png` — `9df51e197e3776cdb12104b8348e703823831f9fc8992cbfadf407530142b613`

## Limitaciones y commits

- La galería no tiene aún contenido opt-in/coincidencias y muestra estado vacío cuando F04 devuelve su lista vacía.
- La interfaz Review está implementada, pero los endpoints F05 no existen; la captura demuestra el manejo genérico sin filtrar datos de respuesta.
- La evaluación y la generación de PDF probadas son fake/locales, sin proveedor IA ni servicio externo.
- Commits del trabajo F02 importado: `ac9243f` y `df0e191`. La integración del planner se registra en un commit separado.
