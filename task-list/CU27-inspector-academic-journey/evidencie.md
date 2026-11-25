# Evidencia CU-27 — pendiente de CI

- Cambio: `academic-flow.integration.test.ts` integra Review final persistida → adaptador exact-SHA de Inspector → reto docente → asignación → defensa → lectura persistida.
- Proveedor de Review y proveedor Inspector: fake de prueba; no hubo llamadas pagadas ni red externa.
- La prueba está restringida a PostgreSQL local `fragments_test`; su resultado local se registrará y la ejecución PostgreSQL requerida se comprobará en CI.
- Ego Lite: NO COMPROBADO en esta tarea. La sesión disponible Space 44 no pudo reclamarse en la última comprobación; no se creó otra sesión.
- Producción y despliegue: NO APLICA; no hay cambio de runtime.
