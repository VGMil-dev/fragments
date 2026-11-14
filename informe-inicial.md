# Informe inicial F16-CICD

Fecha: 2026-11-14 (America/Bogota)

## Gate 0

**PASS.** El repositorio está sincronizado con el HEAD remoto consultado y el worktree nuevo se creó desde ese commit exacto.

| Comprobación | Resultado |
|---|---|
| `git fetch origin --prune --tags` | Correcto; se descargaron las referencias y tags remotos, incluida `v0.4.5`. |
| `git ls-remote origin refs/heads/main` | `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2` |
| `git rev-parse origin/main` | `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`; coincide con GitHub. |
| `v0.4.5` | `a3309864f8ec0db38afef145f5f0bb60c22aabb2`; confirmado ancestro de `origin/main`. |
| Worktree F16-CICD | `C:\Users\vgmil\worktrees\fragments-f16-cicd`, rama `codex/f16-cicd-autonomy`. |
| `git rev-parse HEAD` en F16-CICD | `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`. |
| `git rev-parse origin/main` en F16-CICD | `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`; igual a HEAD. |
| `git merge-base --is-ancestor origin/main HEAD` | Correcto. |
| Worktrees preexistentes | Conservan sus rutas, ramas y SHA. No se cambió el checkout `main`, ocupado en otro worktree. |
| Checkout original | Conserva su rama antigua y el archivo DOCX sin seguimiento; no se alteró. |

## Configuración y EGM

- Configuración Codex leída sin mostrar valores secretos: `model = "gpt-6-luna"`, `model_reasoning_effort = "medium"`.
- CLI: `codex-cli 0.166.0`.
- EGM oficial instalado mediante el marketplace ya configurado `egm`: plugin `egm@egm`, versión `0.1.1`, instalado bajo el cache de usuario.
- La integración oficial recomienda una sesión nueva tras instalar el plugin. Esta sesión comenzó antes; por ello se leyeron directamente sus instrucciones de Codex y se usarán los archivos oficiales de persona/estándar con la herramienta nativa de agentes.
- `gpt-6-luna` y `medium` están disponibles como valores explícitos de la herramienta de agentes. Cada Goldfish se lanzará con `fork_turns: "none"`, `model: "gpt-6-luna"`, `reasoning_effort: "medium"`; la salida de cada agente se verificará antes de contarla.
- La versión de Codex advierte que `fork_turns: "none"` no prueba que el host excluya archivos de instrucciones del repo/usuario. Los revisores no recibirán la conversación previa; esta limitación de aislamiento se registrará y no se exagerará.

## Alcance del repositorio

En la base verificada existe `task-list/TASKS.md`, pero no había una tarea F16-CICD asignada. `AGENTS.md` reserva al planner los cambios en `task-list/TASKS.md`; el planner registra ahora esa tarea y su evidencia en esta rama.

## Diagnóstico inicial de solo lectura

- CI de PR fija las acciones por SHA completo, limita permisos a `contents: read`, instala dependencias bloqueadas y ejecuta pruebas del agente, typecheck, lint y build.
- El workflow publicado de release valida una tag semántica anotada, el commit exacto y su ascendencia en `main`; comprueba que el workflow de release de la tag coincide con `main`, construye imágenes ARM64, firma el archivo y vuelve a verificar atestación, manifiesto, SHA y run antes de publicar detrás del entorno `fragments-production`.
- El agente pull de producción contrasta identidad del repositorio, workflow/job exitosos, tag/SHA, fuente Git, atestación y digest; exige snapshot SQLite íntegro antes del cambio y revierte las imágenes de código sin restaurar SQLite si falla el healthcheck.
- Los backups automáticos se guardan en `/var/backups/fragments` dentro de la misma VPS. La documentación advierte que aún no son externos al host: perder el host puede afectar a la base y a todos sus backups locales.
- La API aplica migraciones al iniciar. El rollback conserva la base y restaura solo imágenes de código. Las migraciones 1–10 presentes en esta base son aditivas (creación de tablas y columnas); no se observó una incompatibilidad actual con el rollback, pero migraciones futuras requieren compatibilidad hacia atrás o una estrategia explícita.

Estas observaciones son del implementador y no equivalen a una revisión Goldfish. No se han clasificado como hallazgos aprobados ni corregido archivos de CI/CD.

## Estado real consultado en GitHub

- `Fragments CI`, run `43613267024`, SHA `73e19670f8b283c306c9b00c57a196205d06dd6b`: completado, `success` ([run](https://github.com/VGMil-dev/fragments/actions/runs/43613267024)).
- Release `v0.4.5`, run `43559211195`, SHA `a3309864f8ec0db38afef145f5f0bb60c22aabb2`: `verify-build`, `attest-package` y `publish-approved-release` completados con `success`; el release público incluye manifiesto, archivo ARM64 y atestación ([run](https://github.com/VGMil-dev/fragments/actions/runs/43559211195), [release](https://github.com/VGMil-dev/fragments/releases/tag/v0.4.5)).
- No se pudo verificar el estado de despliegue real en VPS mediante la integración de GitHub disponible; por tanto, el éxito de Actions no se presenta como prueba de que el agente local haya aplicado la release.

## Revisiones, pruebas y cambios

- Revisiones independientes: 0.
- Hallazgos y correcciones de implementación: ninguno; el diseño está en preparación.
- Pruebas locales: no ejecutadas; solo se consultó el estado remoto de Actions.
- Estado de automatización: el CI de PR más reciente consultado y la publicación de `v0.4.5` terminaron correctamente; aplicación en VPS no confirmada.
- SHA de cambios: ninguno.

