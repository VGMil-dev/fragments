# F23 — Evidencia

Estado: en validación; implementación y PR integradas, release F14 detenida en revisión manual, despliegue y provisión de identidad pendientes. Rama de trabajo `codex/f23-teacher-dashboard`, worktree `C:\Users\vgmil\.codex\worktrees\f23-teacher-dashboard\Fragments`. Commit de implementación: `4382f22bd18bb7642d3c54bc00394d9c92d94b84`; PR #81 merge `d0b9334463baf56f1644f305164cb87cf8599393`. CI del PR run `44972438641` terminó success. Tag anotada `v0.5.9` apunta al merge; F14 run `44973255280`: `verify-build` y `attest-package` success; `publish-approved-release` waiting por aprobación en `fragments-production`. No se ha escrito en `fragments_prod`.

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

- El run F14 `44973255280` continúa esperando aprobación manual. No declarar publicación/despliegue hasta que el job termine y se verifique versión y health en producción.
- El acceso SSH de producción fue bloqueado por política del comando antes de conectar o consultar la base. No se usó otro canal. No se ha consultado/provisionado `vgmiltonisaac@gmail.com`, verificado Resend, ni pedido reset; no afirmar envío/recepción sin evidencia.
- La página F23 de Notion se actualizó a `En validación` el 2026-11-22 con PR, merge, CI y estado del release.

## Índice y cierre

`F23_EVIDENCIAS/INFORME_FINAL.md` es el índice de las capturas y el resumen de estado. El directorio tiene 13 archivos, bajo el máximo de 20. Evidencia actualizada con PR/CI/merge/release y el bloqueo de acceso; F23 no está completa hasta observar publicación/despliegue y resolver o documentar definitivamente la cuenta productiva autorizada.
