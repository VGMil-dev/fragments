# Evidencia F17.10 — Dashboard Pixel Night

## Implementación local

- Worktree: `C:\Users\vgmil\.codex\worktrees\pixel-night-review\Fragments`; rama `codex/pixel-night-game-experience`.
- Commit de código: `9ec09052586b579f44da5f00c97bbd590c356629`.
- Cambios: el login enlaza al `profileUrl` real cuando está disponible; el fallback conserva el texto.

## Verificación reportada por el implementador

- Suite focal conjunta Mentor/Trainer/Dashboard: **42/42 PASS**.
- `pnpm --filter @fragments/web typecheck`: **PASS**.
- `pnpm --filter @fragments/web build`: **PASS**, con avisos de bundle >500 kB y directivas `use client` de Lucide.
- `git diff --check`: **PASS**.
- Revisión reflexiva independiente de `9ec0905`: **PASS**, sin defectos concretos.

## Pendiente

- Repetir verificación desde HEAD integrado y CI.
- Ego Lite posterior a release en Dashboard real.
- Revisión visual propietaria; no se encontró mockup canónico verificado para esta candidata.
- Zoom 200 %, lector de pantalla y contraste formal: **NO COMPROBADOS**.
- PR #190, release F14 y estado productivo: **COMPLETADOS** según la sección de verificación posterior a release.

## Release y Ego Lite — 2026-11-23

- PR #190 integrada por merge normal como `e184280f992f9b4a90603fbc4dd79c856ddf38a2`; CI `45193340720` SUCCESS. El código funcional es `9ec0905`; las fichas están en `c85e940`.
- Tag anotada `v0.5.42`, objeto `5eed3047f8c91ee2c1ee4a913726996ea7fe260b`, apunta exactamente a `e184280`. F14 run `45193941563` SUCCESS.
- Producción: `/health` HTTP 200 (`ok`, `database=ready`); `/assets/index-yKTmZzCk.js` contiene v0.5.42 y el SHA del merge.
- Ego Lite, `/student/dashboard`: perfil real se presentó como enlace GitHub (href del dominio `github.com`); no se imprimió ni exportó el login. En 320/390/768/1024/1440 CSS px no hubo overflow horizontal.
- Foco de teclado de 3 px lime y preferencia de movimiento reducido se probaron en la navegación existente de Mentor. Captura Dashboard quedó local únicamente por mostrar identidad/datos académicos.
- Ficha de pantalla sigue como candidata hasta aprobación visual del propietario. Contraste formal, zoom 200 % y lector de pantalla **NO COMPROBADOS**.
- No se escribieron datos académicos ni se alteró la sesión.

- Notion F16, F17 y F10 actualizado con merge/release, QA observada y límites NO COMPROBADOS.
