# F16.4 — evidencia y QA

## Preflight

- Worktree creado desde la entrega F16.3 aprobada; se mantiene aislado de `codex/f16.3-final-visual-polish`.
- Rama de trabajo: `codex/f16.4-ambient-motion`.
- Original adjunto recibido como `C:\Users\vgmil\Downloads\hero.mp4`. El nombre interno `gemini_generated_video_aac39605.mp4` no aparece en Descargas ni en el checkout; el archivo provisto coincide visualmente con la escena aprobada (chica, gato, habitación nocturna y luna con parpadeo/hojas sutiles), por lo que no se buscará ni usará otra animación.
- SHA-256 original: `ED8198DD9F545EA3FCECC4E74BF1AE94437C1E335858A30ED29B1BE342D0E7AD`.
- Metadatos originales: H.264 1280×720, 24 fps, 240 cuadros, 10,026667 s, 5.095.338 bytes; AAC estéreo presente en el original y ausente de todos los derivados.
- Base real: F16.3 commit `6a25901fd9e767303d756e8d1f135f5b0ac88cba`. La rama citada como `codex/f16.3-polish` no está disponible; el commit corresponde a la rama efectiva `codex/f16.3-final-visual-polish`.

## Crítica inicial independiente (GPT-6 Luna/medium solicitado; modelo efectivo no verificable)

- Motion Critic: confirmó identidad visual del original; señaló relación 16:9 de video vs. contenedor 2:1, necesidad de validar `contain` y franjas, diferencia leve entre fotogramas primero/último, y revisar un fundido muy corto solo si no produce doble exposición.
- Performance Critic: mantener 24 fps y quitar audio; probar VP9 CRF 32–36 con revisión de calidad; confirmar una sola variante solicitada, no montar fuentes con reduced-motion, retener poster, diferir carga hasta viewport y pausar al salir. La prueba `PublicLanding.test.tsx` actual niega `<video>` y requiere adaptación.
- UX/Accessibility Critic: mantener arte decorativo y poster visible; no montar video con reduced motion; mantener caja 2:1/estabilidad; seleccionar una variante por ancho y pausar fuera de pantalla.

## Conversión y bucle

- Se preservó el origen en `task-list/F16.4/source/hero.mp4`; el hash de la copia coincide con el archivo adjunto.
- Derivados, todos sin pista de audio y a 24 fps: WebM VP9 principal 1280×720, 9,792 s, 1.327.082 B; MP4 H.264 respaldo 1280×720, 9,791667 s, 1.707.500 B; WebM VP9 móvil 640×360, 9,792 s, 549.737 B; MP4 H.264 móvil 640×360, 9,791667 s, 577.183 B; poster WebP 1280×720, 122.264 B.
- La variante móvil reduce el tráfico de video en ≈58,6% frente al WebM principal, por lo que se conserva; se selecciona por `matchMedia` antes de insertar fuentes.
- Parámetros: VP9 CRF34, móvil CRF32; H.264 preset `slow` CRF23; WebP calidad 90. El principal queda 73,9% más pequeño que el original de 5.095.338 B. SSIM alineado en 220 cuadros: global 0,983132 (Y 0,982587, U 0,983388, V 0,985053); la revisión a tamaño nativo no encontró degradación perceptible en bordes ni iluminación.
- El final original tenía un cambio sutil de posición en hojas. Los derivados aplican fundido de 0,25 s (6 cuadros a 24 fps) entre cola e inicio; las capturas laterales de primer/último fotograma `screenshots/loop-boundary-original.png` y `loop-boundary-final.png` muestran la unión sin salto visible ni doble exposición perceptible.
- Ego Lite contó tres reinicios reales del elemento en bucle (a 4× durante la verificación para ajustarse al límite de 15 s de evaluación por página); el archivo conserva `loop`, 24 fps y 9,792 s. Se probará en el navegador normal del propietario tras aprobación.
- SHA-256 de derivados: poster `EDEA90D4E4609597F4ACE63EA4852435A70AE80C3A165FE644CD0DAA5C2CDC4B`; VP9 `938DDCF2030675BC25813C19142FAADF28F7B4BEF04BF599A290835A000930B5`; H.264 `ECAC3340D27D88535A70E7090125F91AB7CC8FEB2768459C69E983965F256E55`; VP9 móvil `6D4385ED3795E100505B492CC12A20114135F5FB2E15A7B4C3C9C97F07858073`; H.264 móvil `F41EB9BCAB0673D0CC0899B986238C4EB161282F5E5D7F73E6D5C0312C54A0DB`.

