# Evidencia CU-28 — pendiente de CI

- Implementación local: contrato Zod compatible con registros anteriores, selector docente obligatorio para nuevas valoraciones y resumen persistido de valoración/notas.
- Pruebas rojas iniciales: el contrato descartó la nueva valoración; la UI no mostraba la valoración ni enviaba el campo. Salidas registradas en esta sesión.
- Pruebas verdes locales: contracts + Inspector teacher panel + servicios Inspector + HTTP: 44 passed, 8 skipped; los omitidos requieren DATABASE_URL. Typecheck API/web y diff-check PASS.
- Sin migración, llamada de IA, operación productiva o release. Pendiente CI PostgreSQL y merge.
- F26 sigue en Idea: sin fórmula, puntos o nota oficial implementados.
- Ego Lite y validación pedagógica con docente: NO COMPROBADOS.
