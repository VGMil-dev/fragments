# F17.2 — Evidencia

**Estado:** COMPLETA; integrada, verificada y desplegada mediante F14.

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

La carpeta raíz `F17_UX06_EVIDENCIAS/` contiene 12 archivos incluyendo `INFORME_FINAL.md`, referencia, capturas, comparación, resultados QA y verificación de producción (máximo permitido: 20). El guardado funcional usó un proveedor local en memoria etiquetado QA; no se tocaron datos productivos. Las 62 pruebas omitidas localmente dependen de una instancia PostgreSQL; F14 las ejecutó en su PostgreSQL desechable sin modificar F21 productivo.

## Integración / producción

- Commit de implementación: `cc60def010e01fd2f4dd7abb1e2dbe1b2b48a87b` (`feat(mentor): implementa contexto UX-06`).
- Commit documental previo: `79ea73dcdf97a655db44e18597d4652d3feb01da` (`docs(mentor): registra QA y estado F17.2`).
- PR #72 integrado; CI run `44925110965` success.
- SHA de merge: `00b548cc715c7b04e862e985a63f5bb265e0a54e`.
- Tag anotada `v0.5.6`, tag object `4e793495238f699914afe9a1d7967641aeae405b`.
- F14 run `44925403964` success; release `453828612`, agente reportó `release_deployed`.
- Producción: API/web healthy con v0.5.6 y SHA exacto, `/health` 200, bundle verificado con Ego Lite. Detalle en `F17_UX06_EVIDENCIAS/PRODUCCION_F14.md`.
- Notion UX-06: se actualizará después del PR documental de cierre.

Paquete raíz `F17_UX06_EVIDENCIAS/`: 12 archivos de máximo 20.
