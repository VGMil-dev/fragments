# Especificación F10.5 — Trainer Pixel Night

## Criterios de aceptación

- GIVEN una Review disponible seleccionada, WHEN se muestra Trainer, THEN se identifican el repositorio real y el SHA completo usado.
- GIVEN que cambia la Review seleccionada, WHEN actualiza la vista, THEN el origen visible corresponde a la misma Review cuyo resultado se practica.
- GIVEN no hay una Review disponible, WHEN se abre Trainer, THEN se conserva el estado vacío y el CTA real a Review.
- No se altera el API, la ponderación 45/35/20, selección de retos, historial, pistas ni permisos.
- Sin Review completada con reto, no se declara validado el flujo funcional completo.
