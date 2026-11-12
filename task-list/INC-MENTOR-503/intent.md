# INC-MENTOR-503 — Mentor 503 / recuperación del presupuesto

## Problema
Las solicitudes POST de evaluación Mentor en producción devolvían 503 y la interfaz las seguía con una recuperación 404, ocultando la causa interna. Se requiere distinguir de forma segura una falla del Gateway de una reserva local de presupuesto insuficiente.

## Objetivo
Con Vercel AI Gateway como control monetario externo, conservar el ledger SQLite como registro de consumo, reconciliar de forma auditable el holdback F12 y restaurar Mentor sin alterar resultados ni rúbricas.

## No objetivos
No cambiar límites, tarifas, modelo, proveedor, rúbrica, criterios o cálculo académico. No reintentar automáticamente errores de presupuesto. No restaurar datos ni modificar reservas productivas antes de backup consistente.

## Owner
Planner — incidente autorizado por el usuario.

## Criterio
Usar fixtures para reproducir; verificar clasificación de status/proveedor sin secretos; demostrar que reservas fallidas no despachan ni generan duplicados; conservar persistencia y contrato de resultados exitosos.
