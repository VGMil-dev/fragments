# Especificación F10.2 — Continuidad Review → Trainer

## Comportamiento

1. Tras cargar Trainer correctamente sin revisiones completadas, mostrar el estado vacío actual y un enlace accesible a `/student/review`.
2. Mientras el feed carga, no mostrar el CTA de ausencia.
3. Si el feed falla, mostrar el error y permitir reintentar; no afirmar que la colección está vacía.
4. Al mostrar una Review `completed`, ofrecer «Continuar en Trainer» hacia `/student/trainer`. No mostrarlo en estados `queued`, `running` o `failed`.
5. El dashboard Trainer obtiene las revisiones completadas propias con la API existente y selecciona la más reciente según el orden del servidor. No se crean retos hasta que el estudiante los sortee.
6. La navegación es por enlaces semánticos con destino verificable y callbacks SPA existentes; funciona con teclado.

## Criterios de aceptación

- GIVEN respuesta exitosa vacía de Trainer, WHEN termina la carga, THEN se anuncia el estado vacío y aparece un enlace con nombre accesible que navega a Review.
- GIVEN feed Trainer con error, WHEN termina la carga, THEN aparece el error/reintento y no el texto de vacío ni un reto inventado.
- GIVEN Review completada, WHEN se presenta el análisis, THEN aparece el enlace a Trainer.
- GIVEN Review en cola, en ejecución o fallida, WHEN se presenta su estado, THEN no aparece el enlace a Trainer.
- Sin cambios a contratos/API/DB, sin llamadas IA y sin escrituras productivas.
