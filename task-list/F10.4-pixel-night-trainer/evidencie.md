# Evidencia — F10.4 Trainer Pixel Night

PR #183 se integró por merge normal como `c6e8a77f274481c7199b207c0bd75c4f1605ff45`; CI `45170608407` SUCCESS. Commit de código `87dfb87ae90a7c874e1b81bc0a4357f7c4dce787` en `codex/pixel-night-trainer`. Release F14 `v0.5.39`, aplicada con imagen/SHA `e202ec6302b9f35727673e2c6f34a74b4ce2d540`. **Candidata visual, pendiente de revisión del propietario**.

## Archivos

- `apps/web/src/features/trainer/TrainerScreen.tsx`
- `apps/web/src/features/trainer/trainer-screen.css`
- `apps/web/src/features/trainer/TrainerScreen.test.tsx`

## Cambios

- Jerarquía de laboratorio por etapas: fuente real de práctica, sesión de práctica y traza personal.
- Estado vacío con ilustración funcional Lucide y CTA existente hacia Review.
- Reto mostrado solo tras el sorteo real; objetivo derivado de la revisión seleccionada.
- Autoevaluación anunciada claramente como en preparación.
- Superficies Pixel Night, reflow móvil, foco visible y `prefers-reduced-motion`.
- Historial con estados distintos de carga, error recuperable y vacío solo tras respuesta exitosa; retry con API actual y texto de persistencia limitado a revisión/sesión.

## Verificación fresca de código

- `pnpm exec vitest run src/features/trainer/TrainerScreen.test.tsx`: **6/6 PASS**.
- Suite web: **49 archivos, 220 tests PASS**.
- Typecheck y build web: PASS; quedan advertencias de bundle >500 kB y directivas `use client` de Lucide.
- `git diff --check`: PASS.
- La primera invocación focal pasó por la suite completa y falló al resolver contracts sin compilar; pipeline Turbo correcto pasó después.

## QA visual Ego Lite — producción v0.5.39

- Fecha: 2026-11-23. Página autenticada `/student/trainer`; build UI `v0.5.39`, SHA `e202ec6302b9f35727673e2c6f34a74b4ce2d540`.
- Viewports emulados 320, 390, 768, 1024 y 1440 px: página cargó en todos; `document.documentElement.scrollWidth <= innerWidth` en los cinco.
- Teclado: 13 pulsaciones Tab desde carga alcanzaron «Ir a Review»; `:focus-visible` activo, outline sólido lima de 3 px.
- `prefers-reduced-motion: reduce`: media query activa y pantalla cargada.
- Estado observado: sin Review activa; CTA real a Review, sin reto ni puntuación fabricados; autoevaluación marcada «En preparación».
- Capturas PNG originales Ego Lite fuera del repositorio: `C:\Users\vgmil\ego\pixel-night-trainer-1440.png` SHA-256 `683F012372650BD2470F2003A8946233C637440F92535CD12726BC1BF7CC0C0C`; `C:\Users\vgmil\ego\pixel-night-trainer-390.png` SHA-256 `A159D46B8AF8AEBB248FB06D782963E936F7DF092F6D2B34B833C0E20200BF43`.

## Límites

- Zoom del navegador al 200 %, lector de pantalla y medición formal de contraste: **NO COMPROBADOS**.
- Solo se observó el estado vacío auténtico disponible; Review vinculada, reto real, pistas e historial poblado: **NO COMPROBADOS** en producción.
- No se hicieron escrituras ni llamadas de evaluación a proveedores externos.
- Revisión reflexiva confirmó los estados de carga/error/vacío; no ejecutó tests.

## Incremento — siguiente paso de práctica · 2026-11-23

- Cuando el API confirma que se registró el intento, el CTA permite volver a sortear desde la Review seleccionada. Antes de eso invita a registrar el intento; no inventa XP, racha, puntuación ni garantiza un reto diferente.
- Conserva source Review, commit, habilidades, reto observable, pistas e historial del API. No añade ruta, contrato, persistencia, reto fake ni ejecución de código del estudiante.
- Commit `a720a6f70b1e333fab85f5b419bc10e824072eba` (`feat(F10): encadenar la práctica desde Trainer`), sobre `d5d25527b67e9c4a3ed799154f76c187e351ece5`.
- TDD: prueba de recorrido falló antes del cambio y luego cubrió selección/source, commit, habilidad, challenge, hint, intento/historial y sorteo posterior. Focal **7/7 PASS**; typecheck y `git diff --check` PASS; worktree limpio.
- PR, CI, QA Ego Lite y release F14: pendientes. La pantalla sigue candidata y la respuesta visual de QA está **NO COMPROBADA**.
