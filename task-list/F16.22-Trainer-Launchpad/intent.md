# F16.22 — Trainer como launchpad académico

## Problema

Cuando aún no existe una Review, Trainer muestra un mensaje de siguiente reto y otra tarjeta de siguiente etapa. Esa jerarquía distrae del paso académico real que habilita el entrenamiento.

## Objetivo

Presentar una sola acción prioritaria: iniciar el recorrido por Review, con el criterio vigente de F10 «Tu entrenamiento empieza con una revisión». Explicar que Trainer estará disponible cuando el análisis de un commit termine.

## Límites

- Mantener el enlace y callback existentes hacia `/student/review`.
- No inventar misiones, retos, puntuación, recompensas ni progreso.
- No mostrar el estado vacío durante carga o error.
- Con Reviews reales, conservar selección, contexto académico, práctica, pistas e historial.
- No cambiar APIs, contratos, rutas, datos o servicios.
