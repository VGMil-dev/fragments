# INC-AI-LEDGER-V2 — Intención

## Problema
El ledger marca cualquier reserva vieja como incierta y bloquea solicitudes independientes. Además, la reserva sin tarifa verificada usa un mínimo ficticio que puede habilitar un despacho con un presupuesto inválido.

## Objetivo
Recuperar operaciones independientes de Mentor, Review e Inspector con reservas SQLite trazables e idempotencia persistente por operación lógica. La incertidumbre de costo debe impedir solo la repetición de esa operación.

## Alcance
- Identidad estable para Review `(projectId, commitSha, rubricVersion, evaluatorVersion)`, evaluación Mentor y generación Inspector.
- Migración SQLite mínima de v11 a v12, conservando todas las reservas históricas sin reasignarles identidad.
- Rechazo antes del despacho si faltan modelo, proveedor o tarifas; estimar el prompt completo y limitar salida y reintentos.
- Clasificar errores Gateway de forma conservadora, liberar solo rechazos confirmados pre-despacho y preservar `Retry-After`/correlación seguras.
- Registrar evidencia, pruebas y dictamen; preparar un PR enfocado.

## Fuera de alcance
Producción, llamadas pagadas, modificación de presupuesto de Vercel, reconciliación o liberación de reservas históricas, reprocesamiento de las seis revisiones estudiantiles, nuevas colas o cambios en contratos compartidos.

## Owner y criterio de trabajo
PLANNER. Aplicar TDD y verificación final. La skill oficial de TDD/verificación de la matriz no está instalada en este entorno; se seguirá el ciclo equivalente manualmente y se registrará esa limitación. Revisión Goldfish independiente acotada a riesgo financiero, idempotencia y concurrencia.
