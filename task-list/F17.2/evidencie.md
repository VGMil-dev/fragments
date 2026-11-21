# F17.2 — Evidencia

**Estado:** Implementada y validada localmente; pendiente integración y despliegue F14.

## Verificación de origen y proceso

- Rama `codex/f17-ux06-context` creada en un nuevo worktree desde `origin/main` actualizado (`e1c83cd30ba14474aae48db689a00b374d497bb7`). El checkout antiguo y sus archivos sin seguimiento quedaron intactos.
- Skill Vercel instalada como `vercel-react-best-practices` v1.0.0; Codex y los dos agentes pudieron leer `SKILL.md` y las recomendaciones pertinentes.
- SHA-256 de la referencia confirmada: `8db5e9cdc02abb67952b83dc537cc130e155c09ef7dec02c4b405861efb972d8`.
- Revisión independiente: Agente B, PASS en Ego Lite round-06/07; resumen y correcciones en `F17_UX06_EVIDENCIAS/COMPARACION_REVISION_VISUAL.md`.

## Verificaciones ejecutadas

- `pnpm exec turbo test --force`: PASS; contratos 26/26, web 121/121, API 71 passed y 62 omitidas por runtime PostgreSQL.
- `pnpm exec turbo typecheck --force`: PASS, 5 tareas.
- `pnpm exec turbo lint --force`: PASS, 1 tarea.
- `pnpm exec turbo build --force`: PASS, 4 tareas; avisos no bloqueantes del bundle/lucide-react.
- `git diff --check`: PASS.
- Ego Lite: estados académico y personal excluyentes; navegación por teclado Idea → Contexto → Habilidades → Contexto; foco visible 3 px, campos etiquetados; guardado QA sintético y persistencia tras recargar; sin errores de consola observados.
- Responsive Ego Lite: 320, 390, 768, 1024, 1440 y 1672 px sin overflow horizontal. Capturas reales en `F17_UX06_EVIDENCIAS/`.

## Evidencia y límites

La carpeta raíz `F17_UX06_EVIDENCIAS/` contiene 11 archivos incluyendo este informe de trabajo, referencia, capturas, comparación y resultados QA (máximo permitido: 20). El guardado funcional usó un proveedor local en memoria etiquetado QA; no se tocaron datos productivos. Las 62 pruebas omitidas dependen de una instancia PostgreSQL; no se levantó ni modificó F21.

## Integración / producción

- Commit: pendiente.
- PR / CI: pendientes.
- SHA de merge y release/tag F14: pendientes.
- Salud y versión productiva verificadas con Ego Lite: pendiente.
- Notion UX-06: actualizar con enlaces reales una vez completados merge y F14.

El cierre y sus enlaces se añadirán después de ejecutarlos. No declarar despliegue por anticipado.
