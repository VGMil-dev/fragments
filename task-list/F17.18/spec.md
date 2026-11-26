# F17.18 — Especificación Mi espacio V4

## Entradas

- Identidad estudiante (`StudentMe`) recibida de GitHub/OAuth.
- Propuestas guardadas, misiones publicadas en aulas activas, envíos y estados de carga/error existentes.
- Historial de entregas por propuesta vinculada vía `studentApi.getMissionDeliveryHistory`.

## Salidas y navegación

- Vista React en `/student/dashboard`; se conserva el workspace y su barra lateral global.
- Identidad GitHub y avatar reales con fallback textual.
- Acción prioritaria desde el borrador más reciente; si no hay borrador, la acción se determina por misiones disponibles o se crea propuesta en Mentor.
- Cada misión publicada continúa vía `onContinueProposal` si tiene propuesta asociada o inicia vía `onStartMission`.
- Fases: Mentor si no existe entrega Mentor; Review si queda una entrega académica; Trainer cuando el historial autoritativo tiene todas las entregas completas y la lógica vigente selecciona Review final para práctica.

## Datos y privacidad

- No se agregan contratos, tablas, endpoints ni credenciales.
- Los filtros se derivan de misiones/propuestas autorizadas cargadas por las APIs existentes.
- El contrato actual no expone un evento independiente de misión completada. No se contará Trainer disponible como completada; el contador Completadas queda en cero hasta contar con señal autoritativa.
- Los estados de error conservan reintentos existentes; no se muestran datos del prototipo.

## UI y aceptación

- Usar la composición V4 y los dos WebP originales; adaptar estilos con alcance `.mi-space`.
- Filtros Todas / En curso / Por iniciar / Completadas con contadores derivados.
- Máximo tres misiones al inicio; Ver más / Ver menos solo con contenido adicional.
- La misión vinculada al proyecto prioritario no se duplica en la lista.
- Responsive, foco visible, reduced-motion y navegación por teclado compatibles con el layout global.
- GIVEN una sesión real o fixture etiquetada, WHEN cambia filtro/expansión, THEN la lista y contadores reflejan los datos disponibles sin estados inventados.
- GIVEN una misión prioritaria con estado de entrega, WHEN se continúa, THEN la lógica ya vigente decide Mentor/Review/Trainer.
