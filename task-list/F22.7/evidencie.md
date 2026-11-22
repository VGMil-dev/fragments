# Evidencia F22.7 — Diagnóstico de acceso al feed

## Contexto observado comunicado por coordinador

- GET anónimo admin: 401.
- Sesiones Ego Lite de estudiante y docente: 403.
- Contenedores API/web saludables.
- Cero eventos allowlisted observados durante 20 minutos.
- Estos datos se usan como contexto provisto; no se repitieron consultas ni se escribieron datos en producción.

## Implementación

- Rama de trabajo existente: `codex/f22-activity-event-filter`; no se hizo reset.
- La pantalla retiene el código de error seguro y diferencia sesión ausente de cuenta sin rol admin. Errores restantes conservan mensaje genérico. No muestra texto del servidor.
- No se modificaron API, contratos, rutas compartidas, migraciones, infraestructura ni datos productivos.

## Verificación local

- TDD rojo inicial: prueba focal falló porque la pantalla devolvía mensaje genérico ante 401.
- Verificación verde y commit: pendiente.

## Limitaciones

- La mejora explica la denegación, pero no concede rol admin ni resuelve la falta de eventos observados.
- La disponibilidad de una sesión admin autorizada y la emisión de eventos reales siguen sin verificarse en este cambio.
