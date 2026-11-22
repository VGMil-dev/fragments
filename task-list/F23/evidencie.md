# F23 — Evidencia

Estado: en validación; implementación, PR, release F14 y health/version públicas están verificadas; cuenta docente preparada, sesión `/teacher/dashboard` validada y solicitud estudiantil por código pendiente de aprobación docente. Actualización de aula/sesión en commit `399900a`; referencia de esta evidencia en `5c38ac1`. Actualización productiva previa: commit `d91be42`; preparación de cuenta y reset documentados en commit `b6891e2`. Rama de trabajo `codex/f23-teacher-dashboard`, worktree `C:\Users\vgmil\.codex\worktrees\f23-teacher-dashboard\Fragments`. Commit de implementación: `4382f22bd18bb7642d3c54bc00394d9c92d94b84`; PR #81 merge `d0b9334463baf56f1644f305164cb87cf8599393`. CI del PR run `44972438641` terminó success. Tag anotada `v0.5.9` apunta al merge; F14 run `44973255280`: `verify-build`, `attest-package` y `publish-approved-release` success. Required reviewers está desactivado; Wait timer y admin bypass también; se conserva el entorno y tag rule `v*.*.*`. GET `/` y `/health` 200; `database=ready`; bundle público confirma `v0.5.9` y `d0b9334`. PRs documentales #82, #83, #85 y #86 integradas por merge `6bc7ca7`, `a4822bf`, `ba1e1dfc` y `e4275952`; CI `44974016480`, `44974308892`, `44980150852` y `44980950136` success. Se realizó solo una actualización limitada de `isTeacher` en la identidad exacta autorizada de `fragments_prod`; no se tocaron otras cuentas, clases ni bases.

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

## Verificación productiva y estado final

- SSH `servidor` con host key y llave autorizada; lectura guardada de `fragments_prod`. La cuenta exacta quedó con `isTeacher=true`, `role=user` y proveedores `credential`/`github` intactos. No tenía datos estudiantiles asociados al aprovisionamiento; la única escritura de cuenta fue esa marca.
- Resend: configuración presente sin revelar valores; Better Auth HTTP 200 y callback sin error (implementación exige 2xx); la consulta del historial API devuelve 401, así que no se verifica recepción en bandeja ni ID. El propietario confirmó y Ego Lite observó sesión autenticada en `Fragments-Docente`; `/teacher/dashboard` muestra la identidad docente y la versión `v0.5.9`/`d0b9334`.
- Aula `Programación Móvil` en `fragments_prod`, período `2026 - 2027`, contexto React Native + Expo. Código generado (43 caracteres; no persistido en evidencia). Perfil `Fragments-Estudiante`, `@MilordV`, envió solicitud; el panel docente muestra un registro `pending` con origen `Código de aula`. No se aprobó la solicitud.
- F14 y F23 en Notion actualizados con release, cuenta, acceso y matrícula pendiente.

## Índice y cierre

`F23_EVIDENCIAS/INFORME_FINAL.md` es el índice y resumen final. El directorio tiene 13 archivos, bajo el máximo de 20. Release, versión, health, acceso docente autenticado y flujo de solicitud por código están comprobados. Limitación restante: aprobar manualmente la solicitud de `@MilordV` si el propietario desea matrícula activa; no hay vínculo verificable de proyectos/Review por aula.
