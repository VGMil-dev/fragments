# CU-23 — Historial trazable de entregas

## Problema

La pantalla «Mis entregas» muestra resultados Mentor y Review, pero oculta el SHA exacto de Review y la versión de rúbrica. Registros sucesivos del mismo repositorio quedan difíciles de distinguir y verificar.

## Objetivo

Exponer en cada resultado Review propio el SHA y la rúbrica versionada que constan en su snapshot, conservar la fecha y el orden temporal, y mantener aisladas las entregas de otras identidades.

## Alcance

- DTO compartido `StudentSubmission` con SHA opcional y validado para resultados Review.
- Proyección PostgreSQL desde el snapshot persistido, filtrada por jobs del estudiante titular.
- Aplicar el límite del historial después del filtro por propietario, para que actividad de otras cuentas no desplace resultados propios.
- Vista «Mis entregas» con tipo, fecha, rúbrica y SHA completo.
- Regresión de UI y prueba de integración PostgreSQL únicamente en `fragments_test`.

No realizar llamadas de IA, pruebas de escritura en producción, cambios de datos/migraciones, cambios de rúbricas ni ejecución de código de repositorios.
