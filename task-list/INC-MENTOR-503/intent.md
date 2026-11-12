# INC-MENTOR-503 — Mentor 503

## Problema
Las solicitudes POST de evaluación Mentor en producción devolvían 503 y la interfaz las seguía con una recuperación 404, ocultando la causa interna. Se requiere distinguir de forma segura una falla del Gateway de una reserva local de presupuesto insuficiente.

## Objetivo
Demostrar la etapa causante con evidencia existente, instrumentar fallos sin registrar contenido sensible y evitar solicitudes de recuperación engañosas cuando el servidor informa falta de presupuesto.

## No objetivos
No cambiar presupuesto, tarifas, modelo, proveedor, rúbrica, criterios ni cálculo académico. No reintentar solicitudes automáticamente sin evidencia de rate limiting seguro. No restaurar datos ni modificar reservas existentes.

## Owner
Planner — incidente autorizado por el usuario.

## Criterio
Usar fixtures para reproducir; verificar clasificación de status/proveedor sin secretos; demostrar que reservas fallidas no despachan ni generan duplicados; conservar persistencia y contrato de resultados exitosos.
