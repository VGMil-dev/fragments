# F07 — Evidence / evidencie

Estado: COMPLETA (2026-11-05). La integración, QA visual, regresión, Promptfoo local, autenticación y persistencia están verificadas; no se desplegó.
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

## Pendiente al cierre F02 previo — 2026-11-04

- F05: endpoints Review, almacenamiento/cola SQLite, reader GitHub real, AI Gateway y fixtures Promptfoo.
- F06: integrar panel/rutas/contrato de Inspector tras alinear alcance compartido.
- Completar F04 según su evidencia: catálogo opt-in/coincidencias y borradores versionados.
- Repetir QA integrado cuando F05/F06 estén conectados; no se probó proveedor remoto ni despliegue Docker de extremo a extremo en este cierre.
- Commit de integración F02: `86ee816` (`feat(f02): conecta flujo estudiantil`).
- Este commit registra la evidencia parcial de F07; la tarea global sigue abierta.

## Seguimiento de integración — 2026-11-04

- Commit de integración verificado: `7d1417d` (`feat(mvp): integra flujos con proveedores seguros`).

### Verificación automatizada

- `pnpm build` — exit 0; API, contratos y web (3/3 paquetes).
- `pnpm test` — exit 0; API 78/78 y contratos 18/18.
- `pnpm --filter @fragments/web exec vitest run src` — exit 0; 12 archivos, 42 pruebas.
- `pnpm typecheck` — exit 0; 4/4 tareas del workspace.
- `pnpm lint` — exit 0; la configuración actual ejecuta lint/typecheck en contratos solamente.
- `git diff --check` — exit 0.

### Ego Lite / QA local

- `ego-browser skill` completó la guía instalada v2.2.0 antes de usar el browser.
- API temporal: `/health` → 200, SQLite ready; Vite → 200. La sesión docente anónima → `authenticated:false`.
- En Ego Lite se inspeccionaron landing, Galería y Mentor. El viewport reportó 0×0, por lo que el click visual caducó y no se afirman pruebas visuales ni breakpoints móviles.
- Se usó `page.fetch()` documentado por Ego Lite a través del proxy de la app: crear propuesta 201, editar 200 a versión 2, historial 200 con dos versiones, activar opt-in 200 y galería con una entrada.
- Inspector sin sesión → 401. No se hizo login de una persona porque no existe cuenta provisionada localmente.
- TaskSpace Ego Lite y servidores locales se cerraron al terminar.

### Promptfoo y servicios externos

- Se intentó `pnpm dlx promptfoo@0.125.1 eval -c evals/promptfooconfig.yaml --no-cache --output task-list/F07/promptfoo-results.json` con telemetría, actualizaciones, sharing y generación remota desactivados.
- Promptfoo descargó su CLI efímera pero no inició la evaluación: `ERR_MODULE_NOT_FOUND @nodable/entities` desde `fast-xml-parser@5.12.0`. Intentar añadir el paquete auxiliar como segundo `dlx` package no resolvió el árbol; no se tocó `pnpm-lock.yaml` por este problema externo.
- La configuración existente solo referencia `fake-local-review`, pero la evaluación real de calidad con Gateway no se ejecutó. No hay resultados ni puntuaciones de Promptfoo para reportar.
- Sin tarifas máximas del Gateway, F04/F05/F06 quedan sin llamadas de IA según el límite autorizado. Gasto externo de IA observado: USD 0. No hubo despliegues.
- F07 continúa `[ ]` hasta ejecutar Promptfoo correctamente, completar pruebas AI Gateway autorizadas, y repetir visual QA con viewport usable. No se ejecutó Playwright.

## Revalidación integrada previa — 2026-11-05 (histórica; supersedida abajo)

**Rama:** `codex/fragments-mvp`. **Responsable:** Planner. Skills: `ego-browser` v2.2.0 y `verification-before-completion`. No se usó Playwright, Puppeteer ni Cypress.

### Regresión

- `pnpm test` — salida 0; contratos 18/18, API 78/78 (21 archivos), web 12 archivos dentro de la suite del workspace.
- `pnpm typecheck` — salida 0; API, contratos y web.
- `pnpm build` — salida 0; los tres paquetes del workspace.
- `pnpm lint` — salida 0; la configuración actual ejecuta lint/typecheck en contratos solamente.
- `git diff --check` — salida 0 antes del commit de integración.
- Después de ajustar la inicialización/migración Better Auth, `pnpm --filter @fragments/api exec vitest run src/auth/better-auth.test.ts src/http/app.test.ts` — 9 pruebas aprobadas, sin warnings de esquema.

### Promptfoo y Docker Compose

