# Especificación F10.6

- Sortear: ante rechazo de red, detener el estado ocupado, conservar la selección y cualquier reto previo, mostrar un mensaje de error recuperable y dejar disponible la acción manual de sorteo.
- Registrar: enviar una clave UUID idempotente por intento. Ante rechazo ambiguo, conservar clave, payload, reto e historial; el reintento manual debe reenviar exactamente la misma operación y recibir el registro original si ya se persistió.
- El servidor deduplica por sesión + clave y rechaza el uso de una clave con payload distinto. La clave nunca se incluye en la respuesta de historial ni en logs.
- Las respuestas HTTP de error mantienen el comportamiento actual.
- Pruebas fake etiquetadas cubren ambos rechazos y afirman estado visible y recuperación.
- Mantener etiquetas accesibles de estado/alerta y controles existentes.
