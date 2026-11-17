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
- GIVEN viewport de 320, 375, 768 o 1440 CSS px (1024 adicional para comparación), WHEN se renderiza la pantalla, THEN contenido y acciones siguen visibles, legibles y sin overflow horizontal de página. Los anchos CSS equivalentes a 200%/400% se registran aparte si el navegador no expone zoom real.
- GIVEN `prefers-reduced-motion: reduce`, WHEN se muestra contenido visual, THEN no hay movimiento decorativo continuo y el arte sigue comprensible en estático.
- GIVEN asset original aprobado, WHEN se copia a web/public, THEN sus bytes/hashes permanecen idénticos.

## Límites exactos de archivos

Este allowlist define los archivos de producto. Los documentos/evidencias F16 y el fixture local de QA listados abajo también pertenecen al alcance de cierre; no se editan archivos de producto fuera del allowlist.

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

**Entregables de documentación/evidencia permitidos (rutas exactas):**

- `docs/DESIGN_TOKENS.md`, `docs/SYSTEM_DESIGN.md`.
- `task-list/TASKS.md` (solo PLANNER; actualizar estado y referencia a evidencia/commit).
- `task-list/F16/GOAL.md`, `intent.md`, `spec.md`, `evidencie.md`, `concepts_brief.md`, `design_draft.md`, `SCREEN_INVENTORY.md`, `DESIGN_SYSTEM_CONTRACT.md`, `decisions.md`, `QA-INTERACTION-MATRIX.md`.
- `task-list/F16/egm-reviews/qa-readiness-revalidation-round1.md`, `qa-readiness-revalidation-round2.md`, `qa-readiness-revalidation-round3.md` y `qa-readiness-revalidation-round4.md` (solo informes de las rondas R1–R4 planificadas; el número de rondas no cambia sin nueva decisión).
- Las capturas existentes en `task-list/F16/screenshots/baseline/`, `current/` y `qa-final/` son **entradas de solo lectura** para la galería. No se autoriza editar ni regenerar esos archivos en el hito de revisión del propietario.
- Nuevos artefactos autorizados para esta extensión, con nombres cerrados: `task-list/F16/screenshots/qa-final/review-gallery.html` y `review-gallery-1440.png`. Ninguna otra salida generada entra al allowlist de esta extensión.
- `task-list/F16/resources/master-kit/**` es solo entrada de lectura; no se modifica ni se incluye en staging.

**Fixture local de QA (entrada read-only):** `task-list/F16/qa-fixtures/api-server.mjs`. Usa API compilada, SQLite en memoria, identidades sintéticas `.example.test` y providers fake etiquetados; enlaza a `127.0.0.1`, no carga `.env`, no realiza llamadas externas ni modifica fuentes bajo `apps/api/**`. No se modifica en la extensión de revisión visual.

## Fases estables, checkpoints y reversión

La planificación pedía un commit local checkpoint por fase en `feature/f16-experience-redesign`. El historial efectivamente contiene el commit agregado de implementación `7a3fc86fca563c139000a0eed4488914555a6dd3` y el commit documental `595ce175e7395feab6999fc6b1ba472d65e6a31f`; no se reescribe historia ni se afirma que hubo checkpoints por fase. La QA de cierre revalida todas las superficies juntas. Para cambios futuros, antes de avanzar se ejecutan `pnpm --filter @fragments/contracts build`; `pnpm --filter @fragments/web test`; `pnpm --filter @fragments/web typecheck`; `pnpm --filter @fragments/web build`; y Ego Lite en las rutas/estados afectados. Si un gate falla por el cambio de esa fase, detener avance, ejecutar `git revert <hash-checkpoint>` (sin reescribir historia), registrar causa/salida en `evidencie.md`, corregir en commit nuevo y repetir.

1. **Fundamento visual:** cambiar tokens CSS, los dos documentos visuales, `index.html`, cuatro assets de marca y dos copias estáticas. Gate: contraste AA del contrato, el mismo arte estático se muestra en modo normal/reduced-motion, hashes del kit coinciden; QA-01 landing y comandos completos.
2. **Landing y estudiante:** `App.tsx`, `student-workspace.css`, auth, gallery, mentor, review, trainer, submissions (archivos exactos arriba). Gate: `/`, `/student/login`, `/auth/complete`, `/student/gallery`, `/student/mentor`, `/student/review`, `/student/trainer`; QA-01..11, teclado y anchos 320/375/768/1440; Review/Trainer sin sesión conservan el montaje actual.
3. **Docente:** inspector, mentor-control, teacher-students (archivos exactos arriba). Gate: `/teacher/inspector`, `/teacher/mentor-control`, `/teacher/students`, `/teacher/reset-password`; QA-12..16, pruebas locales del control Mentor, gates actuales, navegación por las rutas docentes y todos los anchos. El email de recuperación no se envía a servicios reales.
4. **Cierre:** corregir solo allowlist que falle; cerrar QA-17..25, Ego Lite por ruta/estado/viewport, teclado, reduced motion, hashes y drift report. Se acepta cierre local parcial solo si cada aserción externa/zoom no disponible está etiquetada `BLOCKED`/`NOT_RUN`, el fixture fake está diferenciado de integraciones reales y la recomendación limita expresamente readiness; nunca se convierte un bloqueo en PASS.

