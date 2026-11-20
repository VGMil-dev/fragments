# F17.1 — Evidencia de pulido visual Mentor

**Estado:** CONFORME localmente. Revisión visual independiente aprobada; verificaciones finales frescas y SHA de implementación registrados.

**Commit de implementación y evidencia:** `7f164ea` (`feat(mentor): pule la experiencia visual de Mentor`). La rama no se publicó.

## Preparación
- `origin/main` se actualizó con `git fetch origin main`; base observada: `3bff674bad063ecf72893a9f469e1485373c5e07` (20-11-2026).
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
- F21 está activa en un worktree separado; la integración debe revalidarse contra `main` vigente antes de cualquier PR/deploy.
- No se creó PR, no se hizo push ni se desplegó. `AGENTS.md` del repositorio prohíbe publicar/pushear; se entrega rama y commit local para integrar cuando esa restricción cambie. La aprobación protegida de producción no se solicitó ni se eludió.
- Notion: se añadió actualización en la ficha F17 con resultado QA local y en A-004 como nota de cambio local pendiente de integración; no se cambió el estado canónico del asset en `main`.
- La captura del propietario es la referencia compositiva para la etapa Idea; los flujos de las otras etapas siguen las fichas canónicas funcionales de Notion.
