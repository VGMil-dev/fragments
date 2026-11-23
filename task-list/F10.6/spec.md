# Especificación F10.6

- Sortear: ante rechazo de red, detener el estado ocupado, conservar la selección y cualquier reto previo, mostrar un mensaje de error recuperable y dejar disponible la acción manual de sorteo.
- Registrar: ante rechazo de red, conservar el reto y el historial, mostrar error recuperable y no mostrar éxito ni mutar el historial de cliente.
- Las respuestas HTTP de error mantienen el comportamiento actual.
- Pruebas fake etiquetadas cubren ambos rechazos y afirman estado visible y recuperación.
- Mantener etiquetas accesibles de estado/alerta y controles existentes.
