# F17.1 — Pulido visual de Mentor

## Resultado

**CONFORME en la rama local `codex/f17-mentor-polish`.** La revisión visual independiente de Agente B confirmó la composición de Idea frente a la imagen aprobada, las seis etapas y el reflow en 320, 390, 768, 1024 y 1440 px. El isotipo A-003 está implementado en `apps/web/public/icon.svg`, cabecera y favicon.

Commit local: `7f164ea` (`feat(mentor): pule la experiencia visual de Mentor`).

## Cambios

- Mentor presenta navegación compacta «Tu propuesta», cabecera contextual, progreso calculado desde campos obligatorios reales, campos de Idea distribuidos y acciones secundarias de Word.
- Se mantienen las seis etapas funcionales y sus funciones documentadas. En móvil se usa selector de etapa con controles accesibles.
- El aviso sobre publicación y retiro se presenta en Evaluación; la barra global de compartir se retiró del paso de Mentor.
- El logo público coincide con el SVG canónico A-003, color `#D4FF24`. HTML referencia `/icon.svg?v=f17-mentor-polish`.
- A 320 px la cabecera refluye sin solapamiento; a 768 px el formulario ocupa 467 px y la navegación global pasa al shell móvil.

## QA y evidencia

- Agente A y revisor B usaron Ego Lite con consultas frescas de `profiles()`: `Fragments-Estudiante` está asociado a `Profile 5 — Persona 1`. Cada ronda tuvo TaskSpace propio y cerrado. Los datos fueron fixture sintético local; no se accedió a datos académicos reales, backend, OAuth, AI Gateway ni producción.
- Dictamen independiente B: **CONFORME**. Confirmó los seis pasos, navegación y `aria-current`, selector móvil con teclado, foco visible de 3 px, `prefers-reduced-motion`, ausencia de overflow y el logo/favicon A-003 (HTTP 200).
- Capturas: `captures/` contiene 15 PNG Ego Lite. Incluye Idea desktop/móvil, capturas de las seis etapas de desktop y reflow a 320/768/1024 px.
- `pnpm --filter @fragments/web test`: PASS, 26 archivos y 119 pruebas.
- `pnpm exec turbo typecheck --force`: PASS, 4/4 tareas en commit inicial; 5/5 tras integrar `main` vigente.
- `pnpm exec turbo lint --force`: PASS, 1/1 tarea configurada (solo contracts).
- `pnpm exec turbo build --force`: PASS, 3/3 tareas en commit inicial; 4/4 tras integrar `main` vigente. Quedan advertencias no bloqueantes de `use client` en `lucide-react`.
- `git diff --check`: PASS. SHA-256 de `icon.svg` y el asset A-003: `975C1248EE0A747E89E0CE74027060EE956AF699F60F834946699EE67D4539E6`.

## Integración

- Base inicial: `3bff674bad063ecf72893a9f469e1485373c5e07`. Antes de publicar se actualizó mediante merge normal a `origin/main` `c1ef6f5b9cf01ebde259d019db2f3fdb6c519499` (merge `7771380`), que ya contiene F21. Sin conflictos y sin cambios propios en archivos F21.
- Commit de implementación/evidencia: `7f164ea`.
- F21 permaneció intacta en su worktree independiente.
- PR: pendiente de creación/publicación de `codex/f17-mentor-polish`; el `AGENTS.md` vigente autoriza push normal y PR a `main`. No se hizo merge ni despliegue.
- Producción: no modificada. El PR deberá pasar los checks y protecciones para integrarse. Cualquier despliegue F14 queda sujeto a la aprobación humana protegida; no se creó tag ni se solicitó ese gate.

## Archivos

Esta carpeta contiene 19 archivos en total: cuatro Markdown y 15 PNG. No se generó ZIP.
