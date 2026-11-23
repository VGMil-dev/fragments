# Evidencia F17.8 — Review Pixel Night

## Código y revisión

- Worktree: `C:\Users\vgmil\.codex\worktrees\pixel-night-review\Fragments`; rama `codex/pixel-night-review`, basada en `origin/main`.
- Commit de pantalla: `d4720c8e08bc103106f4f6648ef481b8dedeadaf`.
- Corrección semántica: `f80f4668bf2e32eb3baf2e9f6e25295674d061a8`.
- Revisión reflexiva independiente: PASS. Confirmó `verified` en éxito, `not_verified` neutral y `failed` en advertencia, sin ejecutar pruebas ni navegador.

## Verificación de código

- `pnpm --filter @fragments/web exec vitest run src/features/review/review-screen.test.tsx` — **10/10 PASS**.
- `pnpm --filter @fragments/web typecheck` — **PASS** tras corregir el fixture para usar el enum contractual `failed`.
- `pnpm --filter @fragments/web build` — **PASS**; quedan avisos preexistentes de chunk >500 kB y directivas `use client` de Lucide.
- `git diff --check` — **PASS**.

## Estado de integración y QA

- PR [#188](https://github.com/VGMil-dev/fragments/pull/188) integrada por merge normal como `82e36a1c0950414b00b73f3048d5b8d943b4e83c`; CI run `45183480021` **PASS**.
- Tag anotada `v0.5.41`, objeto `67bdd10db132b9271ffb6211459ba34a86fdd6d5`, apunta al merge exacto.
- F14 run `45184019050` **SUCCESS** (`verify-build`, `attest-package`, `publish-approved-release`).
- Producción verificada: `/health` HTTP 200, `ok`, `database=ready`; bundle `/assets/index-DLIIdatJ.js` contiene `v0.5.41` y `82e36a1`.
- Ego Lite autenticado, `/student/review`: viewport emulados 320/390/768/1024/1440 sin overflow horizontal; pantalla de formulario vacía cargó con estado final, sin someter formulario ni ejecutar evaluación. Teclado: foco visible sólido de 3 px, token lima `#D4FF24`; `prefers-reduced-motion: reduce` activo.
- Capturas Ego Lite PNG auténticas locales: `C:\Users\vgmil\ego\pixel-night-review-v041-1440.png` SHA-256 `63CBBEA02DC096D34237B090E0CFB6199401495DC9ED88FBC45ED1C34F662E55`; `C:\Users\vgmil\ego\pixel-night-review-v041-390.png` SHA-256 `AF784287E0BC112117724F776FD5D0C711C8E32E3BC6F0827A67DB64A030CE08`. Se conservan localmente por ser capturas autenticadas.
- El exit code final de `fragments-release-apply.service` queda **NO COMPROBADO** por la limitación de lectura del socket Docker. La aplicación del release sí queda verificada por la versión pública exacta y la pantalla autenticada.
- PR, CI, F14, producción pública y QA Ego Lite post-release: **COMPLETADOS**.
- UX-12 carece de maqueta canónica verificable; el candidato visual requiere revisión propietaria.
- Zoom real al 200 %, contraste formal y lector de pantalla: **NO COMPROBADOS**.
- No se iniciaron evaluaciones IA ni se realizaron escrituras académicas.
