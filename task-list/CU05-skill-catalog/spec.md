# Especificación — CU-05 catálogo de habilidades

## Criterios verificables

- La UI Classroom Studio permite crear una habilidad, filtrar el catálogo por nombre/descripción y editarla.
- La API persiste la edición y, después de reiniciar el servidor de prueba, devuelve el mismo ID con nombre y descripción actualizados.
- Una segunda identidad docente no ve las habilidades de la primera; la ruta sigue requiriendo rol docente.
- Antes de escribir fixtures, la integración valida host local, nombre de base `fragments_test` y `current_database()`.
- Pruebas sin servicios pagados ni datos productivos. El cambio es solo de cobertura y no requiere release F14.
