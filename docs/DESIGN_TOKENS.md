# Fragments UI art direction
Reference: supplied nostalgic pixel-garden agency screenshot, used only as mood/inspiration. Production art in `/assets` is newly generated and SVGs original. Avoid reproducing its copy, exact flower/CRT placement, cards or brand.

## Brand
- Display: `FRAGMENTS` / supporting line `Imagina. Construye. Demuestra.`
- Canvas #FCF9F1; navy #17345C; blue #4776A9; cornflower #6E9BCC; powder #D8EAF9; border #AFC4D9; paper white #FFFDF8; success #3D7F6B; warning #B97A33.
- Text body: system UI sans (15–17 px); headings use optional pixel-font under display only; never ship font files from unknown sources.
- Layout: airy editorial content, sidebar only desktop, four real surfaces: landing, gallery, project workspace, teacher dashboard. No repetitive SaaS tile wall; use meaningful stepper and review timeline.
- UI copy Spanish plain language. Buttons `Evaluar propuesta`, `Reevaluar`, `Generar entrega`, `Ver informe`, `Iniciar reto`.
- `motion/react`: enter up 6px / 180–240ms max, status transitions, pressed button scale .98; supports reduced motion and no autoplay decorative loops.
- SVG icon mark built from disconnected tiles symbolizing independent fragments becoming a coherent project. `assets/icon.svg`, favicon and social preview should use this mark, not Vite or previous Lumen assets.
- Use `assets/hero-fragments.png` as optional hero; CSS gradient or illustration hidden at narrow viewport, never block form reading; `loading="lazy"` outside hero and optimized derivative during implementation.
- Empty states: explain next action. Error states show recovery. Loading shows queue state rather than fake spinner forever.
