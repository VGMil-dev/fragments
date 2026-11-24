# Evidencia F16.12

Estado: implementación publicada en PR #224; integración central y QA visual de producción pendientes.

- Rama/worktree: `codex/f16.12-gallery`, `C:\Users\vgmil\.codex\worktrees\f16-gallery-pixel-night\Fragments`.
- Base: `b5d30af7c01fef8948180caca31dd40f4d769fa1`.
- Alcance modificado: solo `apps/web/src/features/gallery/` y esta evidencia. Se preservaron los cambios preexistentes ajenos en `task-list/TASKS.md`.
- Skill leída: `vercel-react-best-practices` (`C:\Users\vgmil\.agents\skills\vercel-react-best-practices\SKILL.md`). Aplicado de forma selectiva: sin nuevas dependencias, memoización ni cambios de datos; se mejoraron semántica y jerarquía visual.
- UI: aviso visible de publicación automática y no retirada por estudiantes; detalles complementarios plegables con privacidad completa; superficies Pixel Night, acción primaria clara y jerarquía de ficha/detalle.
- Privacidad/contratos: sin cambios de API, autorización, publicación, DTO o handlers; no se muestra puntaje ni comentario privado; no se añadieron datos ficticios.

## Verificación fresca

- `pnpm --filter @fragments/contracts build` — `tsc -p tsconfig.json`, terminado correctamente.
- `pnpm --filter @fragments/web exec vitest run src/features/gallery/gallery-screen.test.tsx` — `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
- `pnpm --filter @fragments/web typecheck` — `tsc -p tsconfig.json`, terminado correctamente.
- `pnpm --filter @fragments/web build` — Vite terminó correctamente (`✓ built in 517ms`). Emitió advertencias preexistentes del bundle >500 kB y de directivas `use client` de `lucide-react`.
- `git diff --check` — terminó correctamente; aviso Git de conversión CRLF→LF para `gallery-screen.css`.
- QA visual Ego Lite: pendiente, tal como indica el gate de F16.12 (después de un release F14 legítimo). No se ejecutó navegador ni servicio real.

## Pendiente de integración

- Commit inicial de implementación: `9823b60d81c1a0ef604dca0ed6f8c1128de20b40` (`feat(gallery): mejora galeria Pixel Night`).
- Corrección de contraste hover: `d25aea30d6a4c1626e0b7e766b341cab849542d8` (`fix(gallery): corrige contraste hover`). El estado hover usa fondo cobalt y texto claro; una prueba calcula el contraste a partir de los tokens referenciados por la regla y exige WCAG AA (4.5:1).
- Verificación fresca tras la corrección: `pnpm --filter @fragments/web exec vitest run src/features/gallery/gallery-screen.test.tsx` — `Test Files 1 passed (1)`, `Tests 7 passed (7)`; `pnpm --filter @fragments/web typecheck` — `tsc -p tsconfig.json`, terminado correctamente; `git diff --check` — terminado correctamente con el aviso Git CRLF→LF de `gallery-screen.css`.
- `task-list/TASKS.md` no se editó por límite explícito de ownership; la actualización central corresponde al planner.
- PR #224: abierto contra `main`; rama publicada `codex/f16.12-gallery`; sin merge.
