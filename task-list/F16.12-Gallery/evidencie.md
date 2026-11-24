# Evidencia F16.12

Estado: implementación integrada y `v0.5.53` aplicada mediante F14; QA visual autenticada en Ego Lite pendiente.

- Rama/worktree: `codex/f16.12-gallery`, `C:\Users\vgmil\.codex\worktrees\f16-gallery-pixel-night\Fragments`.
- Base: `b5d30af7c01fef8948180caca31dd40f4d769fa1`.
- Alcance de producto modificado: solo `apps/web/src/features/gallery/`. El planner actualizó `TASKS.md` y los artefactos propios F16.12; no se alteraron contratos ni rutas compartidas.
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

## Integración completada

- Commit inicial de implementación: `9823b60d81c1a0ef604dca0ed6f8c1128de20b40` (`feat(gallery): mejora galeria Pixel Night`).
- Corrección de contraste hover: `d25aea30d6a4c1626e0b7e766b341cab849542d8` (`fix(gallery): corrige contraste hover`). El estado hover usa fondo cobalt y texto claro; una prueba calcula el contraste a partir de los tokens referenciados por la regla y exige WCAG AA (4.5:1).
- Verificación fresca tras la corrección: `pnpm --filter @fragments/web exec vitest run src/features/gallery/gallery-screen.test.tsx` — `Test Files 1 passed (1)`, `Tests 7 passed (7)`; `pnpm --filter @fragments/web typecheck` — `tsc -p tsconfig.json`, terminado correctamente; `git diff --check` — terminado correctamente con el aviso Git CRLF→LF de `gallery-screen.css`.
- El planner añadió a `TASKS.md` la fila F16.12 y creó este `intent.md`/`spec.md` sin tocar ownership UI ni archivos compartidos de producto.
- PR #224 se integró por merge normal en `main` como `90873bfc5d4d0d2061f693e86febb650606181c2`; el commit documental del planner es `b8e70d299fc80add239c8575ab554b1d5bbb204b`.

## Revisión independiente y CI

- Revisión reflexiva independiente: detectó P2 en el contraste del hover (≈1.06:1). Se corrigió a `--f16-cobalt` / `--f16-text-primary`; cálculo WCAG contrastado de nuevo: **5.98:1** (≥4.5:1 AA). Sin regresiones adicionales encontradas.
- Test nuevo calcula contraste desde los tokens usados por la regla hover; exige WCAG AA.
- Vitest focal posterior al fix: 7/7 PASS; typecheck web y `git diff --check` PASS.
- CI del head `d498d365fdcca84231ee03ad1e0488d621990076`: run `45293938276`, job `verify` SUCCESS (incluye test/typecheck/lint/build y validación del workflow).
- La verificación CI `45293938276` corresponde al head de código `d498d36` y fue SUCCESS; la verificación final del PR con artefactos documentales en el head `b8e70d2`, run `45294348657`, también fue SUCCESS.

## F14 y producción

- Tag anotada `v0.5.53` apunta al merge #224 `90873bfc5d4d0d2061f693e86febb650606181c2`.
- F14 run `45294837360` terminó SUCCESS en verify-build, atestación Sigstore y publicación del paquete para el agente pull. Verificó test/typecheck/lint/build exactos, backup/restore, rollback, metadatos y build ARM64. No hubo deploy manual.
- Producción pública: `https://fragments.gavanti.org/health` HTTP 200, status `ok`, database `ready`; asset `/assets/index-S15JAbH-.js` contiene versión `v0.5.53` y SHA exacto `90873bfc5d4d0d2061f693e86febb650606181c2`.
- `fragments-production` se consultó read-only: solo regla `branch_policy`; no `Required reviewers` humano. No se cambió configuración.

## Ego Lite visual

- NO COMPROBADO: el TaskSpace estudiantil previo `46` no apareció en `listTaskSpaces()`; estaban `Fragments-Docente` y el espacio SSH. No se creó otro espacio ni se cerró/alteró sesión existente.
- Captura de Galería, QA visual autenticada, zoom 200 %, contraste formal integral y lector de pantalla quedan pendientes. La prueba focal sí calcula 5.98:1 para el CTA hover y exige WCAG AA, pero no sustituye la medición visual integral.
- F16.12 permanece `[ ]` hasta completar QA con la sesión estudiantil autorizada; F16 continúa En validación.
