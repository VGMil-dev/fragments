# INC-MENTOR-503 — Mentor 503 / recuperación del presupuesto

## Problema
Las solicitudes POST de evaluación Mentor en producción devolvían 503 y la interfaz las seguía con una recuperación 404, ocultando la causa interna. Se requiere distinguir de forma segura una falla del Gateway de una reserva local de presupuesto insuficiente.

## Objetivo
Migrar el control monetario a AI Gateway solo después de comprobar un presupuesto activo aplicable a la credencial real; conservar el ledger local como registro de consumo y restaurar margen con reconciliación contable segura.

## No objetivos
No habilitar gasto si el presupuesto externo no está verificado. No liberar el holdback activo ni cambiar límites, tarifas, modelo, proveedor, rúbrica, criterios o cálculo académico sin las precondiciones/autorización correspondientes. No reintentar automáticamente errores de presupuesto. No restaurar datos ni modificar reservas productivas antes de backup consistente.

## Owner
Planner — incidente autorizado por el usuario.

## Criterio
Usar fixtures para reproducir; verificar clasificación de status/proveedor sin secretos; demostrar que reservas fallidas no despachan ni generan duplicados; conservar persistencia y contrato de resultados exitosos.
