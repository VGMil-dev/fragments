# INC-REVIEW-LEDGER-2026-11-17 — Evidencia y pendientes

## Estado: PLAN DOCUMENTADO / NO-GO productivo

- PR #42 integrado en `main` y publicado en v0.4.8 (SHA `e25bacf1d4a3c32ca31fd510bbcb5d0a8b90cdb6`).
- PR #44 integrado en `main` y publicado en v0.4.9 (SHA `35546eb5745b6d6edfe7efcb4d0a97b1dbe4d6cf`).
- Informe del agente: las seis revisiones del 2026-11-16 siguen `failed`, con un intento cada una, bajo clasificación `LEGACY_UNCLASSIFIED/manual`; no se reprocesaron.
- Tests offline reportados: API 133/133 y web 95/95; flujo GitHub+Repomix+worker+SQLite con proveedor ficticio completó y conservó idempotencia.
- Un registro de Vercel coincide aproximadamente por hora/modelo/error con una reserva `uncertain`, pero **no hay ID verificable que los vincule**. Ausencia de eventos en los logs consultados no prueba ausencia de despacho.
- Review productivo con IA real **NOT_VERIFIED**, ledger **BLOCKED**. Ningún importe ha sido gastado ni reservado mediante este cambio documental.
- Precio básico Qwen 3.7 Flash consultado en Vercel: USD 0.03/M entrada y USD 0.13/M salida; precios por tramos de entrada documentados en `spec.md`.
- Propuesta del propietario: techo máximo de **USD 0.05 para una sola prueba real**, pendiente de protección operativa y conciliación previa.
- Riesgo residual: runner de otro proyecto con acceso al daemon Docker, aceptado temporalmente en v0.4.9; no declararlo resuelto.

## Acciones siguientes

1. Implementar reconciliación manual auditable en un PR y agregar pruebas.
2. Verificar modelo, proveedor y precio **efectivos** antes de cualquier despacho.
3. No liberar la reserva incierta ni ejecutar la prueba real hasta que existan controles y autorizaciones.
4. Registrar posteriormente el estado final, revisión independiente, release (si se necesita), SHA productivo y recibo verificable.

**Esta evidencia documenta lo verificado en GitHub y lo reportado por el agente. No es evidencia de ejecución productiva nueva.**