- Promptfoo 0.125.1: 3/3 fixtures locales aprobados, 0 errores; no hubo proveedor de pago.
- `docker compose config --quiet` — salida 0. `docker compose up -d --build` construyó y arrancó el API. `/health` devolvió `status=ok`, `database=ready`.
- Se creó una propuesta con opt-in local, se reinició `api` y Galería siguió devolviendo una fila. `docker compose stop api` detuvo el servicio; se conservó el volumen `fragments_fragments-data`.

### Ego Lite

- La guía `ego-browser skill` v2.2.0 se leyó/ejecutó antes del navegador. Viewport real reportado: 982×921, no 0×0.
- Verificó login, sesión persistente, consulta de Review, reto real, asignación, defensa persistida, logout y rechazo anónimo (401). La captura de escritorio es `screenshots/inspector-desktop.png`.
- Se intentó ajustar el viewport con el CDP de Ego Lite; la API disponible no permitió establecer dimensiones móviles. No se afirma responsive 390px ni se inventó una captura móvil. Este es el bloqueo restante para F07.

### Coste acumulado

- En la base integrada, seis recibos settled suman USD 0.000836; el ledger no persiste desglose de tokens.
- Incluyendo las pruebas diagnósticas anteriores en bases aisladas y contando cada recibo desconocido por su reserva máxima, la cota acumulada se mantiene bajo USD 0.01 del presupuesto autorizado de USD 1.00.
- No hubo despliegue ni solicitudes a Moodle. Las lecturas GitHub fueron GET a repositorios públicos autorizados.

**Estado:** F07 permanece abierta por falta de verificación visual y captura de viewport móvil; no se declara MVP global completo.

### Cierre de integración Planner — 2026-11-05 (histórico; supersedido abajo)

- Commit de código integrado: `ab3aa60` (`feat(mvp): cierra integracion autorizada`).
- Regresión ejecutada sin caché: `pnpm exec turbo test --force` (contratos 18/18, API 78/78), `pnpm exec turbo typecheck --force`, `pnpm exec turbo build --force`, `pnpm exec turbo lint --force`, `git diff --check` — todo con salida 0.
- El aviso genérico de Better Auth sobre validación de esquema aparece en la prueba de signup deshabilitado; es no fatal. El plan de migración post-run informa cero tablas/columnas e índices pendientes y cero problemas.
- F04–F06 figuran completadas en `task-list/TASKS.md`. F07 sigue abierta exclusivamente por no poder establecer ni validar viewport 390px en Ego Lite; la captura disponible es de escritorio (982×921).
- SHA-256 de `task-list/F07/screenshots/inspector-desktop.png`: `26FC9A0DA464BB8F7D262D2229D9AAC1ADDF88E31A26B8823BE6D54ADD2C6BFE`.

## Cierre F07 — 2026-11-05

**Resultado:** criterios originales completados. Se respetó `codex/fragments-mvp`; no se desplegó, no se ejecutó código de estudiantes y no se realizaron solicitudes nuevas al AI Gateway. La base temporal SQLite existente se preservó.

- Commit de prueba Better Auth: `c630d6f` (`test(auth): aisla validacion de esquema del fixture`).
- Commit documental de cierre F07: `0d2c6d9` (`docs(f07): cierra QA visual y regresion`).

### Diagnóstico y QA Ego Lite

- Se leyó/ejecutó `ego-browser skill` v2.2.0 antes del navegador. No está instalada una skill `frontend-design` en este entorno; se siguieron los criterios de accesibilidad del proyecto y la skill de Ego Lite.
- Inventario: Profile 1 “Milton”, un TaskSpace preexistente del usuario con una pestaña ajena (WhatsApp al cerrar); no se inspeccionó ni alteró. Se creó y cerró un TaskSpace separado para F07.
- Causa del falso bloqueo móvil: el intento anterior no llamó el método CDP documentado a nivel de página. `page.cdp("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true})` sí configura el viewport. Se verificaron capturas con viewport 390×844 y escritorio 1440×900; no se tocaron estilos para compensar el navegador. No hubo overflow horizontal en móvil.
- Mentor, Review e Inspector se inspeccionaron en escritorio y móvil. Formularios: validación vacía presentó cinco campos inválidos en Mentor y tres en Review. Se capturaron estados de carga y error usando respuestas sintéticas locales 503, sin llamar al API/Gateway; botones quedaron deshabilitados durante envío y se mostraron mensajes genéricos recuperables.
- Navegación: enlace superior Mentor→Review actualiza `aria-current=page`; volver desde Review retorna a Mentor. `<main>` único, enlace de salto, nombre accesible de navegación, inputs/textareas etiquetados y foco visible de teclado (contorno de 3 px). Inspector presenta estado no encontrado para ID inexistente.
- Login docente local exitoso y sesión verificada; el Inspector autenticado alcanzó el endpoint protegido y recibió `REVIEW_NOT_FOUND` para recurso inexistente. Logout dejó sesión nula y el Inspector pasó a `401 AUTH_REQUIRED`. Registro público comprobado: `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`; no se creó cuenta pública. La suite también verifica rechazo de usuario no docente.

