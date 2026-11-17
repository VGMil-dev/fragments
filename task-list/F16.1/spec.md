# F16.1 — Especificación de refinamiento

## Criterios

1. La navegación de estudiante funciona a 320, 375, 768 y 1440 px; enlaces visibles, estado actual identificable y foco de teclado visible sin recorte.
2. La tipografía usa tokens compartidos: títulos escalables, cuerpo funcional de al menos 16 px y metadatos no esenciales de 14 px.
3. El aviso de privacidad de Mentor conserva su texto y queda legible en móvil.
4. Las tarjetas de Galería presentan una sola vez el estado y conservan título, consigna, metadatos y acciones existentes.
5. Trainer distingue reto, acciones, progreso, pistas y entradas del historial sin sugerir que el progreso sea una calificación; diseño adaptable.
6. Inspector, Control de Mentor y Estudiantes comparten encabezado y contenedor docente.
7. QA automatizado local y capturas comparativas en Ego Lite; sin servicios externos.

## Alcance técnico

Estilos y markup acotados a Galería, Mentor, Review, Trainer y vistas docentes, además de tokens y navegación compartidos. La hoja docente común se carga desde `App.tsx`. Sin cambios de contratos API ni recursos gráficos.
