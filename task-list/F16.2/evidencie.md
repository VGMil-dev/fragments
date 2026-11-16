# F16.2 — evidencia y QA

## Base y alcance

- Rama: `codex/f16.2-landing`, derivada localmente de `feature/f16-experience-redesign` (`cad39e596d505f0c42e94b2a03fda64da67b26c0`).
- Se inspeccionaron `AGENTS.md` provisto por el usuario, `SYSTEM_PROMPT_CODEX.md`, diseño, contratos, tokens y lista de tareas; paquete `FRAGMENTS-F16.2-ITERATION-KIT.zip` (`AGENTE/`, `SPEC/`, `QA/`, plantilla y referencias).
- Se integró el template como guía, sin reemplazar la aplicación. Cambios limitados al índice/preload, portada pública, CSS y prueba de portada, recurso visual, y documentación F16.2.
- El manifest del kit declara `asset_video_final_incluido: false`. La rama F17 contiene un video cuyo propio registro aún exige revisión visual humana; no se usa ni se considera aprobado. La portada queda estática y accesible.
- La ilustración proviene sin cambios de `PLANTILLA/estatica/assets/moonlit-fragments.webp`: 1774×887, 195814 bytes, SHA-256 `0E10BF9115A4022DD1CD7AEE917A4B9E44B30CBE2841CE34A3CF5800CCF6B2AB`.

## Implementación

- Unificación del dock inferior con beneficios, bienvenida y CTA; se eliminó la CTA duplicada del cierre de la portada.
- Enlace de inicio y acceso/creación de cuenta conectados al acceso estudiantil GitHub existente. El texto accesible aclara el flujo.
- Ajustes específicos para 1024 px y pantallas móviles; lista accesible de beneficios con etiquetas visuales cortas en móvil.
- Recurso estático con preload; sin video ni generación de arte.

## Verificación automatizada

- `pnpm test` — PASS: contracts 19/19, API 123/123, web 88/88; 230 pruebas totales.
- `pnpm typecheck` — PASS (4 tareas Turbo).
- `pnpm build` — PASS (3 tareas Turbo; Vite 161 módulos).
- `git diff --check` — PASS.
- La primera ejecución enfocada requirió compilar `@fragments/contracts` para el checkout; después, las pruebas objetivo fallaron contra la UI previa como se esperaba antes de implementar y pasaron tras el cambio.

## QA visual, responsive y accesibilidad

- Ego Lite (v2.2.1), viewport reproducible: 1440×900, 1024×900, 768×900, 390×844, 375×812 y 320×909. Imágenes finales en `task-list/F16.2/screenshots/after-{1440,1024,768,390,375,320}.png`; comparadas individualmente con las seis referencias correspondientes y la comparativa objetivo del paquete.
- En las seis medidas: arte cargado, sin overflow horizontal, CTA con altura ≥52 px. A 1024 el arte queda inset 22 px; en 390 inicia cerca de y=309 (referencia ≈305); a 320 el CTA queda en x=18, y≈619, w=284, h=52. Resto de offsets observados son de pocos píxeles y no bloquean.
- Se comprobó orden de tabulador (skip link, marca, iniciar sesión, crear cuenta, Comenzar) y outline visible; Enter en Comenzar lleva a `/student/login`. Árbol de accesibilidad incluye los tres nombres completos.
- No hay video/animación de fondo; con movimiento reducido la página sigue estática y la transición del CTA se desactiva.
- **No verificado:** zoom nativo del navegador a 200/400 % (atajos del control remoto no alteraron zoom/viewport) y lector de pantalla real. Inspección de árbol AX no sustituye una sesión con lector de pantalla.

## Revisiones Goldfish

- R1 visual señaló una línea larga a 768/1024; se redujo el ancho máximo del texto.
- R1 funcional encontró nombres de beneficio insuficientemente expuestos; se conservaron etiquetas completas accesibles y se ocultaron solo las abreviaturas visuales.
- R2 accesibilidad: CLEAN. R2 visual: encontró encuadre móvil 390 px más bajo/corto; se corrigió a relación 8:5 con margen superior 22 px.
- R3 funcional: CLEAN. R3 visual identificó arte full-bleed a 1024 px; se aplicaron margen lateral 22 px y 16 px de espacio inferior a la introducción.
- R4 visual: CLEAN (1024 y todos los otros tamaños, post-fix). R4 funcional/accesibilidad: CLEAN.
- R5 funcional: CLEAN. R5 visual detectó bandas laterales/vacío en el encuadre 768 px; se añadió regla específica 701–820 px para que la ilustración cubra el marco hasta el dock.
- R6 funcional: CLEAN. R6 visual detectó recorte de la planta derecha con `cover`; se ajustó a `fill`, preservando la ilustración completa de la referencia.
- R7 visual y funcional/accesibilidad: CLEAN en estado posterior a la corrección.
- R8 visual y funcional/accesibilidad: CLEAN. Segunda ronda consecutiva limpia con revisores frescos; sin hallazgos accionables.

## Dictamen

CONDITIONAL REVIEW: ronda Goldfish cerrada con dos rondas limpias consecutivas (R7 y R8). Zoom nativo del navegador y lector de pantalla real no fueron verificados, por lo que la revisión humana de esas dos condiciones sigue pendiente. No hubo acceso a servicios externos, push, merge, release o despliegue.

## Commits

- Commit de implementación: `7fb1739`.
- Commit de documentación/evidencia: pendiente.