## Integración y QA

- Solo cambió el markup del arte en el hero, un componente multimedia dedicado, su clase de opacidad de carga y pruebas de landing. El marco `.f162-visual`, 2:1, cabecera, intro, dock, paleta, espaciado, tipografía, beneficios, bienvenida, CTA y navegación se preservan. No se alteraron ilustraciones F16.3 ni otras rutas.
- Capturas comparativas previas F16.3/F16.4 en `screenshots/{before,after}-{320,375,390,768,1024,1440}.png`; capturas del ajuste `object-fit: cover` en `screenshots/cover-{320,375,390,768,1024,1440}.png`, recapturadas con viewport CSS exacto.
- La QA de F16.4 antes del ajuste mantuvo los espacios F16.3, título, marca, beneficios y CTA en los seis tamaños, sin desbordamiento. El mensaje de bienvenida sigue oculto en 768/1024 por la regla de breakpoint existente.
- Ajuste visual a solicitud del propietario: poster y video ahora usan `object-fit: cover` en el mismo contenedor F16.3, sin tocar el layout. En los marcos 2:1 se recortan cerca de 40 px de la fuente arriba y abajo; la chica, el gato y la luna permanecen completos en las seis capturas. Ego Lite midió marcos 320×160, 375×187,5, 390×195, 724×362, 980×490 y 1440×795 px; `scrollWidth` coincidió con `innerWidth` en los seis anchos. Se pierden algunos detalles periféricos de la habitación. En el hero ancho, el ajuste también llena el marco sin crear una composición nueva.
- Normal: 390 eligió y descargó solo `hero-mobile.webm`; 1024 eligió y descargó solo `hero-motion.webm`; MP4 queda como respaldo y no se descargó en navegador VP9. Los atributos observados son autoplay, muted, loop, playsInline, poster, `preload=none`, sin controles.
- Reduced motion emulado antes de navegar: video 0, sources 0; se solicitó únicamente el poster. Imagen de fallback se conserva visible. Al bloquear WebM y MP4 para probar error real, ambas fuentes fallaron y el poster permaneció; no se bloqueó el título. Al desplazarse fuera del hero se desmonta el video; al regresar se carga/reproduce otra vez.
- CTA en Ego Lite llega a `/student/login` (“Continúa con GitHub”); los enlaces y contenido público se conservan. Pruebas unitarias de LandingHeroMedia cubren poster/reduced-motion, atributos, fuente por viewport, cambio de breakpoint, desmontaje fuera de vista y fallback por error.
- `pnpm exec turbo run test typecheck build --force` (verificación fresca 2026-11-15): PASS; 52 archivos/236 pruebas (contracts 19, API 123, web 94), typecheck y build PASS; Vite transformó 162 módulos. Tras el ajuste se repitió el comando: 9/9 tareas PASS (tests, typecheck y build en contracts/API/web); `git diff --check` PASS.
- Ego Lite skill ejecutada antes de visual QA. No se usó Playwright, Puppeteer ni otro navegador.
- Goldfish R1 visual/funcional del ajuste `cover`: **CLEAN / CLEAN** tras revisar las capturas corregidas; confirmaron íntegros los sujetos clave.
- Goldfish R2 visual/funcional del ajuste `cover`: **CLEAN / CLEAN**, segunda ronda consecutiva limpia. Revisaron el diff y las seis capturas; confirmaron sujetos completos, layout/fallback/reduced-motion intactos y recorte limitado a bordes periféricos.
- Se ejecutó la skill `ego-browser` antes de QA visual/E2E; fue el único navegador. No se añadió ni usó Playwright, Puppeteer o alternativa.

## Dictamen y commits

- Readiness: **PENDING OWNER VISUAL APPROVAL** sobre el nuevo encuadre `cover`. R1/R2 convergieron; queda que el propietario confirme que prefiere llenar el marco aunque se recorten bordes periféricos.
- Commits locales: `0fa7880` (`feat(F16.4): integra video ambiental`); `9850ee3` (9850ee3c6c85b56aef8c3da9ec1c26e9ee7135eb) (`feat(F16.4): llena el marco del hero`). `b9ed83c` (`docs(F16.4): corrige capturas del encuadre`). Capturas del encuadre final: `screenshots/cover-{320,375,390,768,1024,1440}.png`.
- Sin push, merge, release ni despliegue.
