# Especificación F16.14 — Mentor Pixel Night

- Mantener navegación global y una etapa del formulario visible; no recuperar el submenú lateral «Tu propuesta».
- Conservar el indicador superior Idea → Contexto → Habilidades → Objetivos y alcance → Evaluación → Portada con estados basados en campos válidos.
- Mantener separado y visible «Borrador completado: X %» en las seis etapas, calculado solo con campos válidos.
- Priorizar formulario y contexto académico real en el primer viewport; no repetir avisos largos fuera de la etapa pertinente.
- Alinear acentos del stepper a los tokens aprobados cobalt/lime de F16; texto legible, foco visible y reduced motion.
- Reflow y controles accesibles desde 320 CSS px; navegación de teclado y estados vacíos/carga/error no deben fingir completitud.
- Alcance exclusivo: `apps/web/src/features/mentor/mentor-screen.tsx`, `mentor-screen.css` y pruebas focales. No cambiar shell compartido, rutas, contratos, persistencia, API, rúbricas ni evaluación.
- Candidatas visuales/assets nuevos requieren aprobación de ubicación; no bloquean este ajuste con los elementos existentes.
