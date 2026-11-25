# Especificación F18.B.6

## Requisitos

- Para la entrega final ya completada, seleccionar entre los intentos `completed` el de mayor `updatedAt` (hora de finalización persistida), no el último por orden de creación.
- Desempatar por `createdAt` descendente para mantener un resultado determinista.
- Ignorar intentos `failed`, `queued` y `running` aunque sean posteriores.
- Mantener la navegación de F18.B.5: si no hay Review completada en la entrega final, continuar a Review.
- Sin cambios de contrato, API, persistencia, rúbrica, prompt o proveedor.

## Aceptación y verificación

- Regresión con jobs creados y terminados fuera de orden: el Review seleccionado es el último completado, no el último creado.
- Regresión con retry posterior fallido: el Review completado más reciente permanece seleccionado.
- Suite web, typecheck, build y `git diff --check`.
- Integrar por PR y desplegar únicamente mediante F14. No modificar directamente producción.
