# F16 — Evidencia y estado

**Estado:** En progreso. No está aprobada para merge ni se declara completa.

## Git/worktree

- Checkout original en `D:\Dev\Trabajo\Fragments`: rama `codex/v0.3.0-trainer`, seis commits detrás al inicio y con `Fragments_Mentor_Plantilla_Propuesta.docx` sin seguimiento. No se modificó ni stageó ese archivo.
- Worktree `main` preexistente: `C:\Users\vgmil\.codex\worktrees\v030-main\Fragments`, limpio; `git fetch origin main` seguido de `git merge --ff-only origin/main` avanzó desde `50740fcd` a `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`.
- Worktree F16 nuevo: `C:\Users\vgmil\.codex\worktrees\f16-experience-redesign\Fragments`; rama `feature/f16-experience-redesign`, HEAD de partida `60e31bfb4781693b2310b7cd22cfc45e9aa1cdd2`, alineado con `origin/main` al crear.
- Sin reset, force-pull, push, merge o deploy.

## Master kit

- ZIP original permanece en `C:\Users\vgmil\Downloads\F16-FRAGMENTS-REDESIGN-MASTER-KIT.zip` (6,475,971 bytes); extracción intacta en `task-list/F16/resources/master-kit/`.
- README, hojas `Resumen`, `Pantallas`, `Componentes`, `Tokens`, `Layouts`, `Iconos`, `Assets`, `Quality Gates`, `Fuentes`, JSON, contratos, tokens y manifiestos leídos.
- Matriz y código actual concuerdan en 11 rutas y 6 estados internos; 3 conceptos no son rutas. `App.tsx` actual consultado en el HEAD F16.
- Kit describe 28 PNG/WebP; 16 iconos tienen estado `CANDIDATE`. `Goggle_Kid_Walk.webp`: 8 frames/animado. `Typing_Girl_and_Sleeping_Cat.webp`: 1 frame/estático. SHA-256 del WebP fuente/copia coincide: `CDDAD20E376968B1C6B346392A03739C5CAA230095B36943BDDA2EF8B52174A5`; PNG fuente/copia coincide: `0AF55AA4F74789D842BF330FDBDEFF691B885DCB332BDDA18AA2E01ED7170E4B`.
- 2026-11-14: el propietario autorizó explícitamente sustituir el sistema visual previo y actualizar `docs/DESIGN_TOKENS.md`/docs relacionadas. Night/Cobalt/Lime gobierna las once vistas; la paleta crema queda deprecada como guía F16.

## Baseline frontend (HEAD antes de cambios F16)

Comandos ejecutados en worktree F16, `pnpm@11.25.0`:

1. `pnpm --filter @fragments/web test`: primero falló con 8 suites porque el paquete workspace `@fragments/contracts` no estaba construido; 12 suites/43 tests pasaron.
2. `pnpm --filter @fragments/contracts build`: PASS.
3. `pnpm --filter @fragments/web test`: **20 files, 85 tests passed**.
4. `pnpm --filter @fragments/web typecheck`: PASS.
5. `pnpm --filter @fragments/web build`: PASS, Vite 8.3.5; warning existente de chunks >500 kB (`mammoth.browser` ~492 kB y JS ~525 kB sin gzip).

## EGM / modelos