Se elige encabezado superior común con etiquetas visibles y scroll horizontal de navegación en viewport angosto; no sidebar ni menú oculto. Review/Trainer se montan como hoy sin gate `getMe()`; Gallery/Mentor retienen el gate actual. Astryx no se adopta tras evaluar APIs y requerimiento de tema/estilos; sus dependencias temporales se retiran.

## Validaciones de aceptación

Cada elemento de `QA-INTERACTION-MATRIX.md` debe incluir acción observada, resultado esperado, método de comprobación, viewport, resultado real, evidencia y estado `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`. No hay cobertura visual completa hasta que Ego Lite cubra cada ruta/viewport y flujos definidos. El commit final solo cierra código que pase las verificaciones disponibles; el informe explicita cualquier bloqueo real.

## Alternatives Considered / Alternativas consideradas

- **Navegación y composición:** el layout elegido es un encabezado superior compartido con rótulos de destino visibles. Se comparó con (a) sidebar fija, que reduce ancho útil y obligaría a transformar el shell en móvil; y (b) drawer/menú oculto, que elimina destinos visibles y añade una acción para descubrir navegación. El encabezado mantiene destinos presentes y permite scroll horizontal solo dentro de la fila estrecha, preservando contenido principal a 320 px. La conducta de rutas sigue siendo la misma.
- **Implementación de componentes:** se consideró Astryx 0.7.16 (Button/Card/Stack verificados) y se rechazó porque el sistema local requería CSS/tokens propios, la adopción añadiría tema/reset/dependencias y tocaría muchas vistas sin reducir semántica o lógica funcional; se conservaron elementos/componentes locales. La decisión y consulta constan en D-06 y `decisions.md`.
- **Entrega para aprobación:** se comparó (a) añadir una ruta/página de galería al producto, (b) exportar un PDF/imagen estática, y (c) crear un HTML autónomo de revisión local. La ruta de producto añadiría alcance y navegación persistente no solicitados; PDF/imagen no permitiría filtrar, seleccionar viewport ni navegar entre rutas; el HTML aislado ofrece esos controles sin alterar el producto ni requerir servicios.

## Galería local para aprobación visual del propietario

- **Archivo exacto nuevo:** `task-list/F16/screenshots/qa-final/review-gallery.html`. Artefacto autónomo HTML/CSS/JS, sin dependencias remotas, servicios ni cambios al producto. Abrir el archivo directamente en Ego Lite o en navegador local; sus imágenes usan rutas relativas a carpetas de capturas existentes.
- **Cobertura:** once rutas explícitas de `SCREEN_INVENTORY.md`, agrupadas como Pública, Identidad, Estudiante y Docente. Cada ruta principal ofrece una captura de escritorio de 1440 px y una móvil de 320 px, reutilizadas desde `qa-final/`. Las capturas autenticadas indican `fixture sintético`; OAuth y correo no simulan servicio externo.
- **Estados adicionales:** Galería detalle, Mentor inspiración, Review completado y Trainer interactivo se presentan como evidencia adicional, respetando los viewports realmente capturados. No inventar una segunda captura móvil para un estado que solo tenga evidencia de escritorio; en ese caso la galería señala el límite y mantiene desktop/móvil para la ruta principal.
- **Comparación:** el control `Antes / después` puede usar `screenshots/baseline/<route>-1440.png` y `screenshots/current/<route>-1440.png` en las once rutas. Para móvil intenta sus pares `-390.png`, pero solo habilita el control cuando ambos archivos cargan y tienen exactamente el mismo ancho/alto intrínseco que el ancho solicitado. La galería informa la causa y mantiene el modo deshabilitado si falta una imagen o las dimensiones difieren; Review y Trainer tienen baseline `419×907` frente a current `390×844`, por lo que no se comparan en móvil. Los pares válidos son snapshots pre-F16/post-F16 de la misma ruta/viewport; rutas API reflejan capturas offline y no certifican paridad de datos/servicios. Capturas autenticadas `qa-final` no se hacen pasar por comparación con baseline anónimo.
- **Controles:** navegación por enlaces entre rutas, filtro de rutas, selector de estado, botones de viewport y modo, foco visible, etiquetas textuales para paleta, tipografía, tamaños, espaciado, iconos y animación/reduced-motion. Controles nativos sin dependencias ni efectos de escritura.
- **Integridad:** no alterar el contenido binario de las capturas ni los assets pixel-art aprobados. Las imágenes de QA usan hashes del kit ya registrados; el HTML solo las referencia.
- **Verificación nueva:** abrir en Ego Lite por `file:///.../task-list/F16/screenshots/qa-final/review-gallery.html`; recorrer las once rutas, comparar pares con dimensiones coincidentes, selector de estado, filtro y navegación por teclado. Confirmar que los dos pares móviles incompatibles queden deshabilitados. Responsive medido mediante `Emulation.setDeviceMetricsOverride` (Ego Lite/CDP) en 320/375/768/1440 px: a 320/375, `innerWidth`, `clientWidth` y `scrollWidth` coinciden; a 768/1440, la barra vertical resta 15 px al `clientWidth`, `scrollWidth` coincide con `clientWidth` y ningún elemento excede el ancho CSS útil. Esto mide emulación CSS, no el zoom real del navegador; no presentar como prueba de zoom 200%/400%. Registrar acciones y resultado en QA-26 y `evidencie.md`.
