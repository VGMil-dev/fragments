# F16.5 — evidencia y QA

## Preflight y fuente de verdad

- Rama: `feature/f16.5-brand-typography-polish`; worktree aislado `C:\Users\vgmil\.codex\worktrees\f16-5-brand-typography\Fragments`.
- Base F16.4 verificada antes de crear la rama: `b91343b0d75fb377d491005d855cc934b6654954`; el checkout fuente seguía limpio y no fue modificado.
- SVG maestro recibido `fragments-isotipo-recto.svg`, SHA-256 `975C1248EE0A747E89E0CE74027060EE956AF699F60F834946699EE67D4539E6`; PNG preview `fragments-isotipo-recto-1024.png`, SHA-256 `C719280AFCACC3C0483BF7084F5A3A5119E5605983CBBBAA1096D8FC86C0C76E`.
- El SVG conserva exactamente sus bytes, viewBox `0 0 100 80`, relación 1.25, reflejo recto horizontal y color `#D4FF24`. La copia fuente vive en `source/`; el recurso público `apps/web/public/brand/fragments-isotipo-recto.svg` coincide byte por byte. El PNG permanece como evidencia y no se integra.
- Las referencias opcionales `fragments-logo-vista-previa.png`, `preview-tamanos.png` y `REFERENCIA_APROBADA_NO_USAR_EN_WEB.png` no aparecieron en Downloads ni en los adjuntos; no se inventaron ni integraron.
- Se inspeccionaron AGENTS.md, `SYSTEM_PROMPT_CODEX.md`, sistema F16, contratos, tokens, task list y rutas del hero. El `BrandMark` compartido también se usa en acceso/footer, así que el cambio del logo se limitó al encabezado público. Favicon, iconos de app/PWA, footer, videos, poster, rutas privadas y autenticación no se alteraron.
- `lucide-react` no estaba instalado; se comprobó versión 1.73.0 en el registro y se añadió como dependencia exacta, con lockfile consistente. `pnpm install --frozen-lockfile --ignore-scripts` terminó con código 0.
- Se ejecutó la skill `ego-browser` 2.2.1 y fue el único navegador usado. Los críticos Brand, Visual/UX y Responsive/Accessibility se ejecutaron con GPT-6 Luna/medium. El runtime del agente principal no expone un selector verificable.

## Dirección crítica previa

- Brand Critic confirmó proporción, simetría y color del maestro; recomendó preservar la proporción en vez de encajarlo en un cuadro 1:1.
- Visual/UX recomendó elevar moderadamente el peso del lema y ensanchar el párrafo, sin mover el copy sobre la chica, gato o luna.
- Responsive/Accessibility recomendó preservar el enlace de marca, nombres accesibles, labels completos del dock, foco visible y comportamiento multimedia de F16.4.
- Un primer despacho Goldfish cayó en el checkout predeterminado F16.4 y se descartó; no cuenta como revisión. Se reenvió a la ruta absoluta correcta de F16.5.

## Implementación

- `App.tsx`: el header público usa el SVG maestro como imagen decorativa dentro del enlace ya nombrado; el wordmark `Fragments.` permanece. Login, registro y `Comenzar` mantienen sus rutas.
- Dock: Lucide `Rocket`, `Lightbulb` y `UsersRound`; stroke 1.8, Lime, tamaño visual de 22 px escritorio/tablet y 16 px móvil. Los iconos son decorativos (`aria-hidden`); los tres labels, textos cortos y semántica de lista se conservan.
- Tipografía: H1 sube sutilmente de `clamp(56px, 5.1vw, 84px)` a `clamp(60px, 5.35vw, 88px)` en escritorio y conserva ajuste controlado en tablet; móvil mantiene 43–57 px. El lema pasa a peso 650 y 24–32 px de rango escritorio; la descripción mantiene color y tamaño legible, gana ancho de línea (380 px) y peso 500. Se preservan copy, paleta, overlay del arte y orden responsive.
- El isotipo se revisó en una lámina a 16/24/32/48 CSS px (`screenshots/isotipo-16-24-32-48.png`). Mantiene relación exacta con `height:auto`; a 16 px es pequeño pero reconocible. Header renderiza 36 px en móvil y 40 px en escritorio.
- Cambios de aplicación limitados a App.tsx, CSS de la portada, prueba de portada, recurso SVG y dependencia Lucide/lockfile.

## Capturas y QA de navegador

