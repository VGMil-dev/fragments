# F17.16 — Especificación

1. La reanudación de una propuesta incompleta con errores en objetivos/alcance/tecnologías comienza en «Objetivos y alcance» si los campos de Idea son válidos.
2. Si falta un campo de Idea, la reanudación comienza en «Idea».
3. Una propuesta válida se reanuda en Evaluación; una evaluación recuperada también abre Evaluación.
4. Si `onRecoverEvaluation` devuelve error o rechaza, no se muestra puntuación y se conserva la etapa derivada de los campos guardados.
5. El flujo normal (`restoreEvaluation=false`) conserva su etapa inicial actual y no realiza recuperación adicional.
6. No se invoca `onEvaluate`; no se cambia API, contrato, persistencia o proveedor.

## Verificación

- Prueba focal de `MentorScreen` que comprueba error de recuperación para propuesta incompleta y etapa Objetivos y alcance.
- Suite web, typecheck, build y `git diff --check`.
- Producción/ego-browser: pendiente de integración por PR, F14 y validación autorizada; no realizar llamadas IA.
