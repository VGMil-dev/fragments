# Especificación F18.B.4

## Requisitos

- Cada Review de una propuesta vinculada identifica el `assignmentDeliverableId` de su snapshot inmutable y almacena el commit/SHA y estado en el ledger de jobs existente.
- La API valida propiedad de la propuesta, matrícula activa, versión publicada y que la entrega exista en esa versión.
- Solo permite iniciar la primera entrega sin Review completada; la entrega siguiente se habilita después de una Review completada. Un mismo proyecto y repositorio se reutilizan en todas las entregas.
- `GET /api/me/proposals/:id/deliveries` devuelve configuración de entregas y todos los intentos propios con estado, SHA y marcas de tiempo; nunca expone puntuaciones ni hallazgos privados del análisis.
- Repetir la misma entrega/commit conserva idempotencia; commits distintos se preservan como intentos separados. Revisar no equivale a aprobación académica.
- Las propuestas y trabajos antiguos sin entrega conservan el comportamiento actual.

## Verificación

- Pruebas de contratos y validación de resolver/autoría.
- Integración HTTP + PostgreSQL desechable `fragments_test` con proveedor/evaluador fake, incluyendo orden, historial, aislamiento y deduplicación.
- Pruebas UI/API web para elegir siguiente entrega, enviar SHA y mostrar historial al recargar.
- Sin proveedores IA reales ni escrituras productivas.

## Dependencias y límites

- F18.B.3 (snapshot de misión), F17 (continuidad), F05/F25 (Review y evaluación).
- Si el estado de un job legado o la versión del snapshot no permite comprobar etapa, devolver conflicto/error seguro y marcarlo NO COMPROBADO; no inferir avance.
