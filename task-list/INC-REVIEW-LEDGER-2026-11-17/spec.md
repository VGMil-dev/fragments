# INC-REVIEW-LEDGER-2026-11-17 — Especificación y presupuesto

## Costos de referencia: Qwen 3.7 Flash

**Modelo Vercel AI Gateway:** `alibaba/qwen3.7-flash`; confirmar modelo y `AI_GATEWAY_PROVIDER_ONLY` **efectivos de producción**, porque el repositorio solo documenta configuración y no prueba el valor desplegado.

Fuentes consultadas 2026-11-17:
- Vercel AI Gateway: https://vercel.com/ai-gateway/models/qwen3.7-flash (tarifa inicial de texto: USD 0.03/M entrada y 0.13/M salida).
- QwenCloud (tarifas de referencia por longitud de entrada; comprobar que aplican al proveedor/ámbito real): https://docs.qwencloud.com/developer-guides/getting-started/model-prices

| Tokens de entrada por solicitud | Entrada USD/M | Salida USD/M |
| --- | ---: | ---: |
| 1–32,000 | 0.03 | 0.13 |
| 32,001–256,000 | 0.10 | 0.40 |
| 256,001–1,000,000 | 0.20 | 0.80 |

**Fórmula:** `USD estimados = (tokens_entrada * tarifa_entrada + tokens_salida * tarifa_salida) / 1_000_000`. La tarifa del tramo se aplica a todos los tokens cuando se supera su umbral. No confundir tokens del snapshot empaquetado con **todos** los tokens realmente facturados (instrucciones, encabezado, esquema estructurado y otros overheads). Tarifa, promociones y cobro final deben contrastarse con el Gateway y su recibo.

El código actual de Review configura un presupuesto de **20,000 tokens de entrada** y **2,000 de salida**. A tarifas de primer tramo, `0.03*20,000/1e6 + 0.13*2,000/1e6 = USD 0.00086`; margen de reserva del ledger ×2 = `USD 0.00172`. Si el prompt real supera 32K tokens, la tarifa sube. Por prudencia, a tarifas del segundo tramo con esas mismas cantidades: `USD 0.0028`, margen ×2 `USD 0.0056`. Estos son escenarios, no cargos ni garantía de techo.

**Techo operativo propuesto: USD 0.05 para una sola prueba real**, sin reintentos facturables automáticos. Debe convertirse en un límite verificable antes de llamar a la IA; no basta con escribirlo en documentación. No modificar los límites globales de la cuenta o del ledger al fijar este techo.

## Gates de implementación
1. Inspeccionar el ledger SQLite respaldado e identificar el costo desconocido sin inventar un vínculo con Vercel. Mantener la fila `uncertain` hasta una resolución administrativa trazable.
2. Diseñar e implementar, en un PR separado, resolución manual con operador, fecha, motivo, evidencia, estado previo/final y posible contabilización conservadora del máximo; pruebas de atomicidad e idempotencia. Nunca liberar ni liquidar sin autorización específica y base verificable.
3. **Corregir o bloquear** la estimación sin tarifas: `estimateAiCallCostMicroUsd` hoy devuelve un mínimo de 1 microUSD si faltan tasas válidas. Eso no debe habilitar una llamada pagada ni considerarse presupuesto fiable.
4. Comprobar que las tarifas de configuración cubren el tramo de la longitud de entrada **real**, y la salida máxima. Rechazar el despacho si modelo/proveedor/precios son desconocidos o la estimación/margen excede USD 0.05.
5. Tras el merge y despliegue autorizado del mecanismo de conciliación, aprobar explícitamente la transición administrativa de la reserva incierta, corroborar saldo disponible y ejecutar **una sola** revisión sintética, no datos estudiantiles.
6. Conciliar recibo con costo de Vercel, guardar evidencia sin datos privados, validar respuesta real y persistencia, sin afirmar éxito si la IA sigue bloqueada.
7. Los seis casos históricos se reconciliarán individualmente, con consentimiento y verificación de commit/repositorio, nunca en lote.

## Criterios de aceptación
- Pruebas automatizadas para umbrales de precio, sobrecosto, falta de tarifas, reserva incierta, simultaneidad e idempotencia.
- Control de gasto de USD 0.05 **exigible por código/operación**, no solo declarativo.
- Sin llamadas pagadas, cambios en SQLite productiva, push a `main`, merge, tag, release o despliegue mientras el mecanismo siga en diseño.
- Dictamen GO/NO-GO y evidencia del primer recibo real cuando las fases sean autorizadas.
