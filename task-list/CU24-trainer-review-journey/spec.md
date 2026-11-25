# Especificación — CU-24 Review → Trainer

## Dado
Una misión propia con propuesta y una Review completada en una entrega, procesada por un evaluador fake en `fragments_test`.

## Cuando
La identidad estudiante consulta Reviews completadas, sortea un reto con evidencia verificada de ese Review, registra un intento y repite la petición con la misma clave idempotente.

## Entonces
- Trainer ofrece el Review propio, con commit y contexto académico asociado.
- El reto sorteado referencia exactamente el Review, commit y ruta citada por la evidencia verificada.
- El intento queda asociado a la sesión del estudiante y al reto; una repetición devuelve el mismo registro y el historial lo recupera.
- Ningún score, hallazgo privado ni identificador de estudiante se filtra en la respuesta de práctica.
- La generación usa un fake rotulado; no llama a proveedores ni ejecuta código del repositorio.

La validación local requiere `current_database() = fragments_test`; CI usa PostgreSQL desechable. La validación autenticada en Ego Lite y cualquier Review real se reportan aparte.
