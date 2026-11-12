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
- Las credenciales se proporcionaron en el chat, pero no existe aquí una interfaz de transferencia privada que evite registrar su valor en el comando/herramienta. Por la restricción explícita de no exponerlas en comandos o logs, **no se instalaron** en VPS ni workstation. No se reinició producción.
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
- Se actualizó `refs/remotes/origin/main` por fetch normal y se integró en F15 mediante merge, sin reescritura. `App.tsx` tuvo conflicto de imports; la resolución conserva los tipos/rutas F15, `BuildVersion` F13 y pie de versión para rutas estudiantiles/docentes. El merge normal local `831d6092a30e94c179c3b0cf1c1be584c6f4659d` integra F15 con F13/F14. La rama está publicada y el PR #10 está abierto; faltan checks y merge a GitHub `main`. Producción no se despliega desde esta integración.
- Verificación fresca tras la integración: API 28 archivos/109 tests; web 17 archivos/67 tests; contratos 1 archivo/19 tests. Typecheck API/web/contratos y lint de contratos terminaron con salida 0. Builds API/contratos/web exitosos; Vite advierte chunk JS de 515.74 kB (>500 kB). `git diff --check` sin errores.
- La rama local se abrió con Ego Lite v2.2.0 usando fixture sintético. Landing muestra `dev`; panel docente muestra usuario/propuestas/rúbricas sintéticos; abrir el mismo panel desde un origen sin cookie muestra login y no datos. A 390 px `innerWidth`, `documentElement.scrollWidth` y `body.scrollWidth` son 390. La pantalla estudiantil informa que OAuth no está configurado; no se intentó login real.
- El callback base persistente y el contenedor API corresponden a `https://fragments.gavanti.org`; callback esperado por Better Auth: `https://fragments.gavanti.org/api/auth/callback/github`. El preflight ejecutado antes de instalar credenciales encontró `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` ausentes tanto del `.env` activo como de la API. Las credenciales están en el adjunto original de F15; dos intentos de envío por SSH estricto a `/opt/fragments/deploy/production/.env` terminaron en timeout de conexión antes de confirmar el cambio. No se reportan instaladas ni se reinició la API.
- Para conservación, se creó backup SQLite consistente `fragments-f15-preflight-20261112T205500Z.sqlite` en `/var/backups/fragments`, `root:root 0600`, directorio `0700`; `PRAGMA integrity_check=ok`. En copia temporal aislada, migración runtime de esquema 9 a 10 terminó con integridad `ok`, preservó digest de todas las columnas históricas de propuestas, revisiones, evaluaciones y versiones de rúbrica; propuestas antiguas siguen sin dueño y no se generaron publicaciones históricas. La base productiva no recibió la migración.
- GitHub `fragments-production`: reviewer requerido `VGMil-dev`, `prevent_self_review=false`, `can_admins_bypass=false`, política `v*.*.*`; settings leídos de nuevo por API. Es aprobación manual obligatoria con menor independencia entre publicación y aprobación, autorizada por el propietario para este release. No hay atestación ni sesión OAuth real todavía.
- Se confirmó que `v0.4.0` no existe en refs ni releases. No se creó tag, no se publicó release, no hubo merge aún a GitHub `main` ni despliegue. `env` y datos académicos originales permanecieron intactos. El release permanece bloqueado hasta confirmar instalación privada de OAuth y luego completar login real, revisión manual y el resto del piloto.
