# INC-REVIEW-LEDGER-2026-11-17 — Intención

## Objetivo
Restablecer una sola evaluación real, sintética y controlada de Review con el modelo configurado en producción, preservando reservas `uncertain`, conciliación contable y casos estudiantiles históricos.

## Estado
**BLOCKED / pendiente de implementación y conciliación.** La producción reportada es v0.4.9 (`35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`). Los hotfixes de Review (PR #42) y OAuth (PR #44) ya se integraron y publicaron. No existe evidencia de una prueba Review real satisfactoria después del incidente.

## Alcance
- Diseñar una conciliación administrativa, auditable y conservadora de costos inciertos, con aprobación humana y conservación del historial.
- Confirmar el `AI_GATEWAY_MODEL` y el proveedor configurados **sin imprimir secretos**; no inferirlos del archivo de ejemplo.
- Estimar la prueba conforme al catálogo actual del proveedor, incluyendo umbrales por tokens de entrada.
- Definir un techo **USD 0.05 por una sola prueba sintética**, como presupuesto provisional autorizado para planificar, **no** como gasto realizado, recarga de Vercel ni reserva SQL creada.
- Proteger las seis filas `LEGACY_UNCLASSIFIED/manual` y evitar reprocesamiento automático.

## Fuera de alcance
Cambios de F16.5, OAuth, despliegues y release automáticos; cambiar presupuesto global del Gateway, limpiar reservas inciertas sin evidencia o emitir llamadas facturables durante la preparación.