### Better Auth

- El warning de esquema en la prueba era un error de configuración del fixture anterior: el caso que solo inspecciona orígenes creaba una base en memoria sin migrar y usaba validación predeterminada. Se limitó `validateSchema:false` a ese fixture. `pnpm --filter @fragments/api exec vitest run src/auth/better-auth.test.ts --reporter=verbose` pasó 3/3 sin warning; la suite API completa pasó sin ese warning.
- El registro continúa bloqueado. La comprobación HTTP devolvió `EMAIL_PASSWORD_SIGN_UP_DISABLED`; no se habilitó signup para ocultar el aviso.

### Persistencia y regresión sin caché

- API local: `/health` informó `status=ok,database=ready`; `/api/gallery` devolvió una fila antes y después de detener y volver a iniciar el proceso API. Se usó la base temporal existente sin borrarla.
- `pnpm --filter @fragments/api exec vitest run --reporter=dot` — 21 archivos, 78/78.
- `pnpm --filter @fragments/contracts exec vitest run --reporter=dot` — 18/18.
- `pnpm --filter @fragments/web exec vitest run src --reporter=dot` — 12 archivos, 42/42.
- `pnpm exec turbo typecheck --force` — 4 tareas, sin caché.
- `pnpm exec turbo build --force` — 3 paquetes, sin caché.
- `pnpm exec turbo lint --force` — salida 0, sin caché; la configuración actual comprueba contratos.
- Desde `evals/`: `npx.cmd --yes promptfoo@0.125.1 eval --config promptfooconfig.yaml --no-cache --no-progress-bar --no-table` — 3/3 fixtures locales aprobados, 0 errores, proveedor fake; sin solicitudes externas ni gasto nuevo.
- `git diff --check` — salida 0.

### Capturas F07

Archivos nuevos bajo `task-list/F07/screenshots/`; SHA-256:

- `f07-mentor-desktop.png` — `7e06dc3480372bc24f78df7f5adc99f54abed6e553fa0bdebbe0ffed30b0a78f`
- `f07-mentor-mobile.png` — `a4d92408397ed45155a63031c175c0bb69361aa61c60301b21e901759f47d488`
- `f07-review-desktop.png` — `a400b5c29a650f6be506be5c76087d599bdefd5fdad3329e4363328e586eb9b9`
- `f07-review-mobile.png` — `0b06d31fa3b0bfdcb57d6455aea3d2dbbde3ad0d6b1738e62ae6233fd7804e91`
- `f07-inspector-desktop.png` — `29de39b3c6f9ac3248dfadb58376117b07bc06d676384c17b2e3de70dfc57ee8`
- `f07-inspector-mobile.png` — `12e04f27ef12039293e5fae1f643d2510ff1527dc3bfa754661609913e15e5c4`
- `f07-inspector-authenticated-desktop.png` — `58436feea87d739816345b946249794ae61561aa7390ff5690c3c824a859722f`
- `f07-mentor-validation-mobile.png` — `4f0c4e9077b610efa50a42bdf060020433703df45dabfaef186527eba07a727e`
- `f07-review-validation-mobile.png` — `2bde28a075ecc09ef9ad00c83f2bbe6d6f8e82fbc0e4294ab1084208ac8ca46b`
- `f07-mentor-loading-mobile.png` — `96fa1238d833232e780e878809d9eaa49cb186c70bd75f47309f3ec0dcc4a744`
- `f07-mentor-error-mobile.png` — `2b5eb653ebbf2675d9d8d09f8bbdbf9b58020c13cecc287ac7531ff7a5ca9475`
- `f07-review-loading-mobile.png` — `292633c432ae3f72de7f7e29ab579aba6f143d3c60b6a43a7487206e08744acf`
- `f07-review-error-mobile.png` — `34f216a8e4e154e5da88f6733e670fd99dedc2f2c371d5e7c4c18a336d3cc5bb`

Las capturas históricas se preservaron. No se modificaron `assets/flower.svg` ni `assets/sparkle.svg` en este cierre. `.env` y la base SQLite permanecieron fuera del staging.
