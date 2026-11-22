# F22.3 — Resumen administrativo de cola

## Problema

F22 pide observar trabajos pendientes y leases sin inspeccionar servidor o base manualmente. F22.2 agregó matrículas académicas, pero no presenta el estado agregado de la cola `jobs` que ya procesa el worker Review.

## Objetivo

Exponer una lectura admin de solo conteos para trabajos `pending`, `leased` vigentes, leases vencidos o sin fecha, `failed`, `done` y otros estados. Mostrar la hora UTC de muestreo.

## Límites

No listar IDs, tipo, payload, dueño de lease, errores, secretos ni datos de estudiantes. No reintentar/modificar trabajos, no cambiar esquema, no agregar rutas compartidas, ni consultar producción. El arquitecto integra el handler y la pantalla desde las rutas comunes.
