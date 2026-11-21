# Revisión independiente Agent B — UX-09 (ronda inicial)

**Estado: REVISAR.** Capturas Ego Lite tomadas sobre `http://127.0.0.1:5173/student/mentor`, commit base `1cdeae04b0e0930663c79cde7ef72efe6f8c6054`, con cambios locales no confirmados visibles en el worktree. Fixtures sintéticas de estudiante/propuesta interceptaron `/api/*` solo en el origen local; escrituras y evaluación quedaron bloqueadas, sin DB ni proveedor IA. La referencia aprobada utilizada fue `referencia-aprobada.png`, 1672×941, SHA-256 `76a1b15c63ba87ce655f2e63f193beb1dd7d8242e62adb7599e73c0c3c11330c`.

## Hallazgos

- **REVISAR:** En etapa 5 se conserva un `<form id="mentor-proposal-form">` vacío que ocupa ~46 px y pinta una banda/tarjeta vacía entre el stepper y el resumen. En la composición aprobada el resumen empieza inmediatamente debajo del stepper.
- **REVISAR:** En viewport CSS de 1024 px, `document.documentElement.scrollWidth` dio 1097 px (73 px de overflow horizontal). El stepper y parte del shell quedan recortados, con scrollbar horizontal.
- **REVISAR:** El panel derecho muestra el aviso de publicación automática dentro de un recuadro azul con borde/fondo destacado. UX-09 pide avisar antes de evaluar, pero sin recrear una tarjeta informativa; conviene reducirlo a microcopy contextual/discreta.
- **REVISAR visual:** Falta el subtítulo de la referencia (“Revisa y solicita la evaluación de tu propuesta antes de publicarla en Galería.”); solo aparece “Etapa 5 de 6 · Evaluación”.
- **REVISAR responsive:** En 320/390 px no hay desbordamiento; el selector compacto y controles Anterior/Siguiente aparecen. La cabecera superior estrecha hace que “Cuenta GitHub” se parta en dos líneas junto al botón de sesión. A 768 px no hay overflow, aunque los nombres del stepper se parten y la composición queda apretada.
- **Pasa provisional:** Orden del resumen Idea → Contexto → Habilidades → Objetivos, “Ver contexto” lleva al contexto en modo solo lectura, los botones de edición de Idea/Contexto funcionaron en la interacción observada. La rueda reporta `aria-valuenow="100"` y el botón de evaluación estaba habilitado para el fixture completo y guardado. No aparece contenido DOCX dentro de UX-09.

## Viewports

| Ancho CSS | Overflow horizontal | Resultado |
|---:|:---:|---|
| 320 | No | Selector compacto visible |
| 390 | No | Selector compacto visible; cabecera apretada |
| 768 | No | Stepper horizontal comprimido |
| 1024 | Sí, 73 px | REVISAR |
| 1440 | No | Composición legible |
| 1672 | No | Proporciones cercanas a referencia; artefacto del formulario vacío visible |

Capturas: `ego-review-320.png`, `ego-review-390.png`, `ego-review-768.png`, `ego-review-1024.png`, `ego-review-1440.png`, `ego-review-1672.png`.

## Pendiente de repetir

Esta es una ronda inicial, no un PASS. Durante la revisión posterior Vite mostró temporalmente un `PARSE_ERROR` en JSX (línea 739 de `mentor-screen.tsx`) mientras el agente desarrollador editaba; no se revisó ni capturó ese overlay como UX. Repetir navegación completa, foco/teclado, consola, evaluación-error/recuperación y todas las capturas con el siguiente bundle compilable y corregido.
