# CU-13 — Configurar entregas de misión

## Intención

Completar evidencia automatizada de una misión con entregas ordenadas tipo propuesta, avance y final. Deben persistir título, tipo, requisitos, criterio asociado y fecha opcional en el snapshot de publicación, sin crear un repositorio por etapa.

## Alcance

Extender la prueba existente de recorrido académico PostgreSQL desechable para tres entregas del mismo proyecto y conservar el test unitario de snapshot. No cambiar contratos, esquema, rutas ni servicios productivos salvo que las pruebas revelen un defecto real.

## Fuera de alcance

No usar proveedores IA reales, no escribir en `fragments_prod`, no crear recursos Ego Lite alternativos y no cambiar el comportamiento de producción para compensar la indisponibilidad de sesiones autenticadas.
