# F17.1 — Evidencia de pulido visual Mentor

**Estado:** IMPLEMENTADA EN `main`. PR #65 integrado con checks verdes; producción no desplegada por preflight F21 pendiente.

**Commits:** `7f164ea` implementación/evidencia; `84c2d8f` cierre documental; `7771380` sync normal con `main`; `adb7f73` informe previo al PR; merge PR #65 `88f2040eaf83737f1c4beb84470bf167fcd24a79`.

## Preparación
- `origin/main` se actualizó con `git fetch origin main`; base observada: `3bff674bad063ecf72893a9f469e1485373c5e07` (20-11-2026).
- Antes de abrir el PR se volvió a consultar `origin/main` (`c1ef6f5b9cf01ebde259d019db2f3fdb6c519499`), que incluye F21 ya integrada. `codex/f17-mentor-polish` se actualizó mediante merge normal `7771380`; no hubo conflictos. El worktree F21 permaneció limpio. El diff de archivos propio de F17.1 contra `origin/main` incluye solo Mentor, favicon, ficha de tarea y evidencia.
- Worktree independiente: `C:\Users\vgmil\.codex\worktrees\f17-mentor-polish\Fragments`; rama `codex/f17-mentor-polish`.
- Worktree F21 preexistente `C:\Users\vgmil\.codex\worktrees\f21-postgres-prisma\Fragments` inspeccionado en inventario y dejado intacto.
- Captura visual del propietario leída. Notion consultado: proyecto Fragments, sistema visual, F17, A-003 y fichas UX-05 a UX-10.
- `ego-browser` v2.2.1 leído y `ego-browser skill` ejecutado.
- Perfil de estudiante: cada ronda consultó `profiles()` de nuevo y confirmó `Fragments-Estudiante` → `Profile 5 — Persona 1`. A y B usaron TaskSpaces independientes (IDs 11, 12, 13 y 14) creados con el `profileId` recién consultado. Los cuatro espacios se cerraron al terminar; no se usó el perfil docente.

## Implementación y verificación de Agente A
- Mentor presenta la cabecera contextual, progreso calculado desde campos obligatorios reales, navegación vertical compacta y seis etapas funcionales. La etapa Idea ordena sus campos según la referencia; acciones Word son secundarias después del formulario. «Objetivos y alcance» es el nombre exacto de la cuarta etapa.
- El aviso completo de publicación automática se trasladó a Evaluación, junto a la acción de evaluar; se conserva la audiencia, datos compartidos/excluidos, ausencia de opt-out/retiro estudiantil, regla por versión y retiro docente con auditoría.
- `apps/web/public/icon.svg` coincide byte a byte con A-003; SHA-256 de ambos archivos: `975C1248EE0A747E89E0CE74027060EE956AF699F60F834946699EE67D4539E6`. `apps/web/index.html` referencia `/icon.svg?v=f17-mentor-polish` para evitar la versión en caché.
- App usada por Agente A: Vite local `127.0.0.1:5173`, con stub de fetch temporal y fixture `fixture-f17.1` solo para `GET /api/me` y `GET /api/me/proposals`; no usó `.env`, backend, OAuth, AI Gateway, producción ni datos académicos reales. El proceso de Vite propio fue detenido al cerrar el TaskSpace.
- Ajuste tras primera revisión: el encabezado se separa en filas a 320 px, conserva visible «Cerrar sesión» y evita el solapamiento de la cuenta; el shell global cambia a navegación móvil hasta 900 px. A 768 px el formulario ocupa 467 px y Mentor mantiene su selector de etapas accesible.
- Reflow final de Agente A y comprobación independiente B: sin desbordamiento horizontal en 320, 390, 768, 1024 y 1440 px. Anchuras A `320/320`, `390/390`, `753/753`, `1009/1009`, `1425/1425` (clientWidth/scrollWidth; scrollbar explica diferencia respecto al viewport). Formulario B: 768 px = 467 px, 1024 px = 487 px.