- Baseline de F16.4 capturado desde el commit base antes de cambiar código: `screenshots/before-{320,375,390,768,1024,1440}.png`. Resultado F16.5: `screenshots/after-{320,375,390,768,1024,1440}.png`.
- Ego Lite fijó viewports CSS exactos. `innerWidth` y `scrollWidth` coincidieron en los seis tamaños; marcos de arte: 320×160, 375×187.5, 390×195, 724×362, 980×490 y 1440×795 px (altura de viewport 980 px). No se vio clipping de texto, superposición de botones ni pérdida de la chica, gato o luna.
- A 320 px el header conserva su wrap existente para la fila de acceso; marca, dos botones, beneficios cortos y CTA permanecen legibles. A 375/390 cabe la cabecera; tablet conserva el dock y sus beneficios; escritorio conserva una fila.
- Focus con teclado: primer Tab enfoca “Saltar al contenido”, segundo el enlace “Fragments, ir al inicio” y tercero “Iniciar sesión”; los tres muestran outline sólido de ~2.78 px. No se probó lector de pantalla real ni zoom nativo: `NOT_VERIFIED`.
- `prefers-reduced-motion: reduce`: 0 videos y 0 fuentes; poster WebP presente. Normal a 390: `hero-mobile.webm`; a 1024: `hero-motion.webm`. Se observó video activo, autoplay, muted, loop, playsInline, poster, sin controles; no se descargan variantes de resolución móvil y escritorio simultáneamente.
- Login, “Crear cuenta” y CTA “Comenzar” navegan a `/student/login`. No se inició sesión ni se modificaron flujos internos.

## Verificación local

- Rojo TDD: la prueba de portada falló inicialmente por ausencia del logo maestro y del stroke Lucide esperado; tras integrar los cambios, `pnpm --filter @fragments/web exec vitest run src/features/landing/PublicLanding.test.tsx` pasó 3/3.
- `pnpm --filter @fragments/contracts build`: PASS, exit 0.
- `pnpm exec turbo run test typecheck lint build --force`: PASS, exit 0; 10/10 tareas Turbo; 52 archivos y 236 pruebas (contracts 19, API 123, web 94), typecheck y build en los tres paquetes. Vite muestra avisos informativos de directivas de módulo en Lucide; no afectan build ni runtime.
- `git diff --check`: PASS. Diff auditado; no contiene secretos ni cambios en `.env`, autenticación, contratos, backend, infraestructura o rutas privadas.

## Auditoría Goldfish

Ronda 1 — 2026-11-16: CLEAN por dos auditores independientes (Brand/Implementation y UX/Accessibility). Revisaron el diff, alcance, proporción y bytes del SVG, Lucide/lockfile, capturas e implementación. No reportaron defectos accionables. Limitación compartida: no repitieron Ego Lite; navegador y tamaños se revisaron en evidencia/capturas, y zoom nativo/lector de pantalla siguen NOT_VERIFIED. Esta ronda cuenta como limpia, no verificó de nuevo runtime.

Ronda 2 — 2026-11-16: CLEAN por dos auditores independientes. Revisaron regresiones, rutas y autenticación, responsive, recursos, dependencias, alcance y restricciones de publicación. Un auditor cuestionó `task-list/TASKS.md`; se consideró y resolvió como no aplicable: `AGENTS.md` reserva esa lista al planner y la fila F16.5 asigna explícitamente el trabajo a PLANNER, función que desempeña este orquestador. El otro auditor no encontró defectos accionables. No quedaron hallazgos Blocker/Major sin resolver; por definición EGM se registran dos rondas consecutivas limpias (converged). Limitaciones: no repitieron navegador ni pruebas; se basan en capturas/evidencia local, y zoom nativo/lector de pantalla continúan NOT_VERIFIED.

Commit de implementación: `8c3cb958cbe6cd04dea82dbf46a3699564fe69e5` (`feat(F16.5): refina identidad de la portada`).

## Estado de integración/publicación

`origin/main` se actualizó el 2026-11-16 a `85244808d4f962f022b4a3cf412d20825715edb4` (HEAD protegido; check requerido `verify`) y se integró con merge normal en `4ee8c589813d9c73cbb155433dc0041fbb8d0228`. La suite pos-merge `pnpm exec turbo run test typecheck lint build --force` pasó 10/10 tareas Turbo y 236/236 pruebas; `git diff --check` pasó. El último release consultado es `v0.4.6`; siguiente PATCH previsto `v0.4.7`. `allow_auto_merge=false`; se usará merge normal al pasar `verify`.

Implementación y quality gates locales listos; falta PR, checks remotos, merge, PATCH/tag, pipeline de producción y smoke test según autorización explícita. No se omitirán protecciones ni checks.
