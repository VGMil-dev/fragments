# F22.18 Especificación

## Alcance
- Ruta admin autenticada, GET, cache-control no-store y auditoría de lectura.
- Exponer estado configurado/no configurado de la clave; modelo y proveedor allowlisted efectivos (o “sin especificar”); tarifa solo si ambos valores son conocidos; ledger agregado persistido (liquidado, reservado, incierto).
- Saldo disponible en el proveedor y tope global deben representarse como `unknown` mientras la fuente autorizada no los provea. No calcular dinero “disponible”.
- UI con carga, vacío/error, 401/403 y reintento; valores monetarios con unidades explícitas.
- Sin secretos, reservas, escrituras, IA real, esquema nuevo, migraciones o cambios de contratos compartidos.

## Aceptación
1. Solo admin puede consultar; anónimo 401, docente 403; respuesta no cacheable.
2. Auditoría registra actor y evento sin valores sensibles.
3. Respuesta contiene configuración saneada y agregado leído del ledger; errores de DB no se traducen a cero.
4. `providerBalance` y `globalBudgetLimit` quedan explícitamente desconocidos.
5. Pruebas automatizadas usan fixtures fake, incluyendo ausencia de datos y fallo del ledger; ninguna llamada externa.
6. Evidencia, commit y checks frescos registrados aquí y en TASKS.md.
