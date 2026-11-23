# F10.3 — Especificación

## Entradas

- Estado existente de carga/error del endpoint `GET /api/trainer/reviews`.
- Lista de reviews devuelta por la API actual.
- Callback `onStartReview` y destino existente `/student/review`.

## UI y salida

- Cabecera compacta «Entrenamiento» con contexto de práctica basado en reviews.
- Respuesta exitosa vacía: un solo bloque de estado vacío, encabezado «Tu entrenamiento empieza con una revisión» y CTA «Ir a Review» a `/student/review`, conservando el callback SPA.
- No existe asset F16 aprobado para esta ubicación: estado vacío sin ilustración.
- Lista no vacía: conserva selector, sorteo, reto real y estado/historial actuales.
- Carga: comunica carga sin presentar estado vacío.
- Error: conserva alerta y reintento; no afirma ausencia de revisiones.

## API / datos

Sin cambios. No se inventan respuestas ni contenido de retos.

## Criterios de aceptación

- GIVEN una carga exitosa sin reviews, WHEN Trainer termina de cargar, THEN muestra cabecera compacta, el mensaje especificado y el CTA real a Review; no muestra controles vacíos, historial vacío ni ilustración no aprobada.
- GIVEN una carga en curso, WHEN Trainer renderiza, THEN muestra el estado de carga y no afirma que falten reviews.
- GIVEN error al cargar, WHEN Trainer renderiza, THEN muestra alerta/reintento y no el estado vacío.
- GIVEN una o más reviews, WHEN Trainer termina de cargar, THEN conserva selector, sorteo e historial sin inventar un reto.
