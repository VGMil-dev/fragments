# INC-MENTOR-503 — Mentor 503 / recuperación del presupuesto

## Problema
Las solicitudes POST de evaluación Mentor en producción devolvían 503 y la interfaz las seguía con una recuperación 404, ocultando la causa interna. Se requiere distinguir de forma segura una falla del Gateway de una reserva local de presupuesto insuficiente.

## Objetivo
Demostrar la etapa causante con evidencia existente, distinguir un holdback de protección de una reserva huérfana y restaurar margen solo con reconciliación contable segura y autorización explícita.

## No objetivos
No liberar el holdback activo ni cambiar presupuesto, tarifas, modelo, proveedor, rúbrica, criterios o cálculo académico sin autorización explícita. No reintentar solicitudes automáticamente sin evidencia de rate limiting seguro. No restaurar datos ni modificar reservas productivas.

## Owner
Planner — incidente autorizado por el usuario.

## Criterio
Usar fixtures para reproducir; verificar clasificación de status/proveedor sin secretos; demostrar que reservas fallidas no despachan ni generan duplicados; conservar persistencia y contrato de resultados exitosos.
