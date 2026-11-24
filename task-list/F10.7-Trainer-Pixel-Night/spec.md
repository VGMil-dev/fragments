# Especificación F10.7 — Trainer Pixel Night

- En ausencia de Review, mantener el estado real y el CTA existente hacia Review.
- Añadir una representación ligera de la secuencia de práctica usando únicamente iconos funcionales Lucide y texto; no usar assets o personajes nuevos ni inventar repositorio, commit, retos, puntuación, progreso o recompensas.
- Alinear acentos a cobalt/lime y tokens semánticos F16; preservar contraste/foco, reflow 320 px y reduced motion.
- Cuando exista Review real, conservar exactamente la selección de repositorio/SHA, reto, pistas, historial y acciones actuales.
- El mensaje de autoevaluación debe seguir indicando que está en preparación; no anunciar funcionalidad inexistente.
- Alcance: `apps/web/src/features/trainer/TrainerScreen.tsx`, `trainer-screen.css` y pruebas focales. No tocar API, rutas, contratos, persistencia, otras pantallas o infraestructura.
- TDD, build/typecheck y diff-check. QA visual posterior solo con la sesión Ego Lite existente, sin abrir/reemplazar espacios.
