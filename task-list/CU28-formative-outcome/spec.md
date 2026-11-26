# CU-28 — Especificación de valoración formativa

## Dado

- Una Review exacta y un reto Inspector asignado a un docente autorizado.
- Evidencia del commit y estado de la defensa existentes.

## Cuando

- El docente elige una valoración cualitativa, registra observación y notas, y guarda.
- Luego vuelve a cargar la defensa.

## Entonces

- Se guarda y recupera `competencyOutcome` como `demonstrated`, `not_demonstrated` o `not_evaluated`.
- La ficha docente muestra la valoración y las notas asociadas a la defensa.
- La interfaz explica que la valoración es formativa y no establece nota oficial.
- No se calculan puntos ni se transforma el score de Review.
- Defensas históricas sin el nuevo campo siguen siendo legibles y muestran “Sin valoración registrada”.
