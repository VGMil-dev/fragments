# F23 — Evidencia

Estado: en validación; implementación, PR, release F14 y health/version públicas están verificadas; cuenta docente preparada, reset solicitado y sesión autenticada pendiente. Actualización productiva previa: commit `d91be42`; preparación de cuenta y reset documentados en este cambio. Rama de trabajo `codex/f23-teacher-dashboard`, worktree `C:\Users\vgmil\.codex\worktrees\f23-teacher-dashboard\Fragments`. Commit de implementación: `4382f22bd18bb7642d3c54bc00394d9c92d94b84`; PR #81 merge `d0b9334463baf56f1644f305164cb87cf8599393`. CI del PR run `44972438641` terminó success. Tag anotada `v0.5.9` apunta al merge; F14 run `44973255280`: `verify-build`, `attest-package` y `publish-approved-release` success. Required reviewers está desactivado; Wait timer y admin bypass también; se conserva el entorno y tag rule `v*.*.*`. GET `/` y `/health` 200; `database=ready`; bundle público confirma `v0.5.9` y `d0b9334`. PRs documentales #82, #83 y #85 integradas por merge `6bc7ca7`, `a4822bf` y `ba1e1dfc`; CI `44974016480`, `44974308892` y `44980150852` success. Se realizó solo una actualización limitada de `isTeacher` en la identidad exacta autorizada de `fragments_prod`; no se tocaron otras cuentas, clases ni bases.

## Referencia y revisión

- Referencia aprobada: 1671 × 941 px; SHA-256 `95853ad8066e204408b223cf38db8ab43c146cddc8bd25c61520c72fa5b43584`, coincide con el adjunto. Copia en `F23_EVIDENCIAS/referencia-aprobada.png`.
- Capturas Ego Lite en `F23_EVIDENCIAS/`: dashboards a 320/390/768/1024/1440/1671 px, menú abierto a 320, acceso docente anónimo, bloqueo de estudiante, dashboard estudiantil y placeholder docente de Review.
- Perfiles Ego Lite separados: `Profile 3` / task space `F23-Docente` y `Profile 5` / `F23-Estudiante`; ambos task spaces se cerraron al terminar.
- Inicio docente autenticado mostró 1 aula propia y 1 solicitud pendiente de unión de fixture; los proyectos sin vínculo y actividad sin consulta autorizada quedan explícitamente no disponibles. No se mostró resultado Review sin relación autorizada.
- Inicio de sesión de fixture estudiantil local: HTTP 200; `/teacher/dashboard` muestra «Acceso docente requerido»; `/student/dashboard` carga con el mismo perfil. Menú docente se abrió con Enter; cierre de sesión devuelve a login.
- `document.documentElement.scrollWidth` coincidió con `innerWidth` en los seis tamaños. Primera ronda de revisor B indicó compresión de KPI a 768; el breakpoint se ajustó al ancho útil del contenido y se repitieron las capturas. Revisión independiente posterior: **PASS**; sin hallazgos visuales pendientes. Revisor observó fidelidad general a Pixel Night y vacíos/métricas honestos.

## QA de código y datos

- Referencias y reglas consultadas: `SYSTEM_PROMPT_CODEX.md`, `docs/SYSTEM_DESIGN.md`, `docs/CONTRACTS.md`, `docs/DESIGN_TOKENS.md`, F23/F18/F17/F11/F21/F14 en Notion; skills `vercel-react-best-practices`, `ego-browser` y `notion:maintain-space`.
- QA PostgreSQL local efímero, PostgreSQL 18.6, host `127.0.0.1:55443`, sin volumen; guardia `SELECT current_database()` confirmó `fragments_test` antes de migración y pruebas. Nunca se usó el `.env` del checkout original ni se registraron URL/secretos.
- `pnpm --filter @fragments/api prisma:generate` — PASS; `prisma:migrate:deploy` — PASS, incluidas migraciones previas y `20261121200000_optional_classroom_group_label`.
- `pnpm --filter @fragments/api test` contra `fragments_test` — 34 archivos / 150 pruebas PASS; coberturas incluyen aislamiento de docente, sesión requerida, estudiante 403, agregados, solicitudes activas/archivadas y preservación de identidades históricas.
- `pnpm test` — PASS: contracts 28/28, web 137/137, API 84 passed / 66 omitidas por requerir DB. Las 66 fueron cubiertas por la ejecución de API con `fragments_test` indicada arriba.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check` — PASS. Build Vite observó chunk principal minificado de 538.62 kB y avisos Rolldown sobre directivas `use client` de Lucide.
- Navegación autenticada probó `/teacher/classrooms`, `/teacher/students`, `/teacher/mentor-control`, `/teacher/inspector` y `/teacher/settings`: todas conservan el shell docente y no vuelven al login. `/teacher/review` muestra el placeholder seguro. Las pruebas unitarias cubren además entrada y shell. No se cambió el motor de sesión.

## Cambios

- Shell docente Pixel Night, entrada por `/teacher/dashboard`, navegación común y rutas protegidas por rol; destino Review comunica límites actuales.
- Resumen autenticado con aulas propias y solicitudes pendientes solo de unión; límites del DTO y aislamiento cubiertos con pruebas.
- `groupLabel` opcional/null en contratos, API y persistencia; clave de aula nueva no depende del grupo. Migración solo elimina `NOT NULL`; se conservan claves históricas y no se fusionan aulas.
- Formulario de aula deja de solicitar paralelo escolar. Navegación/landing apunta al único acceso docente.

## Operaciones aún no completadas

- SSH `servidor` conectó con host key y autenticación pública verificadas. Lectura segura confirmó `fragments_prod`, una identidad exacta con `role=user`, `isTeacher=false`, proveedores `credential` y `github`, sin matrículas, propuestas ni aulas asociadas. Se actualizó únicamente `isTeacher=true` para ese registro; lectura posterior confirma indicador docente y ambos proveedores intactos. No se ejecutaron otras escrituras, seeds ni migraciones.
- `AUTH_ENABLED=true`; presencia de RESEND_API_KEY/RESEND_FROM_EMAIL comprobada sin mostrar valores. Better Auth devolvió HTTP 200 y el callback no registró fallo; según el código, Resend aceptó (2xx). GET a historial Resend dio 401 por alcance de llave, sin ID/evento; recepción en bandeja no confirmada. Origin de `PUBLIC_APP_URL` coincide con producción; `/teacher/reset-password` y `/teacher/dashboard` cargan con HTTP 200. No se inició sesión: propietario debe abrir el correo y establecer clave final.
- F14 y F23 en Notion registran Required reviewers desactivado y los resultados de release/producción. F23 también registra la marca docente, solicitud de recuperación aceptada por el callback y el pendiente del dueño: establecer contraseña y validar sesión. Historial de Resend no accesible con la llave actual (401), sin ID/evento ni confirmación de bandeja.

## Índice y cierre

`F23_EVIDENCIAS/INFORME_FINAL.md` es el índice de las capturas y el resumen final. El directorio tiene 13 archivos, bajo el máximo de 20. Release, versión pública y health están comprobados. F23 permanece en validación hasta que el propietario establezca su contraseña y valide inicio de sesión y permisos docentes efectivos en producción.
