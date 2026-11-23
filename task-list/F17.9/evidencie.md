# Evidencia F17.9 — Mentor Pixel Night

## Implementación local

- Worktree: `C:\Users\vgmil\.codex\worktrees\pixel-night-review\Fragments`; rama `codex/pixel-night-game-experience`.
- Commit de código: `9ec09052586b579f44da5f00c97bbd590c356629`.
- Cambios: Contexto primero; alineación de etapas, contenido, resumen y accesos; eliminado el segundo título; etiqueta del progreso aclara campos válidos.

## Verificación reportada por el implementador

- Suite focal conjunta Mentor/Trainer/Dashboard: **42/42 PASS**.
- `pnpm --filter @fragments/web typecheck`: **PASS**.
- `pnpm --filter @fragments/web build`: **PASS**, con avisos de bundle >500 kB y directivas `use client` de Lucide.
- `git diff --check`: **PASS**.
- Revisión reflexiva independiente de `9ec0905`: **PASS**, sin defectos concretos.

## Límites pendientes tras PR #193

- Revisión visual propietaria; no se encontró mockup canónico verificado para esta candidata.
- Zoom 200 %, lector de pantalla y contraste formal: **NO COMPROBADOS**.
- Guardado/recuperación y evaluación real de Mentor no se ejecutaron en la validación nocturna.

## Continuidad Pixel Night v0.5.43 — 2026-11-23

- Decisión vigente F16/F17: Mentor inicia en **Idea**, no Contexto. PR #193 ajustó el orden de etapas, contenido y acciones; el Dashboard selecciona el borrador con `updatedAt` más reciente sin mutar la lista.
- PR #193 merge normal en `adfb658fffca57d9426f6fc35a27734154926603`; CI `45207476721` SUCCESS. F14 tag anotada `v0.5.43`; run `45208001374` SUCCESS. Producción health HTTP 200/ready y bundle con versión y SHA del merge comprobados.
- Ego Lite autenticado reutilizó TaskSpace 46, sin cerrar pestañas existentes. Mentor, Trainer y Dashboard cargaron en producción; 320/390/768/1024/1440 CSS px sin overflow horizontal. Mentor presentó Idea como etapa actual y las seis etapas aprobadas; el guardado y la evaluación no se probaron.
- Capturas Ego Lite auténticas retenidas fuera del repo por datos de sesión, rutas y SHA-256:
  - `C:\Users\vgmil\ego\pixel-night-v0543\CAP-MENTOR-IDEA-1440.png` — `CA2745D30C277A8D993F84709A05CE41B22874981F11627394532B772C1B38D4`
  - `C:\Users\vgmil\ego\pixel-night-v0543\CAP-TRAINER-1440.png` — `ABF36D11D5216D3DD58CCA48FE2E652D7C28648B204BE9E87E309EFE2EFBE467`
  - `C:\Users\vgmil\ego\pixel-night-v0543\CAP-DASHBOARD-1440.png` — `5EECCB711B6A1CB55952DA2C687208B70482B15F6846E6BFC8767F41C4DFAD10`
  - `C:\Users\vgmil\ego\pixel-night-v0543\CAP-MENTOR-IDEA-390-CLEAN.png` — `C4793BE671348ECBE202533FFC11E25CCAACC29583CECCB680E45ECEFA20B21A`
  - `C:\Users\vgmil\ego\pixel-night-v0543\CAP-TRAINER-390-CLEAN.png` — `4277BF27E331489BAF91D0548565A214F24087DFCF3C33A38A8DA60790A48589`
  - `C:\Users\vgmil\ego\pixel-night-v0543\CAP-DASHBOARD-390-CLEAN.png` — `59F724F0FEC116F9BEFCE5F6665E4C68E64660A87F7CD4D11E77089215F46EE8`
- Las capturas móviles iniciales conservaron el foco del enlace de salto por la prueba de teclado; se repitieron con foco y scroll reiniciados. El estado de foco inicial no era un defecto de layout.
- Capturas contienen identidad/datos QA y permanecen locales. Vistas siguen candidatas pendientes de revisión propietaria. Zoom 200 %, contraste formal y lector de pantalla **NO COMPROBADOS**.

## Release y Ego Lite — 2026-11-23

- PR #190 integrada por merge normal como `e184280f992f9b4a90603fbc4dd79c856ddf38a2`; CI `45193340720` SUCCESS. El código funcional es `9ec0905`; las fichas y reconciliación F17 están en `c85e940`.
- Tag anotada `v0.5.42`, objeto `5eed3047f8c91ee2c1ee4a913726996ea7fe260b`, apunta exactamente a `e184280`. F14 run `45193941563` SUCCESS en verify-build, atestación y publicación.
- Producción: `/health` HTTP 200 (`ok`, `database=ready`); el bundle `/assets/index-yKTmZzCk.js` contiene `v0.5.42` y el SHA `e184280f992f9b4a90603fbc4dd79c856ddf38a2`.
- Ego Lite, sesión estudiantil ya abierta, `/student/mentor`: después de recargar mostró Contexto como etapa 1, seis etapas, contexto académico cargado, sin el segundo encabezado “Tu propuesta”. Sin guardar borrador ni iniciar evaluación.
- En 320/390/768/1024/1440 CSS px: sin overflow horizontal. Foco por teclado observado con outline sólido de 3 px `#D4FF24`. `prefers-reduced-motion` se emuló y `matchMedia` devolvió true; la supresión visual de animaciones no se inspeccionó.
- Capturas de inspección quedaron solo en `C:\Users\vgmil\ego\pixel-night-game-experience`; muestran sesión y datos académicos y no se subieron al repo/Notion.
- Ficha de pantalla sigue como candidata hasta aprobación visual del propietario. Contraste formal, zoom 200 % y lector de pantalla **NO COMPROBADOS**.
- No se escribieron datos académicos, no se ejecutó IA ni se alteró la sesión.

## F17.9 — estado honesto de Idea · 2026-11-23

- Hallazgo: el stepper validaba todos los campos de Idea con máximo 3000, aunque el formulario exige título ≤160 y propósito ≤1000. En valores existentes fuera de esos límites aparecía «Completada» cuando el formulario los consideraba inválidos.
- Corrección: `completedStage(0)` usa ahora los mismos límites por campo. No cambia guardado, avance, persistencia, rutas, contratos ni API.
- Commit `cfef9a65e522039060f5ed19d534652b84ad432a` (`fix(mentor): alinear estado de Idea con sus límites`), rama `codex/pixel-night-mentor-redesign` sobre `d5d25527b67e9c4a3ed799154f76c187e351ece5`.
- TDD: dos regresiones por título 161 y propósito 1001; antes del fix ambas mostraban el estado incorrecto. Verificación fresca del commit: `pnpm --filter @fragments/web exec vitest run src/features/mentor/mentor-screen.test.tsx --maxWorkers=1` — 34/34 PASS; `pnpm --filter @fragments/web typecheck` PASS; `git diff --check origin/main...HEAD` PASS. Revisión reflexiva independiente PASS.
- PR, CI, revisión visual Ego Lite y F14 para este cambio: pendientes. La vista sigue candidata y no se declara validada visualmente.

- Notion F16, F17 y F10 actualizado con merge/release, QA observada y límites NO COMPROBADOS.
