# Especificación F18.B.7

## Alcance

- Conectar la acción «Continuar» de Mis proyectos con el selector de continuación académica ya usado en otras rutas.
- Consultar entregas Mentor propias y, para una propuesta vinculada a misión, el historial persistido de entregas/Review.
- Enrutamiento basado en datos: Mentor si aún no tiene evaluación Mentor; Review si corresponde la siguiente entrega; Trainer si todas están completas y existe una Review finalizada válida.
- Si una consulta requerida falla o responde de forma no válida, no asumir una etapa; mostrar estado de carga/error y permitir reintentar.
- Evitar solicitudes repetidas mientras la consulta está en curso.
- Sin contratos, rutas API, migraciones, proveedores IA o escrituras productivas nuevas.

## Aceptación

- Caso de regresión con Review finalizada: Mis proyectos abre Trainer con el ID de Review real persistido.
- Si falla la consulta de entregas o historial, Mis proyectos permanece visible y ofrece Reintentar.
- Pruebas web, typecheck, build y `git diff --check`.
- Integrar por PR normal. Producción/Ego Lite solo después de publicación autorizada mediante F14; no declarar producción verificada antes de ello.
