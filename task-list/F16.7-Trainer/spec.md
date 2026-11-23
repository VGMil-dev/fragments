# F16.7 Trainer — especificación

## Alcance
- Nombrar la experiencia como «Laboratorio de desafíos» y explicar su relación con Review.
- En ausencia de revisiones, mostrar un estado vacío útil con el CTA real `/student/review`.
- Usar `Typing_Girl_and_Sleeping_Cat.webp` únicamente como ilustración decorativa estática, sin trasladar ni generar assets.
- Mantener las funciones existentes de selección de repositorio/commit, contexto de misión y habilidades, sorteo basado en evidencia, objetivos, pistas, registro e historial.

## Límites
- No añadir retos, puntos, recompensas, niveles, rachas, métricas ni autoevaluación ficticios.
- No cambiar API, contratos, persistencia, clave idempotente ni lógica de reintento.
- No hacer capturas autenticadas ni despliegues.

## Aceptación
- El estado vacío ofrece Review solo tras una respuesta exitosa vacía.
- La imagen tiene `alt=""` y queda marcada como decorativa.
- Los tests de Trainer verifican encabezado, vacío, CTA y ausencia de progreso inventado.
- Typecheck web pasa.