- Fuente oficial actual de Codex leída: plugin marketplace + plugin `egm@egm`; documentación: [Codex integration](https://github.com/google/elephant-goldfish-model/blob/main/docs/codex.md).
- Instalación inicial con checkout incompleto por `--sparse .agents/plugins` reemplazada. Instalación actual completa en `C:\Users\vgmil\.codex\plugins\cache\egm\egm\0.1.1` con los siete workflows solicitados y directorios de personas/estándares.
- El skill del plugin indica que plugins nuevos requieren sesión nueva para invocación nativa. Las herramientas disponibles sí permiten subagentes `fork_turns: "none"` con modelo elegido; Goldfish reales no se reportarán hasta recibir sus resultados.
- Modelo principal: el harness no expone selector verificable para cambiarlo a GPT-6 Luna Medio; no atribuir el modelo pedido al Elephant sin evidencia. Subagentes se configurarán explícitamente en Luna Medio.
- Brainstorm: dos rondas Goldfish de contexto nuevo cubrieron siete lentes; registro `egm-reviews/brainstorm_rounds_1-2.md`.
- Revisión de borrador: Ronda 1 Design Critic/Structural/Readiness detectó alternativas, gate Review/Trainer, 320px, riesgos, allowlist, checkpoints y QA. Ronda 2 confirmó alternativas, Review/Trainer, 320px, paleta y mitigaciones; Structural dejó un Minor sobre aprobación de routing; Readiness mantuvo Major de alcance/checkpoints/evidencia. Luego el Elephant actualizó design/spec/QA; **esos cambios posteriores no tienen re-chequeo Goldfish y readiness no se declara aprobada**. Máximo ordinario de dos rondas usado.
- Revisiones EGM de drift de implementación: ronda 1 encontró cuatro discrepancias (navegación móvil oculta, altura fija de header a 641–760 px, mención histórica a sidebar en tokens y skill fuera de allowlist); el Elephant las resolvió. Ronda 2 Goldfish, GPT-6 Luna Medio/contexto independiente: **No drift detected** sobre esos puntos, autoridad visual, rutas/gates y reduced motion. Informe `egm-reviews/implementation_drift_round1.md` y resultado de ronda 2 en esta evidencia.
- Límite separado: el hito EGM de diseño consumió sus dos rondas. Persisten sin nueva validación Goldfish el Major de readiness (allowlist/gates/evidencia reproducible) y el Minor de autoridad de routing de `design_draft_rounds_1-2.md`; el Elephant actualizó esas secciones después de la ronda 2, pero no se proclama readiness aprobada. No iniciar una tercera ronda ordinaria.

## Contraste WCAG preliminar

Contrastes WCAG calculados con luminancia sRGB (2 decimales): texto principal/superficies 15.80–19.10:1; texto principal sobre Cobalt 5.98:1; Lime en superficies oscuras 14.65–17.70:1; muted sobre Cobalt 3.31:1 (no cumple para texto normal y no debe usarse ahí). Estados info/éxito/warning/error sobre fondos oscuros 6.65:1 o más. Bordes y controles aún requieren verificación no textual y visual.

## Capturas, flujos y commit

- Baseline Ego Lite antes de cambios visuales: 33 capturas (11 rutas × 1440/768/390 px) en `screenshots/baseline/`. Las páginas que esperan backend reflejan error/carga por API local ausente, no funcionalidad probada; login/callback muestran estado sin sesión. Evidencia docente con campos vacíos.
- Capturas de implementación Ego Lite: 55 imágenes (11 rutas × 1440/1024/768/390/320 px) en `screenshots/current/`; `home-reduced-motion.png` comprueba la fuente PNG. Las rutas API-dependent se capturan en su estado local de error/login, sin afirmar contenido autenticado.
- Hay 58 capturas actuales: 55 ruta×viewport, `home-reduced-motion.png` y capturas finales landing a 390/320 px después de resolver navegación; la galería está en `screenshots/current/`.
- Reflow: comprobación automática Ego Lite previa en 55 combinaciones, `overflowCount: 0`. Tras corregir cascada móvil, landing 320/390 px confirma enlaces visibles y `documentElement.scrollWidth` igual a 320/390; nav recibe foco por teclado. 641/760 px confirman header flexible (131 px), nav visible dentro de su caja, sin overflow del documento. `prefers-reduced-motion: reduce`: `matchMedia` true; `img.currentSrc` resuelve al PNG estático; cero elementos con animación CSS. Navegación directa `/student/review`→`/student/trainer` conservó ambas rutas y su `aria-current`; confirma que ambas siguen montándose sin `getMe()` gate compartido.
- Las 20 capturas docente se rehicieron con contenido de inputs suprimido y sin enviar formularios; las imágenes de esta carpeta muestran campos vacíos.
- Muestra de teclado Ego Lite: homepage a 390 px recorre skip-link, marca, ambas anclas, CTA y footer; formulario docente recorre controles y acciones. No equivale a prueba exhaustiva de teclado en todas las rutas.
- La API local en `127.0.0.1:3000` no estaba disponible. Se mantienen sin ejecutar los submits, los estados autenticados y la selección/descarga real; no se inició servicio ni se accedió a producción. La suite existente pasa usando sus pruebas/fakes configurados. Zoom y auditoría visual completa de contraste no textual quedan pendientes. Ver QA-02..18.
- Última verificación posterior a la corrección EGM: `pnpm --filter @fragments/contracts build` PASS; `pnpm --filter @fragments/web test` **20 files/85 tests PASS**; `pnpm --filter @fragments/web typecheck` PASS; `pnpm --filter @fragments/web build` PASS (warning de chunk sin gzip: mammoth.browser 491.75 kB; JS 525.11 kB, advertencia existente). `git diff --check` PASS.
- EGM reviews: brainstorm y diseño en `egm-reviews/`; drift de implementación ronda 1 y su resolución en el informe dedicado; ronda 2 sin drift actual. No se afirma aprobación Goldfish de readiness del documento final.
- Commit F16: pendiente; branch local de revisión, sin push/merge/deploy. Antes de commit revisar `git status` y stagear solo paths pertenecientes a F16.
