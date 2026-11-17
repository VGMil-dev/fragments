# F16.3 — evidencia y QA

## Preflight y alcance

- Base confirmada: `codex/f16.2-landing` en `bc2142b9e9912cc9592e8ca517ca198d42451582`, limpia.
- Worktree aislado: `C:\Users\vgmil\.codex\worktrees\fragments-f16-3-polish\Fragments`, rama `codex/f16.3-final-visual-polish`.
- Cambio de aplicación exclusivo en `apps/web/src/features/landing/public-landing-f162.css`. No se modificaron JSX/TS, rutas, autenticación, backend, contratos, tooling, infraestructura ni recursos de imagen.
- El logo, los textos y el dock mantienen el contenido y los destinos de F16.2. CTA continúa hacia `/student/login`.

## Dirección y decisiones de implementación

Las tres críticas independientes iniciales (responsive, fidelidad visual, accesibilidad/interacción; configuración GPT-6 Luna/medium solicitada, modelo efectivo no verificable) señalaron:

- El hero móvil reservaba casi toda la altura del viewport y el dock crecía con `flex: 1`, dejando espacio artificial bajo el CTA. Se cambió a altura por contenido y dock de altura intrínseca; se conserva el inset inferior seguro y quedan 32 px bajo el botón en los tres anchos probados.
- `object-fit: cover` recortaba bordes de la escena móvil y el stage de escritorio se extendía detrás del dock. Se pasó a `contain`, conservando el ratio natural del recurso 1774×887 (2:1) y terminando el stage desktop sobre el dock.
- El layout tablet comenzaba en 701 px, aunque el contrato visual establece tablet desde 768 px; a 768 se añadía `padding-bottom:85px` y se estiraba la imagen. El breakpoint ahora comienza en 768 px, la escena utiliza 2:1 con márgenes de 22 px y se eliminó aquel espacio/estiramiento especial.

No se regeneró ni editó ilustración alguna. La preferencia de movimiento reducido existente continúa desactivando transiciones/transformaciones.

## Capturas y mediciones visuales

Los pares de seis tamaños se guardan en `task-list/F16.3/screenshots/` como `before-{320,375,390,768,1024,1440}.png` y `after-{320,375,390,768,1024,1440}.png`. Los `before` son las capturas finales versionadas de F16.2; los `after` se capturaron en Ego Lite con viewport CSS de ancho exacto.

- 320×909: hero y siguiente sección empiezan en y≈110 y y≈663; CTA termina y≈631, separación 32 px. Escena 320×160.
- 375×812: siguiente sección y≈688; CTA termina y≈656, separación 32 px. Escena 375×188.
- 390×844: siguiente sección y≈698; CTA termina y≈666, separación 32 px. Escena 390×195.
- 768×900: introducción termina alrededor de y≈261; escena empieza y≈289 (28 px), mide 724×362 con márgenes de 22 px; dock sigue inmediatamente a la escena.
- 1024×900: escena x=22, ancho 980, alto 490; dock sigue al final de la imagen sin solapamiento.
- 1440×900: stage de escena termina al comenzar el dock (y≈787); composición completa a escala natural.
- En los seis `after` se verificó directamente marca, titular, lema y descripción. Móvil muestra los tres beneficios, bienvenida y CTA; desktop conserva sus beneficios y CTA. A 768, la bienvenida permanece oculta por la regla responsive preexistente, igual que en F16.2.
- Comprobaciones de overflow horizontal a 320/375/390/700/701/767/768/820/821/1024/1440: ninguno. El contenido se adapta al ancho sin saltos entre 767 y 768.

## Interacción y accesibilidad

- Ego Lite verificó foco visible de 3 px y secuencia de Tab por enlace de salto, marca, acceso, registro y CTA.
- Los enlaces de cabecera conservan objetivo táctil mínimo de 44 px; CTA mide 52 px en 390.
- Enter sobre «Comenzar» navega a `/student/login`, con encabezado «Continúa con GitHub».
- El arte permanece decorativo (`aria-hidden`, alt vacío); el nombre accesible del CTA permanece disponible.
- Se intentó el zoom nativo con atajos de Ego Lite, pero no hubo cambio verificable de viewport/DPR: zoom real 200/400 % **NOT_VERIFIED**. Lector de pantalla real **NOT_VERIFIED**. No se infiere conformidad de esas pruebas.

## Revisiones

- Crítica inicial responsive: resueltas las causas del vacío móvil, del gap tablet y del breakpoint contractual.
- Crítica inicial visual: resueltos recorte móvil y stage desktop bajo el dock.
- Crítica inicial de accesibilidad/interacción: sin nuevos bloqueos; zoom y lector real no verificados.
- Goldfish R4 funcional: **CLEAN**.
- Goldfish R4 visual: **no contabilizada**; su descripción de capturas sin marca/texto no coincide con los PNG exactos que inspeccionamos directamente.
- Goldfish R5 visual y funcional: **CLEAN / CLEAN** (primera ronda válida consecutiva).
- Goldfish R6 visual y funcional: **CLEAN / CLEAN** (segunda ronda válida consecutiva). Ambas revisaron el código y los seis pares finales; no solicitaron cambios.

## Verificación automatizada

- `pnpm test`: PASS, 230 pruebas (contracts 19, API 123, web 88; 51 archivos en total).
- `pnpm typecheck`: PASS, 4 tareas Turbo.
- `pnpm build`: PASS, 3 tareas Turbo; Vite compiló 161 módulos.
- `git diff --check`: PASS.
- No se añadieron pruebas: la implementación es CSS-only y el comportamiento visual/interactivo se verificó en navegador Ego Lite.

## Dictamen y commits

- Readiness: **READY FOR REVIEW**, sujeto a la limitación explícita de zoom nativo y lector de pantalla real no verificados.
- Rama local: `codex/f16.3-final-visual-polish`; sin push, merge, release ni despliegue.
- Commit de implementación local: `af8547e` (`feat(F16.3): pule portada pública`). El cierre de evidencia y estado de tarea se registra en un commit documental posterior.
