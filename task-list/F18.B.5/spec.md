# Especificación F18.B.5

## Requisitos

- Si la propuesta no tiene evaluación Mentor persistida, continuar en Mentor.
- Si queda una entrega pendiente, en cola, en análisis o fallida, continuar en Review.
- Si todas las entregas están completadas, Trainer debe recibir el `reviewId` de la Review completada más reciente de la última entrega publicada.
- Si el historial declara todas las entregas completas pero no incluye una Review completada con ID para la entrega final, no elegir un Review arbitrario: continuar en Review.
- El destino Trainer lleva `reviewId` en la URL; Mentor/Review conservan `proposalId`.
- No cambiar contratos API, estado de dominio, rúbricas, prompts, proveedores IA ni persistencia. No iniciar sorteos ni intentos automáticamente.

## Verificación

- Pruebas de lógica de continuidad con estados reales y varios intentos en la última entrega.
- Prueba del flujo App que confirma el `reviewId` en la URL y regresión existente de Trainer que confirma que se preselecciona la Review solicitada.
- Suite web, typecheck, build y `git diff --check`.
- Sin escrituras o llamadas a producción; datos fake locales etiquetados.