### Comandos y resultados de Agente A
- `pnpm --filter @fragments/contracts build` — PASS.
- Primer `pnpm --filter @fragments/web test` — 61 pruebas ejecutadas; 10 suites fallaron al no estar compilado `@fragments/contracts` en el worktree limpio. Causa resuelta compilando contratos.
- Segundo `pnpm --filter @fragments/web test` — PASS, 26 archivos y 119 pruebas.
- `pnpm exec turbo typecheck --force` — PASS, 4/4 tareas.
- `pnpm exec turbo build --force` — PASS, 3/3 paquetes; conserva advertencias no bloqueantes de `use client` provenientes de `lucide-react`.
- `pnpm exec turbo lint --force` — PASS; la configuración actual ejecuta lint solo en contracts (1 tarea).
- `git diff --check` — PASS.
- `icon.svg` y el archivo canónico A-003 devuelven SHA-256 idéntico; la referencia HTML incluye query de invalidación de caché.
- Verificación final repetida tras la revisión B: `pnpm --filter @fragments/web test` — PASS, 26 archivos / 119 pruebas.
- Verificación final: `pnpm exec turbo typecheck --force` — PASS, 4/4 tareas.
- Verificación final: `pnpm exec turbo lint --force` — PASS, 1/1 tarea configurada (solo contracts).
- Verificación final: `pnpm exec turbo build --force` — PASS, 3/3 tareas. Se mantienen advertencias upstream no bloqueantes de directivas `use client` en `lucide-react`.
- Verificación final `git diff --check` — PASS.
- Tras el merge de `origin/main` vigente: `pnpm --filter @fragments/web test` — PASS, 26 archivos / 119 pruebas.
- Tras el merge: `pnpm exec turbo typecheck --force` — PASS, 5/5 tareas (incluye Prisma generate y typecheck API).
- Tras el merge: `pnpm exec turbo lint --force` — PASS, 1/1 tarea configurada.
- Tras el merge: `pnpm exec turbo build --force` — PASS, 4/4 tareas; advertencias no bloqueantes `use client` de `lucide-react`.
- Tras el merge: `git diff --check` — PASS.

### Capturas de Agente A
- `task-list/F17.1/captures/mentor-01-idea-desktop-1440x900.png`
- `task-list/F17.1/captures/mentor-idea-mobile-390x844.png`
- `task-list/F17.1/captures/mentor-idea-reflow-320x844.png`, `mentor-idea-reflow-768x900.png`, `mentor-idea-reflow-1024x900.png`.

## Revisión independiente de Agente B
**CONFORME.** Agente B comparó la Idea escritorio 1440×900 y móvil 390×844 con la imagen aprobada, revisó los reflows 320/768/1024, navegó las seis etapas y examinó marca, favicon, teclado, foco y movimiento reducido. En la primera ronda señaló el solapamiento del encabezado a 320 px y el ancho insuficiente del formulario a 768 px. Ambos se corrigieron; la segunda revisión independiente confirmó que ya no ocurren.
- Capturas de la revisión: Idea y las seis etapas en `reviewer-*-desktop-1440x900.png`, Idea móvil en `reviewer-idea-mobile-390x844.png` y reflow en `reviewer-idea-reflow-{320,768,1024}x900.png` (320 tiene altura 844 en el nombre real).
- Perfil fresco: `Fragments-Estudiante` → Profile 5 / Persona 1; TaskSpace 14 cerrado con `finish({keep:[]})`; servidor local del revisor detenido.
- Navegación de las seis etapas y `aria-current` correctos; en móvil ArrowDown pasa de Idea a Contexto; foco visible de 3 px; movimiento reducido efectivo (`transition: 0.00001s`).
- Cabecera y favicon sirven A-003 exacto en lima `#D4FF24`; ambos recursos responden 200 y el favicon usa `/icon.svg?v=f17-mentor-polish`.

## Evidencia y capturas
Las capturas Ego Lite reales y `INFORME_FINAL.md` se conservan en esta carpeta. Total: 19 archivos (15 PNG y 4 documentos), bajo el máximo de 20. No se creó ZIP.

## Riesgos / límites
- F21 ya está integrada en `main`. No desplegar el bundle hasta completar el preflight F21 de producción: el VPS aún requiere actualización F14/Compose, corte PostgreSQL/backup, QA y aprobación protegida.
- PR #65: [feat(mentor): pulido visual responsive de Mentor](https://github.com/VGMil-dev/fragments/pull/65), integrado por merge normal el 20-11-2026. Check `Fragments CI` run `44840604739` pasó (job `verify`; Compose, migración PostgreSQL efímera, backup/restore, release-agent, tests/typecheck/lint/build).
- PR documental #66: check `verify` run `44841253487` y reintento de job `136651767925` terminaron en success. GitHub rechazó dos intentos de merge normal con `Required status check "verify" is expected`, aunque el ruleset activo requiere ese contexto del mismo GitHub Actions (integration `15368`). PR sigue abierto; no se eludió la protección.
- `main` quedó en `88f2040eaf83737f1c4beb84470bf167fcd24a79`; la rama `codex/f17-mentor-polish` se conservó y su árbol de trabajo quedó limpio al cierre.
- No se creó tag ni se desplegó. F21 está integrada en código, pero sus evidencias indican que el VPS conserva Compose/agente F14 y timer SQLite anteriores; falta el preflight de F21 y su aprobación protegida. No modificar producción hasta completar esa preparación.
- Notion: ficha F17 actualizada con PR/merge, QA y límite de despliegue; A-004 indica que el registro es histórico y que el nuevo icono aún no se ha desplegado.
- La captura del propietario es la referencia compositiva para la etapa Idea; los flujos de las otras etapas siguen las fichas canónicas funcionales de Notion.
