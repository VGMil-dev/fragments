# F16 — Especificación de rediseño integral

Este archivo es la especificación operativa de F16. Los objetivos, límites y definición de terminado están en `GOAL.md`; las decisiones visuales en `design_draft.md` y `DESIGN_SYSTEM_CONTRACT.md`; las rutas/estados en `SCREEN_INVENTORY.md`; la relación con acciones y pruebas en `QA-INTERACTION-MATRIX.md`. Estos documentos son autocontenidos y deben actualizarse en conjunto cuando cambia un requisito.

## Entradas y salidas

- Entrada: fuente web de `apps/web/`, contratos existentes de `packages/contracts`, imágenes y manifiestos inalterados del ZIP `F16-FRAGMENTS-REDESIGN-MASTER-KIT.zip`, y decisiones de `decisions.md`.
- Salida: layouts público/estudiante/docente/identidad, tokens semánticos, componentes reutilizables acotados, todas las vistas y estados existentes con estilo F16, matriz QA, reportes EGM, evidencia, documentación drift y una rama local lista para revisión.
- Interfaz/API/data: sin cambios. Se preservan exactamente URL, autenticación, permisos, schemas, payloads, persistencia, validaciones, acciones y errores. No enviar servicio externo desde UI como parte del rediseño.

## Comportamiento GIVEN / WHEN / THEN

- GIVEN cada URL explícita en `SCREEN_INVENTORY.md`, WHEN carga la ruta, THEN aparece el layout correspondiente y el control activo correcto, sin nueva ruta ni pérdida de permisos.
- GIVEN persona sin sesión, WHEN entra a Galería o Mentor, THEN `App.tsx` conserva el `getMe()` gate existente; WHEN entra a Review o Trainer, THEN se renderiza el flujo actual sin añadir gate compartido y sus fallos presentes conservan mensajes/reintentos. El header visual no altera este acceso.
- GIVEN una lista cargando, vacía, con error o con datos, WHEN se representa, THEN cada estado se distingue, no se informa vacío al fallar y retry conserva su intención.
- GIVEN formulario válido o inválido, WHEN se guarda/envía, THEN se aplican las validaciones y campos actuales; cada error se anuncia junto al campo; busy/success/error no alteran la acción.
- GIVEN persona que usa teclado, WHEN recorre header, navegación, listas, dialogs existentes y formularios, THEN el orden es lógico, foco visible, skip link presente y no existe trampa.
- GIVEN viewport de 320, 390, 768, 1024 o 1440 CSS px, WHEN se renderiza la pantalla, THEN contenido y acciones siguen visibles, legibles y sin overflow horizontal de página.
- GIVEN `prefers-reduced-motion: reduce`, WHEN se muestra contenido visual, THEN no hay movimiento decorativo continuo y el arte sigue comprensible en estático.
- GIVEN asset original aprobado, WHEN se copia a web/public, THEN sus bytes/hashes permanecen idénticos.

## Límites exactos de archivos

Este allowlist queda cerrado antes de implementar. No editar archivos fuera de él sin volver a especificar y revisar el alcance.

**Diseño del producto:**

- `docs/DESIGN_TOKENS.md` y `docs/SYSTEM_DESIGN.md`: reemplazar directriz visual histórica por Pixel Night.
- `apps/web/index.html`: color de navegador y metadata del arte.
- `apps/web/public/icon.svg`, `apps/web/public/favicon.svg`, `apps/web/public/apple-touch-icon.svg`, `apps/web/public/og-image.svg`: identidad Night/Cobalt/Lime, misma marca.
- `apps/web/public/flower.svg`, `apps/web/public/sparkle.svg`, `apps/web/public/hero-fragments.webp`: actualizar solo si su uso actual es incompatible; no borrar mientras tengan consumidores.
- Copias byte idénticas del arte estático aprobado del kit: `apps/web/public/f16/Typing_Girl_and_Sleeping_Cat.webp`, `apps/web/public/f16/Typing_Girl_and_Sleeping_Cat_frame-00.png`. `Goggle_Kid_Walk` queda fuera de producción F16 tras revisión visual del frame; originales del kit quedan intactos.

**Aplicación y presentación:**

