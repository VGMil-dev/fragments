# F22.14 — Filtrar los feeds operativos admin

## Problema

Los feeds administrativos de Mentor y Review presentan una muestra acotada; hace falta filtrar todas las filas visibles por etapa o estado para ubicar eventos relevantes.

## Objetivo

Permitir filtrar localmente la muestra ya recibida de cada feed por etapa y resultado, conservando la lectura de solo lectura existente.

## Límites

- No añadir consultas ni cambiar rutas, contratos, persistencia o retención.
- No exponer eventos, IDs, información sensible ni datos de usuario que ya no formen parte del DTO.
- No escribir ni generar eventos en producción.
- La vista solo filtra las filas ya recibidas; no representa paginación histórica.
