# INC-AI-GATEWAY-429 — Evaluaciones IA bloqueadas

## Problema

Las evaluaciones de Mentor fallaron con `GatewayRateLimitError`, pero el API las presentó como presupuesto local agotado. Una reserva incierta del ledger dejó bloqueadas las evaluaciones siguientes.

## Objetivo

Determinar la causa con evidencia técnica, evitar conciliaciones financieras sin correlación suficiente, y corregir clasificación de errores, idempotencia, concurrencia y reintentos controlados.

## No objetivos

- No ejecutar solicitudes nuevas al proveedor de IA.
- No liberar ni liquidar una reserva productiva ambigua.
- No cambiar secretos, límites o configuración de producción.
- No desplegar ni publicar la rama.

## Owner y criterios

Owner: PLANNER. Aplicar TDD, pruebas con fake providers etiquetados, verificación de seguridad de logs y compatibilidad con el ledger existente. F16 en este repositorio es una tarea visual; no establece una política de reintentos IA. La política de este incidente queda especificada en `spec.md`.