- `apps/web/src/App.tsx`: solo markup/clases de header público/estudiante/docente; no reescribir router, hooks, fetch, estado ni callbacks.
- `apps/web/src/styles/main.css`, `apps/web/src/styles/tokens.css`, `apps/web/src/styles/student-workspace.css`: tokens, reglas globales, header, shells y landing.
- `apps/web/src/features/auth/identity-screen.css`, `apps/web/src/features/auth/StudentLoginScreen.tsx`, `apps/web/src/features/auth/OAuthCompletionScreen.tsx`.
- `apps/web/src/features/gallery/gallery-screen.css`, `apps/web/src/features/gallery/gallery-screen.tsx`.
- `apps/web/src/features/inspector/inspector-teacher-panel.css`, `apps/web/src/features/inspector/inspector-teacher-workspace.css`, `apps/web/src/features/inspector/InspectorTeacherPanel.tsx`, `apps/web/src/features/inspector/InspectorTeacherWorkspace.tsx`, `apps/web/src/features/inspector/TeacherGate.tsx`.
- `apps/web/src/features/mentor/mentor-screen.css`, `apps/web/src/features/mentor/mentor-screen.tsx`.
- `apps/web/src/features/mentor-control/mentor-control.css`, `apps/web/src/features/mentor-control/MentorControlWorkspace.tsx`, `apps/web/src/features/mentor-control/TeacherPasswordReset.tsx`.
- `apps/web/src/features/review/review-screen.css`, `apps/web/src/features/review/review-screen.tsx`.
- `apps/web/src/features/submissions/submission-downloads.css`, `apps/web/src/features/submissions/submission-downloads.tsx`.
- `apps/web/src/features/teacher/teacher-students.css`, `apps/web/src/features/teacher/TeacherStudentsWorkspace.tsx`.
- `apps/web/src/features/trainer/trainer-screen.css`, `apps/web/src/features/trainer/TrainerScreen.tsx`.
- Tests existentes solo si cambia una aserción presentacional/accesible, no funcional: `apps/web/src/features/auth/StudentLoginScreen.test.tsx`, `apps/web/src/features/auth/OAuthCompletionScreen.test.tsx`, `apps/web/src/features/gallery/gallery-screen.test.tsx`, `apps/web/src/features/mentor/mentor-screen.test.tsx`, `apps/web/src/features/review/review-screen.test.tsx`, `apps/web/src/features/trainer/TrainerScreen.test.tsx`, `apps/web/src/features/mentor-control/MentorControlWorkspace.test.tsx`, `apps/web/src/features/mentor-control/TeacherPasswordReset.test.tsx`, `apps/web/src/features/submissions/submission-downloads.test.tsx`.
- La decisión D-06 retira paquetes Astryx temporales solo de `apps/web/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.

**Prohibido:** `apps/api/**`, `packages/contracts/**`, APIs/clients/validators/hooks, `AGENTS.md`, tooling raíz excepto metadatos Astryx anteriores, CI/workflows/deploy, fuentes externas y originales del kit.

## Fases estables, checkpoints y reversión

Cada fase produce un commit local checkpoint en `feature/f16-experience-redesign`. Antes de avanzar: `pnpm --filter @fragments/contracts build`; `pnpm --filter @fragments/web test`; `pnpm --filter @fragments/web typecheck`; `pnpm --filter @fragments/web build`; comprobar rutas/acciones afectadas en Ego Lite. Si falla un gate por el cambio de esa fase, detener avance, ejecutar `git revert <hash-checkpoint>` (sin reescribir historia), registrar causa/salida en `evidencie.md`, corregir en un commit nuevo y repetir.

1. **Fundamento visual:** cambiar tokens CSS, los dos documentos visuales, `index.html`, cuatro assets de marca y dos copias estáticas. Gate: contraste AA del contrato, el mismo arte estático se muestra en modo normal/reduced-motion, hashes del kit coinciden; QA-01 landing y comandos completos.
2. **Landing y estudiante:** `App.tsx`, `student-workspace.css`, auth, gallery, mentor, review, trainer, submissions (archivos exactos arriba). Gate: `/`, `/student/login`, `/auth/complete`, `/student/gallery`, `/student/mentor`, `/student/review`, `/student/trainer`; QA-01..11, keyboard y todos los anchos; sin sesión Review/Trainer conservan montaje actual.
3. **Docente:** inspector, mentor-control, teacher-students (archivos exactos arriba). Gate: `/teacher/inspector`, `/teacher/mentor-control`, `/teacher/students`, `/teacher/reset-password`; pruebas de control Mentor/reset, gates actuales, navegación no expuesta fuera del contexto docente y todos los anchos.
4. **Cierre:** corregir solo allowlist que falle; cerrar QA-12..23, Ego Lite por ruta/estado/viewport, teclado, reduced motion, hashes y drift report. Cierre solo con todos los gates y evidencia real.

Se elige encabezado superior común con etiquetas visibles y scroll horizontal de navegación en viewport angosto; no sidebar ni menú oculto. Review/Trainer se montan como hoy sin gate `getMe()`; Gallery/Mentor retienen el gate actual. Astryx no se adopta tras evaluar APIs y requerimiento de tema/estilos; sus dependencias temporales se retiran.

## Validaciones de aceptación

Cada elemento de `QA-INTERACTION-MATRIX.md` debe incluir acción observada, resultado esperado, método de comprobación, viewport, resultado real, evidencia y estado `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`. No hay cobertura visual completa hasta que Ego Lite cubra cada ruta/viewport y flujos definidos. El commit final solo cierra código que pase las verificaciones disponibles; el informe explicita cualquier bloqueo real.
