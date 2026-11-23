# Especificación — F17 Pixel Night Dashboard

## Entradas
`StudentDashboardProps` existente: identidad GitHub, aulas y solicitudes, borradores Mentor, entregas, estados de carga/error y acciones ya disponibles.

## Salida
Una pantalla en español con:
- Encabezado del centro de misiones y la identidad GitHub real.
- Superficie principal “Siguiente paso” que muestra la propuesta guardada real o invita a crear la primera; solo una acción principal.
- Resumen real de aulas y última entrega, además de navegación secundaria a Galería.
- Carga, error, vacío y contenido con los estados y callbacks existentes.

## Restricciones
No añadir DTO, API, dependencias o estado persistido. No derivar progreso inventado. Mantener avatar existente solo si la identidad ya lo proporciona. El CSS es local y scoped al Dashboard para evitar conflicto con hojas compartidas.

## Criterios de aceptación
- DADO un estudiante autenticado CUANDO abre el Dashboard ENTONCES su identidad GitHub permanece visible.
- DADO un borrador existente CUANDO se muestra el Dashboard ENTONCES el título/versión real y la acción de continuar Mentor aparecen como único CTA primario.
- DADO que no existe borrador CUANDO se muestra el Dashboard ENTONCES aparece la acción real para crear la primera propuesta, sin KPI ficticio.
- DADO cualquier estado de carga/error/vacío CUANDO se renderiza ENTONCES el texto refleja ese estado y las rutas de recuperación siguen disponibles.
- DADO un viewport móvil CUANDO refluye el layout ENTONCES no se requiere scroll horizontal del contenido y el CTA cabe a ancho disponible.
- DADO movimiento reducido o navegación por teclado CUANDO se usa la vista ENTONCES los estilos respetan el medio y el foco permanece visible.

## Incremento — mostrar aulas autorizadas

- Cuando hay aulas activas, mostrar el nombre, materia y grupo recibidos por `StudentDashboardProps` dentro de «En tus aulas».
- Conservar resumen, estados, navegación y callbacks existentes; no crear KPIs ni consultas adicionales.
- Si no hay aulas, mantener el estado vacío existente.
- Prueba focal confirma que el render incluye título, materia y grupo.
