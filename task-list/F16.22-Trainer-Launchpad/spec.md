# Especificación — F16.22 Trainer Launchpad

## Estado sin Review

- El título dice «Tu entrenamiento empieza con una revisión».
- El texto describe el siguiente paso existente: enviar un commit a Review y volver a practicar los hallazgos cuando el análisis termine.
- Solo aparece la CTA existente «Ir a Review» hacia `/student/review`.
- No se muestra la tarjeta de capacidad futura mientras no hay Review.
- El estado mantiene la secuencia visual repositorio → Review → Trainer y el pie aclara que no hay retos ni historial disponibles aún.

## Estados y datos

- Carga y error conservan sus estados propios y no se presentan como vacío.
- Con Reviews reales no se modifica la selección, contexto de aula/misión/habilidades, desafío, pistas, registro ni historial.
- La autoevaluación permanece etiquetada como en preparación cuando ya hay Review.

## Verificación

- Pruebas de componente con respuestas fake etiquetadas.
- Pruebas focales, suite web, typecheck raíz, build raíz y `git diff --check`.
