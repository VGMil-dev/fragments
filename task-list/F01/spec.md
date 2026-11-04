# F01 — Specification

**Objetivo:** landing responsive e identidad visual del producto.

## Entradas
- `docs/DESIGN_TOKENS.md`, `docs/SYSTEM_DESIGN.md`, `assets/hero-fragments.png`, `assets/icon.svg`, `assets/flower.svg`, `assets/sparkle.svg`.

## Salida y UI
- Landing en español con una sola acción principal para iniciar el recorrido de estudiante.
- Adaptación comprobable a 390 px, 768 px y 1440 px; lectura y CTA prioritarios en móvil.
- Marca SVG, favicon y metadata Open Graph, title, description y theme-color sin branding de Vite.
- Motion de interacción respetando `prefers-reduced-motion`; foco de teclado visible y contraste legible.

## Criterios GIVEN / WHEN / THEN
- [ ] GIVEN la página inicial, WHEN se abre en 390/768/1440 px, THEN no hay scroll horizontal y el contenido principal permanece legible y accionable.
- [ ] GIVEN una persona con teclado, WHEN navega por enlaces y botones, THEN ve el foco y puede activar todos los controles.
- [ ] GIVEN `prefers-reduced-motion: reduce`, WHEN la página carga e interactúa, THEN no se ejecutan animaciones decorativas continuas.
- [ ] GIVEN metadata del documento, WHEN se inspecciona `index.html`, THEN título, descripción, theme-color, favicon y preview social pertenecen a Fragments.
- [ ] GIVEN los assets originales, WHEN se muestran, THEN se usan como apoyo y no como texto incrustado ni como sustituto de navegación.

## Pruebas y límites
- Capturas visuales 390/1440 con ego(lite); revisión adicional a 768 px.
- No tocar dominio, contratos, cliente API ni respuestas simuladas.
